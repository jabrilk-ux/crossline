import { supabase } from './supabase';
// Retain only the in-flight result so a root auth transition cannot consume a
// one-time PKCE code twice when the callback screen remounts.
let lastUrl: string | null = null;
let completion: Promise<boolean> | null = null;
export function completeAuthCallback(url: string) {
  if (url === lastUrl && completion) return completion;
  lastUrl = url;
  completion = (async () => {
    const parsed = new URL(url);
    const params = new URLSearchParams(parsed.search);
    new URLSearchParams(parsed.hash.slice(1)).forEach((value, key) => params.set(key, value));
    if (params.get('error') || params.get('error_description')) throw new Error('Sign-in was cancelled or could not be completed. Please try again.');
    const access_token = params.get('access_token'), refresh_token = params.get('refresh_token'), code = params.get('code');
    if (!code && (!access_token || !refresh_token)) throw new Error('This sign-in link is incomplete. Try signing in again or request a new email link.');
    const { error } = code ? await supabase.auth.exchangeCodeForSession(code) : await supabase.auth.setSession({ access_token: access_token!, refresh_token: refresh_token! });
    if (error) throw error;
    return params.get('type') === 'recovery' || parsed.searchParams.get('recovery') === 'true';
  })();
  return completion;
}
