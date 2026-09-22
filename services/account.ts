import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { useUserStore } from '../store/userStore';
import { useLocationStore } from '../store/locationStore';

export async function loadAccount(userId: string) {
  const [profile, permits, crossings] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).maybeSingle(),
    supabase.from('permits').select('*').eq('user_id', userId),
    supabase.from('crossing_events').select('*').eq('user_id', userId).order('crossed_at', { ascending: false }).limit(50),
  ]);
  if (profile.error || permits.error || crossings.error) throw profile.error ?? permits.error ?? crossings.error;
  // A previous sign-in request must not overwrite the next account's state.
  if (useUserStore.getState().userId !== userId) return;
  const p = profile.data;
  useUserStore.setState({
    permits: (permits.data ?? []).map(p => ({ id: p.id, stateCode: p.state_code, permitType: p.permit_type, expiryDate: p.expiry_date })),
    homeState: p?.home_state ?? null,
    firearmsProfile: { firearmsType: p?.firearm_type ?? null, carryPurpose: p?.carry_purpose ?? null, magCapacity: p?.mag_capacity ?? null, hasSuppressor: p?.has_suppressor ?? false },
    isOnboarded: Boolean(p?.home_state),
  });
  useLocationStore.setState({ crossingHistory: (crossings.data ?? []).map(c => ({ fromState: c.from_state, toState: c.to_state, crossedAt: c.crossed_at })) });
}

export async function clearHistory() {
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) throw authError ?? new Error('Please sign in again.');
  const { error } = await supabase.from('crossing_events').delete().eq('user_id', data.user.id);
  if (error) throw error;
  useLocationStore.getState().clearHistory();
  await AsyncStorage.removeItem(`crossline:crossing:${data.user.id}`);
}

export async function clearLocalAccount(userId: string) {
  const keys = await AsyncStorage.getAllKeys();
  const owned = keys.filter(k => k === `crossline:preferences:${userId}` || k === `crossline:crossing:${userId}` || k.startsWith(`crossline:trip:${userId}`));
  await AsyncStorage.multiRemove(owned);
  useUserStore.getState().reset();
  useLocationStore.setState({ browserLocation: null, currentState: null, previousState: null, crossingHistory: [], isTracking: false });
}
