import * as cheerio from 'cheerio';
import type { LawCategory } from '../config/sources';

// Max characters to pass to the AI summarizer
const MAX_TEXT_LENGTH = 3000;
const FALLBACK_LENGTH = 2000;

// Keywords that signal we're in the right statute section
const CATEGORY_KEYWORDS: Record<LawCategory, string[]> = {
  carry: [
    'concealed', 'carry permit', 'license to carry', 'handgun license',
    'carry a handgun', 'permit to carry', 'concealed handgun', 'lawful carry',
    'carrying a concealed',
  ],
  magazine: [
    'magazine', 'capacity', 'rounds', 'ammunition feeding', 'detachable',
    'large capacity', 'ten rounds', 'fifteen rounds',
  ],
  transport: [
    'transport', 'vehicle', 'unloaded', 'enclosed', 'trunk', 'case',
    'traveling with', 'motor vehicle', 'automobile',
  ],
  duty_to_inform: [
    'notify', 'inform', 'disclose', 'officer', 'law enforcement',
    'must inform', 'shall notify', 'required to inform', 'duty to inform',
  ],
  prohibited_locations: [
    'prohibited', 'prohibited location', 'school', 'courthouse', 'government',
    'prohibited place', 'no carry', 'off-limits', 'polling place', 'church',
  ],
  use_of_force: [
    'self-defense', 'defense of others', 'stand your ground', 'castle doctrine',
    'justifiable use', 'defensive force', 'use of deadly force',
  ],
  ammo: [
    'armor-piercing', 'hollow point', 'prohibited ammunition', 'flechette',
    'exploding bullet', 'special ammunition',
  ],
  red_flag: [
    'extreme risk', 'risk protection', 'red flag', 'temporary order',
    'emergency petition', 'firearm removal',
  ],
  storage: [
    'storage', 'safe storage', 'locking device', 'trigger lock',
    'access by minor', 'secured', 'gun safe',
  ],
  reciprocity: [
    'reciprocity', 'recognized', 'out-of-state', 'non-resident', 'honor',
    'recognition of permits', 'valid permit from',
  ],
};

// CSS selectors for main content, in priority order
const CONTENT_SELECTORS = [
  'main',
  'article',
  '#content',
  '.content',
  '.statute-text',
  '.law-content',
  '.section-content',
  '#law-body',
  '.body-content',
  '[role="main"]',
  'body',
];

// Boilerplate patterns to strip
const BOILERPLATE_RE = [
  /skip to main content/gi,
  /print this page/gi,
  /share this page/gi,
  /feedback/gi,
  /copyright \d{4}/gi,
];

function cleanText(text: string): string {
  let t = text
    .replace(/\s{3,}/g, '\n\n')  // collapse excess whitespace
    .replace(/\t/g, ' ')
    .trim();

  for (const re of BOILERPLATE_RE) {
    t = t.replace(re, '');
  }

  return t.replace(/\n{3,}/g, '\n\n').trim();
}

function scoreSection(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce((score, kw) => score + (lower.includes(kw) ? 1 : 0), 0);
}

/**
 * extractStatuteText()
 * Parse HTML and return the most relevant statute text for the given category.
 * Returns up to MAX_TEXT_LENGTH characters.
 */
export function extractStatuteText(html: string, category: LawCategory): string {
  const $ = cheerio.load(html);

  // Remove non-content elements
  $('nav, header, footer, script, style, noscript, aside, .sidebar, .navigation, .menu, .ad, .advertisement, [role="navigation"], [role="banner"]').remove();

  // Find main content container
  let mainContent = '';
  for (const sel of CONTENT_SELECTORS) {
    const el = $(sel).first();
    if (el.length && el.text().trim().length > 200) {
      mainContent = el.text();
      break;
    }
  }

  if (!mainContent) {
    mainContent = $('body').text();
  }

  mainContent = cleanText(mainContent);

  if (!mainContent) {
    return '';
  }

  // Try to find the most relevant section by keyword scoring
  const keywords = CATEGORY_KEYWORDS[category] ?? [];
  if (keywords.length === 0) {
    return mainContent.slice(0, MAX_TEXT_LENGTH);
  }

  // Split into paragraphs / sections and score each
  const paragraphs = mainContent.split(/\n{2,}/);
  const scored = paragraphs.map((p, i) => ({ idx: i, text: p, score: scoreSection(p, keywords) }));
  const best = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);

  if (best.length === 0) {
    // No keyword match — return first FALLBACK_LENGTH chars
    return mainContent.slice(0, FALLBACK_LENGTH);
  }

  // Build result from best-scoring paragraphs in document order
  const bestIndices = new Set(best.slice(0, 5).map(s => s.idx));
  const selected: string[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    if (bestIndices.has(i)) {
      // Include the paragraph and its 1 neighbor for context
      const start = Math.max(0, i - 1);
      const end = Math.min(paragraphs.length - 1, i + 1);
      for (let j = start; j <= end; j++) {
        if (paragraphs[j].trim()) selected.push(paragraphs[j].trim());
      }
    }
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const deduped = selected.filter(s => {
    if (seen.has(s)) return false;
    seen.add(s);
    return true;
  });

  const result = deduped.join('\n\n');
  return result.slice(0, MAX_TEXT_LENGTH);
}
