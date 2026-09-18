/**
 * Crossline Law Scraper — Orchestrator
 *
 * Usage:
 *   npm run scrape                               # all states, all categories
 *   npm run scrape -- --state=VA                 # single state, all categories
 *   npm run scrape -- --state=VA --category=carry # single state + category
 *   npm run scrape -- --dry-run                  # scrape + summarize, no DB write
 */

import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import winston from 'winston';
import pLimit from 'p-limit';

import { STATE_SOURCES, type StateSourceConfig, type LawCategory } from './config/sources';
import { BaseScraper } from './scrapers/base';
import { extractStatuteText } from './processors/extract';
import { summarizeStatute } from './processors/summarize';
import { crossCheck } from './validators/verify';
import { upsertLaw } from './db/upsert';

// ─── CLI args ─────────────────────────────────────────────────────────────────

interface ScrapeOptions {
  stateFilter: string | null;
  categoryFilter: LawCategory | null;
  dryRun: boolean;
}

function parseArgs(): ScrapeOptions {
  const args = process.argv.slice(2);
  let stateFilter: string | null = null;
  let categoryFilter: LawCategory | null = null;
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith('--state=')) stateFilter = arg.split('=')[1].toUpperCase();
    if (arg.startsWith('--category=')) categoryFilter = arg.split('=')[1] as LawCategory;
    if (arg === '--dry-run') dryRun = true;
  }

  return { stateFilter, categoryFilter, dryRun };
}

// ─── Logger ───────────────────────────────────────────────────────────────────

function createLogger(runId: string) {
  const logsDir = path.join(__dirname, 'logs');
  fs.mkdirSync(logsDir, { recursive: true });

  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp }) =>
            `${timestamp}  ${level}  ${message}`
          )
        ),
      }),
      new winston.transports.File({
        filename: path.join(logsDir, `run-${runId}.log`),
      }),
    ],
  });
}

// ─── Result tracking ──────────────────────────────────────────────────────────

interface ScrapeResult {
  stateCode: string;
  category: LawCategory;
  success: boolean;
  flagged: boolean;
  confidence: number;
  summary: string;
  error?: string;
}

// ─── Per-item scrape ──────────────────────────────────────────────────────────

async function scrapeOne(
  scraper: BaseScraper,
  stateCode: string,
  stateName: string,
  category: LawCategory,
  url: string,
  dryRun: boolean,
  logger: ReturnType<typeof createLogger>
): Promise<ScrapeResult> {
  logger.info(`[start] ${stateCode}/${category}`);

  try {
    // 1. Fetch HTML
    // Use Playwright for JS-heavy sites, static fetch for others
    const jsHeavy = [
      'leginfo.legislature.ca.gov',
      'flsenate.gov',
      'nysenate.gov',
    ].some(host => url.includes(host));

    const html = jsHeavy
      ? await scraper.fetchPage(url)
      : await scraper.fetchStatic(url);

    if (!html || html.length < 200) {
      throw new Error('Empty or too-short HTML response');
    }

    // 2. Extract relevant statute text
    const rawText = extractStatuteText(html, category);
    logger.info(`[extract] ${stateCode}/${category}: ${rawText.length} chars extracted`);

    if (!rawText.trim()) {
      return {
        stateCode, category, success: false, flagged: true,
        confidence: 0, summary: '',
        error: 'No statute text extracted from page',
      };
    }

    // 3. Summarize via Claude
    const result = await summarizeStatute(rawText, category, stateCode);
    logger.info(
      `[summarize] ${stateCode}/${category}: confidence=${result.confidence.toFixed(2)}, ` +
      `carry_status=${result.carry_status}, flagged=${result.flagged}`
    );

    // 4. Cross-check against LII for confidence boost
    const adjustedConfidence = await crossCheck(
      stateCode, category, result.summary, result.confidence
    );

    if (adjustedConfidence !== result.confidence) {
      logger.info(`[verify] ${stateCode}/${category}: confidence boosted ${result.confidence.toFixed(2)} → ${adjustedConfidence.toFixed(2)}`);
    }

    // Confidence is a triage signal, never legal approval. Every changed
    // summary must go through a new independent review.
    const finalFlagged = true;

    // 5. Upsert to Supabase (or skip if dry-run)
    await upsertLaw({
      state_code:       stateCode,
      category,
      plain_english:    result.summary,
      carry_status:     result.carry_status,
      statute_reference: null,
      statute_url:      url,
      flagged:          finalFlagged,
      last_scraped:     new Date().toISOString(),
    }, dryRun);

    logger.info(`[${dryRun ? 'dry-run' : 'upsert'}] ${stateCode}/${category}: ✓`);

    return {
      stateCode, category, success: true,
      flagged: finalFlagged,
      confidence: adjustedConfidence,
      summary: result.summary,
    };
  } catch (err) {
    const msg = (err as Error).message;
    logger.error(`[error] ${stateCode}/${category}: ${msg}`);
    return { stateCode, category, success: false, flagged: true, confidence: 0, summary: '', error: msg };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run(options: ScrapeOptions): Promise<void> {
  const { stateFilter, categoryFilter, dryRun } = options;
  const runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const logger = createLogger(runId);

  logger.info(`Crossline Scraper — run ${runId}`);
  logger.info(`Options: state=${stateFilter ?? 'all'}, category=${categoryFilter ?? 'all'}, dryRun=${dryRun}`);

  // Filter sources
  let sources = STATE_SOURCES;
  if (stateFilter) {
    sources = sources.filter(s => s.stateCode === stateFilter);
    if (sources.length === 0) {
      logger.error(`No sources found for state: ${stateFilter}`);
      process.exit(1);
    }
  }

  // Build work items
  interface WorkItem {
    config: StateSourceConfig;
    category: LawCategory;
    url: string;
  }

  const workItems: WorkItem[] = [];

  for (const config of sources) {
    for (const [cat, url] of Object.entries(config.sources)) {
      const category = cat as LawCategory;
      if (categoryFilter && category !== categoryFilter) continue;
      if (url) workItems.push({ config, category, url });
    }
  }

  logger.info(`Work items: ${workItems.length} (${sources.length} states)`);

  // Init Playwright
  const scraper = new BaseScraper(logger);
  await scraper.init();

  // Concurrency limit — max 3 simultaneous scrapes
  const limit = pLimit(3);
  const results: ScrapeResult[] = [];

  await Promise.all(
    workItems.map(item =>
      limit(() =>
        scrapeOne(
          scraper,
          item.config.stateCode,
          item.config.stateName,
          item.category,
          item.url,
          dryRun,
          logger
        ).then(r => results.push(r))
      )
    )
  );

  await scraper.close();

  // ── Summary ────────────────────────────────────────────────────────────────

  const succeeded = results.filter(r => r.success);
  const failed    = results.filter(r => !r.success);
  const flagged   = results.filter(r => r.success && r.flagged);

  logger.info('─'.repeat(60));
  logger.info(`Run complete: ${succeeded.length} succeeded, ${failed.length} failed, ${flagged.length} flagged for review`);

  if (failed.length > 0) {
    logger.warn('Failed items:');
    failed.forEach(r => logger.warn(`  ✗ ${r.stateCode}/${r.category}: ${r.error}`));
  }

  if (flagged.length > 0) {
    logger.warn('Drafts requiring independent review:');
    flagged.forEach(r => logger.warn(`  ⚑ ${r.stateCode}/${r.category} (confidence=${r.confidence.toFixed(2)})`));
  }

  if (dryRun && succeeded.length > 0) {
    logger.info('\nDry-run summaries:');
    succeeded.forEach(r => {
      logger.info(`\n[${r.stateCode}/${r.category}] confidence=${r.confidence.toFixed(2)}\n${r.summary}`);
    });
  }

  // Write JSON run report
  const logsDir = path.join(__dirname, 'logs');
  const reportPath = path.join(logsDir, `run-${runId}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    runId,
    timestamp: new Date().toISOString(),
    options,
    stats: { total: results.length, succeeded: succeeded.length, failed: failed.length, flagged: flagged.length },
    results,
  }, null, 2));

  logger.info(`Run report written to ${reportPath}`);

  process.exit(failed.length > 0 ? 1 : 0);
}

run(parseArgs()).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
