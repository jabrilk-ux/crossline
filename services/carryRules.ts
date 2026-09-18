import type { Permit, FirearmsProfile } from '../store/userStore';
export interface CarryRule {
  state_code: string; home_state: string | null; permit_state: string | null;
  permit_type: string | null; permitless: boolean; firearm_type: string;
  carry_purpose: string; max_mag_capacity: number | null; suppressor_allowed: boolean;
  status: 'allowed' | 'restricted' | 'prohibited'; explanation: string; source_url: string;
  effective_date: string; expires_on: string; reviewed_at: string | null; published: boolean;
}
export function matchingCarryRules(rules: CarryRule[], state: string, home: string | null, permits: Permit[], profile: FirearmsProfile, now = new Date()): CarryRule[] {
  if (!home || !profile.firearmsType || profile.firearmsType === 'all' || !profile.carryPurpose) return [];
  const today = now.toISOString().slice(0,10);
  const matching = rules.filter(r => {
    const reviewed = Date.parse(r.reviewed_at ?? '');
    if (!r.published || !Number.isFinite(reviewed) || reviewed > now.getTime() || now.getTime()-reviewed > 90*86400000 || r.effective_date > today || r.expires_on < today || !r.source_url.startsWith('https://')) return false;
    if (r.state_code !== state || (r.home_state && r.home_state !== home) || r.firearm_type !== profile.firearmsType || r.carry_purpose !== profile.carryPurpose) return false;
    if (profile.hasSuppressor && !r.suppressor_allowed) return false;
    if (r.max_mag_capacity !== null && (profile.magCapacity === null || profile.magCapacity > r.max_mag_capacity)) return false;
    return r.permitless || permits.some(p => p.stateCode === r.permit_state && p.permitType === r.permit_type && (p.permitType !== 'resident' || p.stateCode === home) && p.expiryDate !== null && /^\d{4}-\d{2}-\d{2}$/.test(p.expiryDate) && Number.isFinite(Date.parse(p.expiryDate)) && new Date(p.expiryDate).toISOString().slice(0,10) === p.expiryDate && p.expiryDate >= today);
  });
  return matching;
}
export function evaluateCarryRules(rules: CarryRule[], state: string, home: string | null, permits: Permit[], profile: FirearmsProfile, now = new Date()): 'allowed' | 'restricted' | 'prohibited' | 'unknown' {
  const matching = matchingCarryRules(rules, state, home, permits, profile, now);
  if (matching.some(r => r.status === 'prohibited')) return 'prohibited';
  if (matching.some(r => r.status === 'restricted')) return 'restricted';
  if (matching.some(r => r.status === 'allowed')) return 'allowed';
  return 'unknown';
}
