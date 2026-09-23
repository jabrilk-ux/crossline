const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const ts=require('typescript');
function harness(platform, result, failure) {
 const calls=[];const exports={};
 const code=ts.transpileModule(fs.readFileSync('services/googleAuth.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports,URL,window:{location:{origin:'https://crossline.example',assign:url=>calls.push(['redirect',url])}},require:name=>{
  if(name==='react-native')return {Platform:{OS:platform}};
  if(name==='expo-web-browser')return {openAuthSessionAsync:async(url,callback)=>{calls.push(['browser',callback]);return result;}};
  if(name==='./authCallback')return {completeAuthCallback:async url=>calls.push(['complete',url])};
  if(name==='./supabase')return {supabase:{auth:{signInWithOAuth:async options=>{calls.push(['oauth',options]);return {data:{url:'https://example.supabase.co/auth/v1/authorize'},error:failure};}}}};
  throw Error(name);
 }});return {...exports,calls};
}
test('native Google login completes the expected callback and handles cancellation',async()=>{
 const h=harness('ios',{type:'success',url:'crossline://auth-callback?code=test'});
 assert.equal(await h.signInWithGoogle(),'signed-in');
 assert.equal(h.calls[0][1].provider,'google');
 assert.equal(h.calls[1][1],'crossline://auth-callback');
 assert.equal(h.calls[2][0],'complete');
 for(const type of ['cancel','dismiss']) {
  const cancelled=harness('android',{type});assert.equal(await cancelled.signInWithGoogle(),'cancelled');
  assert.equal(cancelled.calls.length,2);
 }
});
test('native login rejects an unexpected callback or provider failure',async()=>{
 const h=harness('android',{type:'success',url:'https://other.example/?code=test'});
 await assert.rejects(h.signInWithGoogle(),/Unexpected/);assert.equal(h.calls.length,2);
 const bad=harness('ios',null,Error('Provider unavailable'));
 await assert.rejects(bad.signInWithGoogle(),/Provider unavailable/);assert.equal(bad.calls.length,1);
});
test('web Google login redirects in the same tab using the current origin',async()=>{
 const h=harness('web');assert.equal(await h.signInWithGoogle(),'redirecting');
 assert.equal(h.calls[0][1].options.redirectTo,'https://crossline.example/auth-callback');
 assert.equal(h.calls[1][0],'redirect');
 assert.equal(h.authRedirectUrl(true),'https://crossline.example/auth-callback?recovery=true');
});
