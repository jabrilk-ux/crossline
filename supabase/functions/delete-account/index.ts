import { createClient } from 'npm:@supabase/supabase-js@2.103.0';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Content-Type': 'application/json' };
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return new Response('{}', { status: 405, headers });
  const token = req.headers.get('Authorization')?.replace(/^Bearer /i, '');
  if (!token) return new Response('{"error":"Authentication required"}', { status: 401, headers });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return new Response('{"error":"Please sign in again"}', { status: 401, headers });
  // Revoke refresh sessions first. Existing access tokens expire normally but
  // cannot recreate deleted profiles because the auth-user FK no longer exists.
  const revoked = await admin.auth.admin.signOut(token, 'global');
  if (revoked.error) return new Response('{"error":"Could not revoke sessions. Retry."}', { status: 500, headers });
  const deleted = await admin.auth.admin.deleteUser(data.user.id);
  if (deleted.error) return new Response('{"error":"Could not delete account. Retry or contact support."}', { status: 500, headers });
  return new Response('{"deleted":true}', { headers });
});
