import assert from 'node:assert/strict';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(url && key, 'Configure the Supabase URL and public key in .env.local');
const auth = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
assert.equal(auth.status, 200, 'Auth endpoint must accept the configured public key');
const settings = await auth.json();
assert.equal(settings.external.email, true, 'Email authentication must be enabled');
assert.equal(settings.external.google, true, 'Google authentication must be enabled');
console.log('PASS: project connection, public key, email Auth and Google Auth');
for (const table of ['users', 'permits', 'crossing_events', 'state_laws', 'carry_rules']) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers: { apikey: key } });
  const body = await res.json();
  assert.ok([401, 403].includes(res.status), `${table}: anonymous access must be denied`);
  assert.equal(body.code, '42501', `${table}: expected permission denial, not a missing table`);
  console.log(`PASS: ${table} denies anonymous access`);
}

const deletion = await fetch(`${url}/functions/v1/delete-account`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: '{}' });
assert.equal(deletion.status, 401, 'Account deletion requires a valid user token');
console.log('PASS: account deletion denies unauthenticated requests');
