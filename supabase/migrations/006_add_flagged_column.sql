-- Add flagged column to state_laws for low-confidence AI summaries
ALTER TABLE state_laws
  ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false;

-- Add last_scraped timestamp for tracking scraper runs
ALTER TABLE state_laws
  ADD COLUMN IF NOT EXISTS last_scraped timestamptz;

COMMENT ON COLUMN state_laws.flagged IS 'true when AI summarization confidence < 0.7 — requires human review';
COMMENT ON COLUMN state_laws.last_scraped IS 'Timestamp of most recent scraper run for this row';
