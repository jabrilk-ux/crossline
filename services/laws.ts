import { evaluateCarryRules, matchingCarryRules, type CarryRule } from './carryRules';
import { useUserStore } from '../store/userStore';
import { supabase } from './supabase';
import type { FirearmsProfile, Permit } from '../store/userStore';
import type { CarryStatus } from './notifications';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LawCategory =
  | 'carry'
  | 'reciprocity'
  | 'duty_to_inform'
  | 'prohibited_locations'
  | 'transport'
  | 'magazine'
  | 'ammo'
  | 'use_of_force'
  | 'red_flag'
  | 'storage';

export interface StateLaw {
  id: string;
  state_code: string;
  category: LawCategory;
  plain_english: string;
  statute_reference: string | null;
  statute_url: string | null;
  effective_date: string | null;
  last_verified: string | null;
  carry_status: CarryStatus | null;
  permit_filter: string[] | null;
  updated_at: string;
}

// Priority order for "top laws" display on home screen
const CATEGORY_PRIORITY: LawCategory[] = [
  'duty_to_inform',
  'prohibited_locations',
  'magazine',
  'carry',
  'reciprocity',
  'transport',
  'ammo',
  'use_of_force',
  'red_flag',
  'storage',
];

// ─── Query helpers ────────────────────────────────────────────────────────────

/**
 * getLawsForState()
 * Fetches all law rows for a state, optionally filtered by category.
 * Returns most-recently-updated rows first.
 */
export async function getLawsForState(
  stateCode: string,
  categories?: LawCategory[]
): Promise<StateLaw[]> {
  let query = supabase
    .from('state_laws')
    .select('*')
    .eq('state_code', stateCode)
    .order('updated_at', { ascending: false });

  if (categories && categories.length > 0) {
    query = query.in('category', categories);
  }

  const { data, error } = await query;
  if (error) {
    if (__DEV__) console.warn('[laws] getLawsForState error:', error.message);
    throw new Error('Could not load reviewed laws. Check your connection and retry.');
  }
  return (data ?? []) as StateLaw[];
}

/**
 * getTopLawsForState()
 * Returns up to `limit` laws for a state ordered by CATEGORY_PRIORITY.
 */
export async function getTopLawsForState(
  stateCode: string,
  limit = 3
): Promise<StateLaw[]> {
  const { data, error } = await supabase
    .from('state_laws')
    .select('*')
    .eq('state_code', stateCode)
    .order('updated_at', { ascending: false });

  if (error) throw new Error('Could not load reviewed laws. Check your connection and retry.');
  if (!data) return [];

  const laws = data as StateLaw[];

  // Sort by CATEGORY_PRIORITY, deduplicate by category (take first/newest)
  const seen = new Set<string>();
  const sorted: StateLaw[] = [];

  for (const cat of CATEGORY_PRIORITY) {
    const match = laws.find(l => l.category === cat && !seen.has(l.category));
    if (match) {
      seen.add(match.category);
      sorted.push(match);
    }
    if (sorted.length >= limit) break;
  }

  // Fill remaining slots with any unseen laws
  if (sorted.length < limit) {
    for (const law of laws) {
      if (!seen.has(law.category)) {
        seen.add(law.category);
        sorted.push(law);
      }
      if (sorted.length >= limit) break;
    }
  }

  return sorted.slice(0, limit);
}

/**
 * getCarryStatusForUser()
 * Determines green/yellow/red carry status for a user in a given state,
 * factoring in their permit stack and the state_laws carry rows.
 *
 * Logic:
 *   - If a carry row exists with carry_status 'prohibited' → prohibited
 *   - If carry rows exist and user has a matching permit → allowed or restricted
 *   - If carry row exists but no matching permit → prohibited
 *   - If no carry data at all → unknown
 */
export async function getCarryStatusForUser(
  stateCode: string, permits: Permit[], firearmsProfile: FirearmsProfile
): Promise<CarryStatus> {
  const { data, error } = await supabase.from('carry_rules').select('*').eq('state_code', stateCode);
  if (error) return 'unknown';
  return evaluateCarryRules((data ?? []) as CarryRule[], stateCode, useUserStore.getState().homeState, permits, firearmsProfile);
}

export async function getCarryStatusesForUser(states: string[], permits: Permit[], profile: FirearmsProfile): Promise<Record<string, CarryStatus>> {
  const { data, error } = await supabase.from('carry_rules').select('*').in('state_code', states);
  const home = useUserStore.getState().homeState;
  return Object.fromEntries(states.map(state => [state, error ? 'unknown' : evaluateCarryRules((data ?? []) as CarryRule[], state, home, permits, profile)]));
}

export async function getCarryGuidanceForUser(state: string, permits: Permit[], profile: FirearmsProfile) {
  const { data, error } = await supabase.from('carry_rules').select('*').eq('state_code', state);
  if (error) throw new Error('Could not load reviewed rules.');
  const home = useUserStore.getState().homeState;
  const rules = (data ?? []) as CarryRule[];
  return { status: evaluateCarryRules(rules, state, home, permits, profile), rules: matchingCarryRules(rules, state, home, permits, profile) };
}
