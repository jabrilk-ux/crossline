const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const ts=require('typescript');
function harness() {
 const calls=[]; const exports={};
 const code=ts.transpileModule(fs.readFileSync('services/authCallback.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports,URL,URLSearchParams,require:()=>({supabase:{auth:{exchangeCodeForSession:async code=>{calls.push(code);return {error:null};},setSession:async session=>{calls.push(session);return {error:null};}}}})});
 return {...exports,calls};
}
test('PKCE callback exchanges once across concurrent screen/browser handlers',async()=>{
 const h=harness(); const url='crossline://auth-callback?code=fixture';
 assert.deepEqual(await Promise.all([h.completeAuthCallback(url),h.completeAuthCallback(url)]),[false,false]);
 assert.equal(h.calls.length,1);
});
test('email token callbacks and recovery query remain supported',async()=>{
 const h=harness(); assert.equal(await h.completeAuthCallback('crossline://auth-callback?recovery=true#access_token=a&refresh_token=b'),true);
 assert.equal(h.calls[0].access_token,'a');
});
test('denied and incomplete callbacks cannot create a session',async()=>{
 const h=harness();
 await assert.rejects(h.completeAuthCallback('crossline://auth-callback?error=access_denied'),/cancelled/);
 await assert.rejects(h.completeAuthCallback('crossline://auth-callback'),/incomplete/);
 assert.equal(h.calls.length,0);
});
