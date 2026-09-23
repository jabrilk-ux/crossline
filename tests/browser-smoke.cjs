// UI integration test with synthetic API fixtures: sends no emails and creates no users.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors=[];page.on('pageerror',e=>{ errors.push(e.message); console.error('Browser exception:', e.stack); });
    const googleMode = process.env.CROSSLINE_TEST_GOOGLE === '1';
    // Do not exercise community tile servers with headless pan/zoom tests.
    // Real street rendering is checked interactively after deployment.
    const tileRequests = [];
    let failTiles = false;
    await page.route('https://tile.openstreetmap.org/**', async route => {
      tileRequests.push(route.request().url());
      if (failTiles) return route.fulfill({status:503,body:'Synthetic tile outage'});
      return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#dae4e9"/><path d="M0 128H256M128 0V256" stroke="white" stroke-width="8"/><text x="12" y="24" font-size="12">Test map tile</text></svg>' });
    });
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
    await page.getByText('Get Started',{exact:true}).waitFor();
    await page.screenshot({path:'/tmp/crossline-design-welcome.png',fullPage:true});
    await page.getByText('Get Started',{exact:true}).click();
    await page.screenshot({path:'/tmp/crossline-design-login.png',fullPage:true});
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
    await page.getByText('Where’s home?',{exact:true}).waitFor();
    await page.screenshot({path:'/tmp/crossline-design-onboarding.png',fullPage:true});
    await page.getByPlaceholder('Search states...').fill('Virginia');
    await page.getByText('Virginia',{exact:true}).click();
    await page.getByText('Continue',{exact:true}).click();
    await page.getByText('Continue',{exact:true}).click();
    await page.getByText('Handgun',{exact:true}).click();
    await page.getByText('Concealed Carry (CCW)',{exact:true}).click();
    await page.getByText('Continue',{exact:true}).click();
    await page.getByText('Finish Setup',{exact:true}).click();
    await page.getByText('Browse laws by state →',{exact:true}).waitFor();
    await page.screenshot({path:'/tmp/crossline-design-home-mobile.png',fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    await page.screenshot({path:'/tmp/crossline-design-home-desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert.equal(profile.home_state,'VA');
    await page.getByText('Home state',{exact:true}).waitFor();
    await page.getByText('Home state',{exact:true}).locator('..').getByText('Virginia',{exact:true}).waitFor();
    assert.equal(await page.getByText('Choose a state to get started',{exact:true}).count(),0);
    await page.reload();
    await page.getByText('Browse laws by state →',{exact:true}).waitFor();
    await page.getByText('Home state',{exact:true}).waitFor();
    await page.getByText('Home state',{exact:true}).locator('..').getByText('Virginia',{exact:true}).waitFor();
    await page.getByText('Full Virginia laws →',{exact:true}).click();
    await page.getByText('Change state ▾',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Change law state',exact:true}).click();
    await page.getByRole('textbox',{name:'Search law states',exact:true}).fill('Maryland');
    await page.getByRole('button',{name:'View Maryland laws',exact:true}).click();
    await page.getByText('Maryland · official references',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Change law state',exact:true}).click();
    await page.getByRole('textbox',{name:'Search law states',exact:true}).fill('Virginia');
    await page.getByRole('button',{name:'View Virginia laws',exact:true}).click();
    await page.screenshot({path:'/tmp/crossline-design-laws.png',fullPage:true});
    await page.setViewportSize({width:1920,height:1080});
    await page.screenshot({path:'/tmp/crossline-design-laws-desktop.png',fullPage:true});
    const gutterBackground = await page.evaluate(() => {
      let element = document.elementFromPoint(250, 500);
      while (element) {
        const color = getComputedStyle(element).backgroundColor;
        if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color;
        element = element.parentElement;
      }
    });
    assert.equal(gutterBackground, 'rgb(10, 22, 40)', 'Desktop gutter must match the dark app background');
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('tab',{name:/Home/}).click();
    await page.getByText('See my live location on the map →',{exact:true}).click();
    const map = page.getByRole('region',{name:'Live street map'});
    await map.waitFor();
    await page.waitForFunction(() => document.querySelectorAll('.leaflet-tile-loaded').length > 0);
    assert.ok(tileRequests.length > 0, 'Street map requests actual map tiles');
    await map.getByRole('link',{name:'OpenStreetMap',exact:true}).waitFor();
    failTiles = true;
    await map.getByRole('button',{name:'Zoom in',exact:true}).click();
    await page.getByRole('button',{name:'Retry map',exact:true}).waitFor();
    failTiles = false;
    await page.getByRole('button',{name:'Retry map',exact:true}).click();
    await page.getByRole('button',{name:'Retry map',exact:true}).waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Reset view',exact:true}).click();
    await page.getByLabel('Find a state',{exact:true}).selectOption('VA');
    await page.getByRole('heading',{name:'Virginia',exact:true}).waitFor();
    await page.getByText(/Unable to determine carry status from/).waitFor();
    await page.getByRole('button',{name:'Official state references',exact:true}).click();
    await page.getByText('Virginia · official references',{exact:true}).filter({visible:true}).waitFor();
    await page.getByRole('button',{name:'Back',exact:true}).click();
    await page.getByLabel('Map region',{exact:true}).selectOption('Alaska');
    await page.getByLabel('Find a state',{exact:true}).selectOption('AK');
    await page.getByRole('heading',{name:'Alaska',exact:true}).waitFor();
    await page.getByText(/Outside the East Coast reference beta/).waitFor();
    await page.getByLabel('Map region',{exact:true}).selectOption('United States');
    await page.screenshot({path:'/tmp/crossline-web-map-mobile.png',fullPage:true});
    await page.context().setGeolocation({latitude:37.54,longitude:-77.43,accuracy:25});
    await page.context().grantPermissions(['geolocation']);
    await page.getByRole('button',{name:'Locate me',exact:true}).click();
    const marker = page.getByRole('img',{name:'Your location',exact:true});
    await marker.waitFor();
    await page.getByRole('status').filter({hasText:'Accuracy ±25 m'}).waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('.leaflet-tile')].some(tile => tile.src.includes('/16/')));
    const box = await map.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+80,box.y+box.height/2+20,{steps:5});
    await page.mouse.up();
    await page.getByRole('status').filter({hasText:'Tap Locate me to recenter'}).waitFor();
    await page.getByRole('button',{name:'Locate me',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Following you'}).waitFor();
    await page.context().setGeolocation({latitude:38.9,longitude:-77.04,accuracy:40});
    await page.getByRole('status').filter({hasText:'Accuracy ±40 m'}).waitFor();
    await page.getByRole('heading',{name:'Washington D.C.',exact:true}).waitFor();
    console.log('PASS: street tiles, attribution, state selection, zoom, pan, location follow/recenter, and current-state guidance. Tile responses and location are synthetic.');
    await page.getByRole('tab',{name:/Home/}).click();
    await page.getByText('Last detected state',{exact:true}).waitFor();
    await page.getByText('Last detected state',{exact:true}).locator('..').getByText('Washington D.C.',{exact:true}).waitFor();
    await page.getByText(/Detected on the map at/).waitFor();
    await page.getByRole('tab',{name:/Map/}).click();
    await marker.waitFor();
    await page.getByRole('button',{name:'Stop location',exact:true}).click();
    assert.equal(await marker.count(),0);
    await page.getByRole('status').filter({hasText:'Location is off'}).waitFor();
    await page.getByRole('tab',{name:/Home/}).click();
    await page.getByText('Home state',{exact:true}).waitFor();
    await page.getByText('Home state',{exact:true}).locator('..').getByText('Virginia',{exact:true}).waitFor();
    console.log('PASS: live location updates move the marker, expose accuracy, and stop removes the position.');
    await page.getByRole('tab',{name:/Trip/}).click();
    await page.getByRole('button',{name:'Choose states',exact:true}).click();
    await page.getByRole('textbox',{name:'Search trip states'}).fill('Virginia');
    await page.getByRole('button',{name:'Add Virginia',exact:true}).click();
    await page.getByText('Virginia added as stop 1.',{exact:true}).waitFor();
    await page.getByRole('textbox',{name:'Search trip states'}).fill('Maryland');
    await page.getByRole('button',{name:'Add Maryland',exact:true}).click();
    await page.getByRole('textbox',{name:'Search trip states'}).fill('Pennsylvania');
    await page.getByRole('button',{name:'Add Pennsylvania',exact:true}).click();
    await page.screenshot({path:'/tmp/crossline-trip-state-picker.png',fullPage:true});
    await page.getByRole('button',{name:'Use 3 states',exact:true}).click();
    await page.getByRole('button',{name:'Move stop 3 earlier',exact:true}).click();
    await page.getByRole('button',{name:'Enter state codes instead',exact:true}).click();
    assert.equal(await page.getByRole('textbox',{name:'States in travel order'}).inputValue(),'VA, PA, MD');
    await page.getByRole('button',{name:'Move stop 2 later',exact:true}).click();
    assert.equal(await page.getByRole('textbox',{name:'States in travel order'}).inputValue(),'VA, MD, PA');
    await page.getByRole('button',{name:'Add another state',exact:true}).click();
    await page.getByRole('textbox',{name:'Search trip states'}).fill('Maryland');
    await page.getByRole('button',{name:'Add Maryland',exact:true}).click();
    await page.getByRole('button',{name:'Use 4 states',exact:true}).click();
    assert.equal(await page.getByRole('textbox',{name:'States in travel order'}).inputValue(),'VA, MD, PA, MD');
    await page.getByRole('button',{name:'Remove stop 4',exact:true}).click();
    await page.getByRole('button',{name:'Choose states',exact:true}).click();
    await page.getByRole('button',{name:'Add Alabama',exact:true}).click();
    await page.getByRole('button',{name:'Cancel state selection',exact:true}).click();
    assert.equal(await page.getByRole('textbox',{name:'States in travel order'}).inputValue(),'VA, MD, PA');
    await page.getByRole('button',{name:'Hide state codes',exact:true}).click();
    await page.screenshot({path:'/tmp/crossline-trip-route-mobile.png',fullPage:true});
    await page.setViewportSize({width:1920,height:1080});
    await page.screenshot({path:'/tmp/crossline-trip-route-desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    console.log('PASS: trip state search, additions, re-entry, reordering, removal, and cancellation preserve the intended route.');
    await page.getByRole('button',{name:'Prepare trip brief',exact:true}).click();
    await page.getByText('1. Virginia',{exact:true}).waitFor();
    await page.getByText('Outside the 14-state beta reference coverage. Verify this jurisdiction separately.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Save brief on this device',exact:true}).click();
    await page.getByText('Trip saved on this device.',{exact:true}).waitFor();
    await page.getByRole('button',{name:/Open saved brief/}).click();
    await page.getByText(/Saved copy. Rules or your profile may have changed/).waitFor();
    await page.goto(new URL('/crossing-alert?state=MD',process.env.CROSSLINE_TEST_URL ?? 'http://localhost:8081').href);
    await page.getByText('Unable to determine carry status',{exact:true}).filter({visible:true}).waitFor();
    await page.getByRole('button',{name:'See all Maryland laws',exact:true}).waitFor();
    await page.screenshot({path:'/tmp/crossline-design-crossing.png',fullPage:true});
    await page.getByRole('button',{name:'Back to Home',exact:true}).click();
    await page.getByRole('tab',{name:/Profile/}).click();
    await page.getByText('Free beta · Purchases disabled',{exact:true}).waitFor();
    assert.equal(await page.getByRole('switch',{name:'Background tracking',exact:true}).count(),0);
    assert.equal(await page.getByRole('switch',{name:'Crossing alerts',exact:true}).count(),0);
    await page.getByRole('button',{name:'Open live location map',exact:true}).waitFor();
    await page.getByText(/Chrome and Codex have separate location permissions/).waitFor();
    await page.screenshot({path:'/tmp/crossline-design-profile.png',fullPage:true});
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
