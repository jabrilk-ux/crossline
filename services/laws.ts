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
    return [];
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

  if (error || !data) return [];

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
  stateCode: string,
  permits: Permit[],
  _firearmsProfile: FirearmsProfile
): Promise<CarryStatus> {
  const { data, error } = await supabase
    .from('state_laws')
    .select('carry_status, permit_filter')
    .eq('state_code', stateCode)
    .eq('category', 'carry')
    .not('carry_status', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error || !data || data.length === 0) return 'unknown';

  // Build permit type sets for this state.
  // A permit "applies" if it is issued for this state (resident or non-resident)
  // OR if it is a resident permit from the user's home state (reciprocity case).
  const hasResidentPermit = permits.some(
    p => p.stateCode === stateCode && p.permitType === 'resident'
  );
  const hasNonResidentPermit = permits.some(
    p => p.stateCode === stateCode && p.permitType === 'non-resident'
  );
  // Any resident permit from any state counts for permitless / broad reciprocity checks
  const hasAnyResidentPermit = permits.some(p => p.permitType === 'resident');

  function rowMatchesUser(filters: string[]): boolean {
    if (filters.length === 0) return true;
    if (filters.includes('permitless')) return true;
    if (filters.includes('resident') && (hasResidentPermit || hasAnyResidentPermit)) return true;
    if (filters.includes('non-resident') && hasNonResidentPermit) return true;
    return false;
  }

  // Separate rows by whether they match the user's actual permit stack
  const matchingRows = data.filter(r => rowMatchesUser(r.permit_filter ?? []));
  const nonMatchingRows = data.filter(r => !rowMatchesUser(r.permit_filter ?? []));

  // 1. If user has a matching row that is allowed or restricted, use it.
  //    Resident rows take priority — evaluate them first.
  const residentFirst = [...matchingRows].sort((a, b) => {
    const aRes = (a.permit_filter ?? []).includes('resident') ? 0 : 1;
    const bRes = (b.permit_filter ?? []).includes('resident') ? 0 : 1;
    return aRes - bRes;
  });

  for (const row of residentFirst) {
    if (row.carry_status === 'allowed' || row.carry_status === 'restricted') {
      return row.carry_status as CarryStatus;
    }
  }

  // 2. If matching rows only returned prohibited, honour that.
  if (matchingRows.some(r => r.carry_status === 'prohibited')) return 'prohibited';

  // 3. No matching rows — check if a prohibited row exists for non-matching
  //    permit types (e.g. non-resident row when user has no non-resident permit).
  //    Only surface prohibited if ALL rows prohibit and none allow.
  if (nonMatchingRows.length > 0 && matchingRows.length === 0) return 'prohibited';

  return 'unknown';
}
