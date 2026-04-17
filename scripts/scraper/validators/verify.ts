import type { LawCategory } from '../config/sources';

// LII (Cornell Law) base URL pattern for US Code / state annotations
// LII has comprehensive state law coverage via its state statutes portal
const LII_BASE = 'https://www.law.cornell.edu';

// Keyword sets per category — if LII page contains these, we have a match
const VERIFICATION_KEYWORDS: Partial<Record<LawCategory, string[]>> = {
  carry:               ['concealed', 'carry', 'permit', 'license'],
  magazine:            ['magazine', 'capacity', 'rounds'],
  transport:           ['transport', 'vehicle', 'unloaded'],
  duty_to_inform:      ['notify', 'inform', 'officer'],
  prohibited_locations:['prohibited', 'school', 'courthouse'],
  use_of_force:        ['self-defense', 'deadly force', 'justifiable'],
  red_flag:            ['risk protection', 'extreme risk', 'emergency'],
  storage:             ['storage', 'secure', 'minor', 'access'],
  ammo:                ['ammunition', 'armor-piercing', 'prohibited'],
  reciprocity:         ['reciprocity', 'recognized', 'out-of-state'],
};

// LII state code → state URL segment mapping
const LII_STATE_SEGMENT: Record<string, string> = {
  VA: 'virginia', MD: 'maryland', PA: 'pennsylvania', TX: 'texas',
  FL: 'florida',  CA: 'california', NY: 'new_york', GA: 'georgia',
  AZ: 'arizona',  OH: 'ohio', NV: 'nevada', TN: 'tennessee',
};

const FETCH_TIMEOUT_MS = 15_000;
const CONFIDENCE_BOOST = 0.1;
const MIN_KEYWORD_MATCHES = 2;
const MATCH_THRESHOLD = 0.8;

/**
 * crossCheck()
 * Fetches the relevant LII page for the state + category and checks whether
 * it mentions the same key terms as our scraped summary.
 * Returns an adjusted confidence score.
 *
 * This is a soft check — never blocks an upsert. If LII is unavailable or
 * the page doesn't load, returns the original confidence unchanged.
 */
export async function crossCheck(
  stateCode: string,
  category: LawCategory,
  summary: string,
  originalConfidence: number
): Promise<number> {
  const stateSegment = LII_STATE_SEGMENT[stateCode];
  if (!stateSegment) return originalConfidence;

  const keywords = VERIFICATION_KEYWORDS[category];
  if (!keywords || keywords.length === 0) return originalConfidence;

  const liiUrl = `${LII_BASE}/wex/${stateSegment}_firearms`;

  try {
    const res = await fetch(liiUrl, {
      headers: { 'User-Agent': 'Crossline/1.0 Law Scraper (educational use)' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) return originalConfidence;

    const text = (await res.text()).toLowerCase();
    const summaryLower = summary.toLowerCase();

    // Count how many keywords appear in both the LII page and our summary
    const liiMatches = keywords.filter(kw => text.includes(kw)).length;
    const summaryMatches = keywords.filter(kw => summaryLower.includes(kw)).length;

    const matchRatio = liiMatches / keywords.length;

    if (
      liiMatches >= MIN_KEYWORD_MATCHES &&
      summaryMatches >= MIN_KEYWORD_MATCHES &&
      matchRatio >= MATCH_THRESHOLD
    ) {
      const boosted = Math.min(1.0, originalConfidence + CONFIDENCE_BOOST);
      return boosted;
    }

    return originalConfidence;
  } catch {
    // LII unavailable or timeout — return original confidence unchanged
    return originalConfidence;
  }
}
