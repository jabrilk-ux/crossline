import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import { completeAuthCallback } from './authCallback';

export function authRedirectUrl(recovery = false): string {
  const base = Platform.OS === 'web'
    ? `${window.location.origin}/auth-callback`
    : 'crossline://auth-callback';
  return recovery ? `${base}?recovery=true` : base;
}

export async function signInWithGoogle(): Promise<'signed-in' | 'redirecting' | 'cancelled'> {
  const redirectTo = authRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Google sign-in is unavailable. Please try again.');
  if (Platform.OS === 'web') {
    window.location.assign(data.url);
    return 'redirecting';
  }
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') return 'cancelled';
  if (result.type !== 'success') throw new Error('Google sign-in did not finish. Please try again.');
  const callback = new URL(result.url);
  if (callback.protocol !== 'crossline:' || callback.hostname !== 'auth-callback' || (callback.pathname && callback.pathname !== '/')) {
    throw new Error('Unexpected sign-in callback. Please try again.');
  }
  await completeAuthCallback(result.url);
  return 'signed-in';
}
