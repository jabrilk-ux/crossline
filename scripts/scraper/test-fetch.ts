/**
 * Test script — validates fetch + extract without Anthropic API key.
 * Usage: ts-node --project tsconfig.scraper.json scripts/scraper/test-fetch.ts
 */
import 'dotenv/config';
import { BaseScraper } from './scrapers/base';
import { extractStatuteText } from './processors/extract';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
  transports: [new winston.transports.Console()],
});

async function main() {
  const url = 'https://law.lis.virginia.gov/vacode/title18.2/chapter7/section18.2-308.02/';
  const scraper = new BaseScraper(logger);
  await scraper.init();

  console.log('\n=== Fetching VA carry statute ===\n');
  const html = await scraper.fetchStatic(url);
  console.log(`HTML length: ${html.length} chars`);

  console.log('\n=== Extracting statute text ===\n');
  const text = extractStatuteText(html, 'carry');
  console.log(`Extracted ${text.length} chars:\n`);
  console.log(text.slice(0, 800) + (text.length > 800 ? '\n...[truncated]' : ''));

  await scraper.close();
  console.log('\n=== Test complete ===');
  console.log('Note: Summarization step requires ANTHROPIC_API_KEY to be set in .env.local');
}

main().catch(err => { console.error(err); process.exit(1); });
