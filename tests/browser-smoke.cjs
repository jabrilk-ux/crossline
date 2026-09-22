// UI integration test with synthetic API fixtures: sends no emails and creates no users.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const googleMode = process.env.CROSSLINE_TEST_GOOGLE === '1';
    let deletionCalls = 0;
    const id='ce6f4551-643d-408b-9fc5-2f8f9bab0001';
    const user={id,aud:'authenticated',role:'authenticated',email:'beta-fixture@example.com',app_metadata:{provider:googleMode?'google':'email',providers:[googleMode?'google':'email']},user_metadata:{},created_at:new Date().toISOString()};
    const token=[{alg:'HS256',typ:'JWT'},{sub:id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600},'signature'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');
    const session={access_token:token,refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user};
    let profile=null,permits=[];
    await page.route('https://*.supabase.co/**',async route=>{
      const request=route.request(),url=new URL(request.url());
      let response={};
      if(url.pathname.endsWith('/authorize')) {
        assert.equal(url.searchParams.get('provider'),'google');
        assert.equal(url.searchParams.get('code_challenge_method'),'s256');
        assert.ok(url.searchParams.get('code_challenge'));
        const callback=url.searchParams.get('redirect_to');
        assert.equal(callback,new URL('/auth-callback',process.env.CROSSLINE_TEST_URL ?? 'http://localhost:8081').href);
        return route.fulfill({status:302,headers:{location:callback+'?code=synthetic-google-code'},body:''});
      }
      if(url.pathname.endsWith('/functions/v1/delete-account')) { deletionCalls++; assert.ok(request.headers().authorization?.startsWith('Bearer ')); if (deletionCalls === 1) return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Synthetic deletion failure'})}); response={deleted:true}; }
      else if(url.pathname.endsWith('/signup'))response={user,session:null};
      else if(url.pathname.endsWith('/token')) {
        if (googleMode) { assert.equal(url.searchParams.get('grant_type'),'pkce'); assert.ok(request.postDataJSON().code_verifier); }
        response=session;
      }
      else if(url.pathname.endsWith('/user'))response=user;
      else if(url.pathname.endsWith('/recover')||url.pathname.endsWith('/logout'))response={};
      else if(url.pathname.endsWith('/rpc/save_onboarding')) { const data=request.postDataJSON(); profile={...data.profile,id,created_at:new Date().toISOString()}; permits=data.permits.map((p,i)=>({...p,id:`permit-${i}`,user_id:id})); response=null; }
      else if(url.pathname.endsWith('/users'))response=profile;
      else if(url.pathname.endsWith('/permits'))response=permits;
      else if(url.pathname.endsWith('/crossing_events')||url.pathname.endsWith('/state_laws')||url.pathname.endsWith('/carry_rules'))response=[];
      else throw new Error(`Unexpected test request ${url.pathname}`);
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
    });
    await page.goto(process.env.CROSSLINE_TEST_URL ?? 'http://localhost:8081');
    await page.getByText('Get Started',{exact:true}).click();
    await page.getByRole('button',{name:'Official state references',exact:true}).click();
    await page.getByText('East Coast reference library',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:/^Reference: /}).count(),14);
    for (const state of ['Maine','New Hampshire','Massachusetts','Rhode Island','Connecticut','New York','New Jersey','Delaware','Maryland','Virginia','North Carolina','South Carolina','Georgia','Florida']) {
      await page.getByRole('button',{name:`Reference: ${state}`,exact:true}).click();
      await page.getByText(`${state} · official references`,{exact:true}).waitFor();
      await page.getByText(/Not independently reviewed/).waitFor();
    }
    await page.screenshot({path:'/tmp/crossline-reference-library.png',fullPage:true});
    await page.getByRole('button',{name:'Back',exact:true}).click();
    if (googleMode) {
      await page.getByRole('button',{name:'Sign in with Google',exact:true}).click();
    } else {
    await page.getByRole('button',{name:'Create account',exact:true}).click();
    await page.getByText('Enter a valid email address.',{exact:true}).waitFor();
    await page.getByRole('textbox',{name:'Email address'}).fill('beta-fixture@example.com');
    await page.getByRole('textbox',{name:'Password',exact:true}).fill('Fixture-only-password-123');
    await page.getByRole('button',{name:'Create account',exact:true}).click();
    await page.getByText('Check your email to confirm your account. Then return here and sign in.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Back to sign in',exact:true}).click();
    await page.getByRole('button',{name:'Forgot password?',exact:true}).click();
    await page.getByRole('button',{name:'Send reset email',exact:true}).click();
    await page.getByText('If an account exists, a reset email is on its way. Open it on this device.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Back to sign in',exact:true}).click();
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    }
    await page.getByText('Where is your home state?',{exact:true}).waitFor();
    await page.getByPlaceholder('Search states...').fill('Virginia');
    await page.getByText('Virginia',{exact:true}).click();
    await page.getByText('Continue',{exact:true}).click();
    await page.getByText('Continue',{exact:true}).click();
    await page.getByText('Handgun',{exact:true}).click();
    await page.getByText('Concealed Carry (CCW)',{exact:true}).click();
    await page.getByText('Continue',{exact:true}).click();
    await page.getByText('Finish Setup',{exact:true}).click();
    await page.getByText('Browse laws by state →',{exact:true}).waitFor();
    assert.equal(profile.home_state,'VA');
    await page.getByText('Home state',{exact:true}).waitFor();
    await page.getByText('Virginia',{exact:true}).waitFor();
    assert.equal(await page.getByText('Choose a state to get started',{exact:true}).count(),0);
    await page.reload();
    await page.getByText('Browse laws by state →',{exact:true}).waitFor();
    await page.getByText('Home state',{exact:true}).waitFor();
    await page.getByText('Virginia',{exact:true}).waitFor();
    await page.getByText('See my live location on the map →',{exact:true}).click();
    const map = page.getByRole('group',{name:'Interactive state map'});
    await map.waitFor();
    assert.equal(await map.getByRole('button').count(),51);
    const initialView = await map.getAttribute('viewBox');
    await page.getByRole('button',{name:'Zoom in',exact:true}).click();
    assert.notEqual(await map.getAttribute('viewBox'),initialView);
    await page.getByRole('button',{name:'Reset view',exact:true}).click();
    assert.equal(await map.getAttribute('viewBox'),initialView);
    await page.getByLabel('Find a state',{exact:true}).selectOption('VA');
    await page.getByRole('heading',{name:'Virginia',exact:true}).waitFor();
    await page.getByText(/Unable to determine carry status from/).waitFor();
    await map.getByRole('button',{name:'Virginia: Unknown',exact:true}).press('Enter');
    assert.equal(await map.getByRole('button',{name:'Virginia: Unknown',exact:true}).getAttribute('aria-pressed'),'true');
    await page.getByRole('button',{name:'Official state references',exact:true}).click();
    await page.getByText('Virginia · official references',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Back',exact:true}).click();
    await page.getByLabel('Map region',{exact:true}).selectOption('Alaska');
    await map.getByRole('button',{name:'Alaska: Unknown',exact:true}).press('Enter');
    await page.getByRole('heading',{name:'Alaska',exact:true}).waitFor();
    await page.getByText(/Outside the East Coast reference beta/).waitFor();
    await page.getByLabel('Map region',{exact:true}).selectOption('United States');
    await page.screenshot({path:'/tmp/crossline-web-map-mobile.png',fullPage:true});
    const box = await map.boundingBox();
    const beforeDrag = await map.getAttribute('viewBox');
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+40,box.y+box.height/2+20,{steps:5});
    await page.mouse.up();
    assert.notEqual(await map.getAttribute('viewBox'),beforeDrag);
    console.log('PASS: web map has 51 selectable jurisdictions, zoom/reset, pan, keyboard selection, regional views, unknown status and reference navigation.');
    await page.context().setGeolocation({latitude:37.54,longitude:-77.43,accuracy:25});
    await page.context().grantPermissions(['geolocation']);
    await page.getByRole('button',{name:'Locate me',exact:true}).click();
    const marker = page.getByRole('img',{name:'Your location',exact:true});
    await marker.waitFor();
    await page.getByRole('status').filter({hasText:'Accuracy ±25 m'}).waitFor();
    const firstX = await marker.locator('circle').getAttribute('cx');
    await page.context().setGeolocation({latitude:38.9,longitude:-77.04,accuracy:40});
    await page.waitForFunction(x => document.querySelector('[aria-label="Your location"] circle')?.getAttribute('cx') !== x, firstX);
    await page.getByRole('status').filter({hasText:'Accuracy ±40 m'}).waitFor();
    await page.getByRole('tab',{name:/Home/}).click();
    await page.getByText('Last detected state',{exact:true}).waitFor();
    await page.getByText('Washington D.C.',{exact:true}).waitFor();
    await page.getByText(/Detected on the map at/).waitFor();
    await page.getByRole('tab',{name:/Map/}).click();
    await marker.waitFor();
    await page.getByRole('button',{name:'Stop location',exact:true}).click();
    assert.equal(await marker.count(),0);
    await page.getByRole('status').filter({hasText:'Location is off'}).waitFor();
    await page.getByRole('tab',{name:/Home/}).click();
    await page.getByText('Home state',{exact:true}).waitFor();
    await page.getByText('Virginia',{exact:true}).waitFor();
    console.log('PASS: live location updates move the marker, expose accuracy, and stop removes the position.');
    await page.getByRole('tab',{name:/Trip/}).click();
    await page.getByRole('textbox',{name:'States in travel order'}).fill('VA, MD, PA');
    await page.getByRole('button',{name:'Prepare trip brief',exact:true}).click();
    await page.getByText('1. Virginia',{exact:true}).waitFor();
    await page.getByText('Outside the 14-state beta reference coverage. Verify this jurisdiction separately.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Save brief on this device',exact:true}).click();
    await page.getByText('Trip saved on this device.',{exact:true}).waitFor();
    await page.getByRole('button',{name:/Open saved brief/}).click();
    await page.getByText(/Saved copy. Rules or your profile may have changed/).waitFor();
    await page.getByRole('tab',{name:/Profile/}).click();
    await page.getByText('Free beta · Purchases disabled',{exact:true}).waitFor();
    assert.equal(await page.getByRole('switch',{name:'Background tracking',exact:true}).count(),0);
    assert.equal(await page.getByRole('switch',{name:'Crossing alerts',exact:true}).count(),0);
    await page.getByRole('button',{name:'Open live location map',exact:true}).waitFor();
    await page.getByText(/Chrome and Codex have separate location permissions/).waitFor();
    await page.getByRole('button',{name:'Privacy and beta information',exact:true}).click();
    await page.getByText('Privacy & beta information',{exact:true}).waitFor();
    await page.screenshot({path:'/tmp/crossline-beta-privacy.png',fullPage:true});
    if (googleMode) {
      await page.getByRole('button',{name:'Back',exact:true}).click();
      await page.getByRole('button',{name:'Delete my account',exact:true}).click();
      assert.equal(await page.getByRole('textbox',{name:'Password to confirm account deletion'}).count(),0);
      assert.equal(await page.getByRole('button',{name:'Permanently delete account',exact:true}).isDisabled(),true);
      assert.equal(deletionCalls,0);
      await page.getByRole('textbox',{name:'Type DELETE to confirm account deletion'}).fill('DELETE');
      await page.getByRole('button',{name:'Permanently delete account',exact:true}).click();
      await page.getByText(/Edge Function returned a non-2xx status code/).waitFor();
      assert.equal(deletionCalls,1);
      await page.getByRole('button',{name:'Permanently delete account',exact:true}).click();
      await page.getByText('Get Started',{exact:true}).waitFor();
      assert.equal(deletionCalls,2);
      console.log('PASS: Google PKCE redirect, callback, onboarding, session restoration and passwordless account deletion (mocked).');
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: all 14 public reference cards, out-of-coverage trip warning, signup validation and confirmation, recovery request, login, onboarding, account restoration, manual trip, saved brief, free beta, privacy navigation; no page exceptions. API responses were mocked.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1);});
