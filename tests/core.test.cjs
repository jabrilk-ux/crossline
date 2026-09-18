require('ts-node').register({ transpileOnly: true, skipProject: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node', target: 'ES2022', esModuleInterop: true, resolveJsonModule: true } });
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCarryRules } = require('../services/carryRules.ts');
const { advanceCrossing, initialCrossing } = require('../services/crossing.ts');
const { statesAlongGeometry } = require('../services/routeGeometry.ts');
const now=new Date('2026-09-18T12:00:00Z');
const profile={firearmsType:'handgun',carryPurpose:'ccw',magCapacity:10,hasSuppressor:false};
const permit={id:'test',stateCode:'VA',permitType:'resident',expiryDate:'2027-01-01'};
const rule={state_code:'MD',home_state:'VA',permit_state:'VA',permit_type:'resident',permitless:false,firearm_type:'handgun',carry_purpose:'ccw',max_mag_capacity:10,suppressor_allowed:false,status:'restricted',explanation:'Synthetic fixture, not legal guidance',source_url:'https://example.com/test',effective_date:'2026-01-01',expires_on:'2026-12-31',reviewed_at:'2026-09-18T00:00:00Z',published:true};
const evaluate=(rules=[rule],permits=[permit],p=profile,home='VA')=>evaluateCarryRules(rules,'MD',home,permits,p,now);
test('only exact reviewed profile and permit scope matches',()=>{
 assert.equal(evaluate(),'restricted');
 assert.equal(evaluate([rule],[{...permit,stateCode:'TX'}]),'unknown');
 assert.equal(evaluate([rule],[{...permit,expiryDate:'2020-01-01'}]),'unknown');
 assert.equal(evaluate([rule],[{...permit,expiryDate:null}]),'unknown');
 assert.equal(evaluate([rule],[{...permit,expiryDate:'2027-99-99'}]),'unknown');
 assert.equal(evaluate([rule],[permit],{...profile,firearmsType:'all'}),'unknown');
 assert.equal(evaluate([rule],[permit],{...profile,magCapacity:11}),'unknown');
 assert.equal(evaluate([rule],[permit],{...profile,hasSuppressor:true}),'unknown');
 assert.equal(evaluate([rule],[permit],profile,'TX'),'unknown');
});
test('unreviewed, stale, future and unpublished rules never produce guidance',()=>{
 for(const change of [{published:false},{reviewed_at:null},{reviewed_at:'2025-01-01'},{reviewed_at:'2030-01-01'},{effective_date:'2027-01-01'},{expires_on:'2026-01-01'},{source_url:'http://example.com'}]) assert.equal(evaluate([{...rule,...change}]),'unknown');
 assert.equal(evaluate([]),'unknown');
});
test('conflicting reviewed outcomes choose the more restrictive result',()=>{
 assert.equal(evaluate([{...rule,status:'allowed'},rule]),'restricted');
 assert.equal(evaluate([{...rule,status:'allowed'},{...rule,status:'prohibited'}]),'prohibited');
});
test('initial position is not a crossing and border jitter requires confirmation',()=>{
 let r=advanceCrossing(initialCrossing,'VA',1000,20); assert.equal(r.crossed,false);
 r=advanceCrossing(r.state,'MD',2000,20); assert.equal(r.crossed,false);
 r=advanceCrossing(r.state,'VA',3000,20); assert.equal(r.state.candidate,null);
 r=advanceCrossing(r.state,'MD',4000,20); assert.equal(r.crossed,false);
 r=advanceCrossing(r.state,'MD',24000,20); assert.equal(r.crossed,true);
 assert.equal(advanceCrossing(r.state,'MD',25000,20).crossed,false);
 assert.equal(advanceCrossing(r.state,'VA',23000,20).crossed,false);
 assert.equal(advanceCrossing(r.state,'VA',30000,500).state.current,'MD');
});
test('road geometry preserves intermediate states and re-entry',()=>{
 const path=[[-77.436,37.54],[-76.612,39.29],[-76.886,40.274],[-76.612,39.29],[-77.436,37.54]];
 const states=statesAlongGeometry(path);
 assert.deepEqual(states.states,['VA','MD','PA','MD','VA']);
 assert.throws(()=>statesAlongGeometry([[NaN,0],[0,0]]));
 assert.equal(statesAlongGeometry([[-79.38,43.65],[-77.61,43.16]]).hasUnmappedSections,true);
});
