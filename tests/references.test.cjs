require('ts-node').register({ transpileOnly: true, skipProject: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node', target: 'ES2022', esModuleInterop: true, resolveJsonModule: true } });
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { legalReferences, getLegalReference, referenceNeedsRefresh } = require('../services/legalReferences.ts');
test('reference coverage is exactly the coastal beta and leaves other jurisdictions unknown', () => {
  assert.deepEqual(legalReferences.map(r => r.code).sort(), ['ME','NH','MA','RI','CT','NY','NJ','DE','MD','VA','NC','SC','GA','FL'].sort());
  for (const code of ['PA','VT','DC','XX']) assert.equal(getLegalReference(code), undefined);
  for (const entry of legalReferences) {
    assert.ok(entry.summary && entry.questions && entry.researchDate);
    assert.ok(entry.sources.length > 0);
    assert.equal(entry.carry_status, undefined);
    assert.equal(entry.reviewed_at, undefined);
    for (const source of entry.sources) {
      const url = new URL(source.url);
      assert.equal(url.protocol, 'https:');
      assert.ok(url.hostname.endsWith('.gov'));
    }
  }
});
test('research summaries expire after 90 days and reject future or invalid dates', () => {
  const entry = getLegalReference('ME');
  assert.equal(referenceNeedsRefresh(entry, new Date('2026-09-18T12:00:00Z')), false);
  assert.equal(referenceNeedsRefresh(entry, new Date('2026-12-17T00:00:00Z')), true);
  assert.equal(referenceNeedsRefresh(entry, new Date('2026-09-17T23:00:00Z')), true);
  assert.equal(referenceNeedsRefresh({...entry,researchDate:'invalid'}), true);
});
