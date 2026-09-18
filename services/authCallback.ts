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
    const params = new URLSearchParams(parsed.hash.slice(1) || parsed.search.slice(1));
    if (params.get('error_description')) throw new Error(params.get('error_description')!);
    const access_token = params.get('access_token'), refresh_token = params.get('refresh_token'), code = params.get('code');
    if (!code && (!access_token || !refresh_token)) throw new Error('This link is incomplete. Request a new confirmation or reset email.');
    const { error } = code ? await supabase.auth.exchangeCodeForSession(code) : await supabase.auth.setSession({ access_token: access_token!, refresh_token: refresh_token! });
    if (error) throw error;
    return params.get('type') === 'recovery' || parsed.searchParams.get('recovery') === 'true';
  })();
  return completion;
}
