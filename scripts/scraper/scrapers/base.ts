import { chromium, type Browser, type Page } from 'playwright';
import type { Logger } from 'winston';

const REAL_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const TIMEOUT_MS = 30_000;
const RETRY_COUNT = 3;
const BACKOFF_MS = 2_000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class BaseScraper {
  protected browser: Browser | null = null;
  protected logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  // ── Init / close ────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    this.logger.debug('Playwright browser launched');
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // ── Playwright fetch ────────────────────────────────────────────────────────

  /**
   * fetchPage()
   * Navigate to URL with Playwright, wait for network idle, return full HTML.
   * Retries up to RETRY_COUNT times with exponential-ish backoff.
   */
  async fetchPage(url: string): Promise<string> {
    if (!this.browser) throw new Error('Browser not initialized — call init() first');

    let lastErr: unknown;

    for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
      const t0 = Date.now();
      let page: Page | null = null;

      try {
        page = await this.browser.newPage();
        await page.setExtraHTTPHeaders({ 'User-Agent': REAL_UA });

        const response = await page.goto(url, {
          waitUntil: 'networkidle',
          timeout: TIMEOUT_MS,
        });

        const status = response?.status() ?? 0;
        const elapsed = Date.now() - t0;
        this.logger.info(`[fetch] ${url} → ${status} (${elapsed}ms, attempt ${attempt})`);

        if (status >= 400) {
          throw new Error(`HTTP ${status}`);
        }

        const html = await page.content();
        await page.close();
        return html;
      } catch (err) {
        lastErr = err;
        this.logger.warn(`[fetch] Attempt ${attempt}/${RETRY_COUNT} failed for ${url}: ${(err as Error).message}`);
        if (page) await page.close().catch(() => {});
        if (attempt < RETRY_COUNT) await sleep(BACKOFF_MS * attempt);
      }
    }

    throw new Error(`fetchPage failed after ${RETRY_COUNT} attempts: ${(lastErr as Error).message}`);
  }

  // ── Static fetch (node fetch) ──────────────────────────────────────────────

  /**
   * fetchStatic()
   * Use built-in fetch for simple static pages — faster than Playwright.
   * Falls back to fetchPage() on failure.
   */
  async fetchStatic(url: string): Promise<string> {
    try {
      const t0 = Date.now();
      const res = await fetch(url, {
        headers: { 'User-Agent': REAL_UA },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const elapsed = Date.now() - t0;

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      this.logger.info(`[fetch:static] ${url} → ${res.status} (${elapsed}ms)`);
      return html;
    } catch (err) {
      this.logger.warn(`[fetch:static] Failed, falling back to Playwright: ${(err as Error).message}`);
      return this.fetchPage(url);
    }
  }
}
