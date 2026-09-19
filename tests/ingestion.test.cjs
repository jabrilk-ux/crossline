const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function ingestionHarness() {
  const writes = [];
  const exports = {};
  const source = fs.readFileSync(require.resolve('../scripts/scraper/db/upsert.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(compiled, {
    exports, Date,
    process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-fixture' } },
    require(name) {
      assert.equal(name, '@supabase/supabase-js');
      return { createClient: () => ({ from: table => ({ upsert: async (row, options) => { writes.push({ table, row, options }); return { error: null }; } }) }) };
    },
  });
  return { upsertLaw: exports.upsertLaw, writes };
}
const candidate = {
  state_code: 'PA', category: 'transport', plain_english: 'Synthetic test only',
  carry_status: 'allowed', statute_reference: null, statute_url: 'https://example.invalid',
  flagged: false, last_scraped: '2026-09-18T12:00:00Z',
};
test('scraped content invalidates prior review even when caller marks it unflagged', async () => {
  const { upsertLaw, writes } = ingestionHarness();
  await upsertLaw(candidate, false);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].table, 'state_laws');
  assert.equal(writes[0].row.flagged, true);
  assert.equal(writes[0].row.last_verified, null);
  assert.equal(writes[0].options.onConflict, 'state_code,category');
  assert.equal(writes[0].row.plain_english, candidate.plain_english);
});
test('dry-run ingestion makes no database write', async () => {
  const { upsertLaw, writes } = ingestionHarness();
  await upsertLaw(candidate, true);
  assert.equal(writes.length, 0);
});
