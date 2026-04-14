import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Types matching the DB schema ────────────────────────────────────────────

export interface DBUser {
  id: string;
  home_state: string | null;
  carry_purpose: 'ccw' | 'transport' | 'hunting' | null;
  firearm_type: 'handgun' | 'rifle' | 'shotgun' | 'all' | null;
  mag_capacity: number | null;
  has_suppressor: boolean;
  created_at: string;
}

export interface DBPermit {
  id: string;
  user_id: string;
  state_code: string;
  permit_type: 'resident' | 'non-resident';
  expiry_date: string | null;
  created_at: string;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  return supabase.auth.getSession();
}

// ─── User profile helpers ─────────────────────────────────────────────────────

export async function upsertUserProfile(profile: Omit<DBUser, 'created_at'>) {
  return supabase.from('users').upsert(profile).select().single();
}

export async function getUserProfile(userId: string) {
  return supabase.from('users').select('*').eq('id', userId).single();
}

// ─── Permit helpers ───────────────────────────────────────────────────────────

export async function insertPermit(permit: Omit<DBPermit, 'id' | 'created_at'>) {
  return supabase.from('permits').insert(permit).select().single();
}

export async function getUserPermits(userId: string) {
  return supabase.from('permits').select('*').eq('user_id', userId);
}

export async function deletePermit(permitId: string) {
  return supabase.from('permits').delete().eq('id', permitId);
}

// ─── Crossing event helpers ───────────────────────────────────────────────────

export async function logCrossingEvent(
  userId: string,
  fromState: string | null,
  toState: string,
  notificationId?: string
) {
  return supabase.from('crossing_events').insert({
    user_id: userId,
    from_state: fromState,
    to_state: toState,
    notification_id: notificationId ?? null,
  });
}
