const fs=require('node:fs'),path=require('node:path');
const {_electron}=require(process.argv[3]);
const expectedVersion=process.argv[5]||JSON.parse(fs.readFileSync('staging/manifest.json','utf8')).tag.slice(1);
let phase='launch';const watchdog=setTimeout(()=>{console.error('Native smoke timeout at '+phase);process.exit(1);},120000);
(async()=>{
 console.log('SMOKE launch');const app=await _electron.launch({executablePath:process.argv[2],timeout:60000});
 try{phase='first window';console.log('SMOKE first window');const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));phase='form';console.log('SMOKE wait for form');await page.waitForSelector('#birth-form',{timeout:60000});console.log('SMOKE form ready');
  if(await page.evaluate(()=>typeof require)!=='undefined')throw Error('Renderer has Node access');
  if(expectedVersion!=='3.3.0'&&await page.locator('#ayan').inputValue()!=='true-chitra')throw Error('New charts must default to True Chitra Lahiri');
  phase='updater status';console.log('SMOKE updater status');if((await page.evaluate(()=>JyotishDesktopUpdates.status())).currentVersion!==expectedVersion)throw Error('Wrong installed version');
  if(process.argv[4]!=='baseline'){
   phase='lookup startup';console.log('SMOKE real packaged lookup startup');
   const startup=await page.evaluate(async()=>{const r=await fetch('/api/people/search?q=x');return {status:r.status,data:await r.json()};});
   if(startup.status!==400||!startup.data.error.includes('3–120'))throw Error('Packaged lookup failed to initialize: '+JSON.stringify(startup));
   const result=await app.evaluate(async({app})=>{
    const require=process.getBuiltinModule('module').createRequire(app.getAppPath()+'/package.json'),path=process.getBuiltinModule('path'),{createPeopleBackend}=require('./people-backend.cjs');let calls=0;
    const profile='<h1>Desktop Test Person: Astrological Article and Chart</h1><table><tr><td>Born:</td><td>April 15, 1988, 5:00 AM</td></tr><tr><td>In:</td><td>New York (United States)</td></tr></table><p>Desktop Test Person is an actor and writer.</p>';
    const search='<p><b>1 celebrities</b> found matching your search "Desktop Test Person".</p><div class="card card-celebrity"><a class="celebrity-link" href="https://www.astrotheme.com/astrology/Desktop_Test_Person"><h5>Desktop Test Person</h5></a></div>';
    const backend=await createPeopleBackend({databasePath:path.join(app.getPath('userData'),'qa-lookup.sqlite'),fetchFn:async url=>{calls++;return new Response(url.includes('recherche.php')?search:url.includes('duckduckgo')?'No results found':profile,{headers:{'Content-Type':'text/html'}});}});
    try{const request=()=>backend.handle(new Request('jyotish://app/api/people/search?q=Desktop%20Test%20Person'));const r=await request(),data=await r.json(),before=calls,cached=await(await request()).json();return {status:r.status,date:data.people?.[0]?.details?.date,time:data.people?.[0]?.details?.time,cached:cached.cached,noExtraFetch:calls===before};}finally{backend.close();}
   });
   if(result.status!==200||result.date!=='1988-04-15'||result.time!=='05:00'||!result.cached||!result.noExtraFetch)throw Error('Packaged lookup fixture failed: '+JSON.stringify(result));console.log('SMOKE packaged lookup and persistent cache passed');
  }
  phase='chart data';console.log('SMOKE chart data '+process.argv[4]);if(['seed','baseline'].includes(process.argv[4])){
   if(await page.locator('#ayan').inputValue()!=='lahiri'){
    await page.getByRole('button',{name:'Calculation settings',exact:true}).click();
    await page.locator('#ayan').selectOption('lahiri');
   }
   await page.evaluate(async()=>{const {setDateValue}=await import('/date-entry.mjs');setDateValue('#birth-date','-001999-01-01',{notify:true});});
   await page.locator('#chart-name').fill('Windows Update Smoke');await page.locator('#birth-time').fill('12:00:00');await page.locator('#birth-form button[type=submit]').click();
   if(!(await page.locator('.status-bar').innerText()).includes('2000 BCE'))throw Error('Installed BCE calculation failed');
   await page.locator('#quick-save-calculation').click();await page.locator('#save-notes').fill('Retained through Windows reinstall');await page.locator('.modal button[type=submit]').click();
  }else{
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jyotish-studio.saved.v1'))),chart=saved.charts.find(c=>c.name==='Windows Update Smoke');
   if(!chart||chart.input.date!=='-001999-01-01'||chart.notes!=='Retained through Windows reinstall'||chart.input.ayan!=='lahiri')throw Error('Saved Charts did not survive Windows reinstall');
   const history=await page.evaluate(()=>JSON.parse(localStorage.getItem('jyotish-studio.history.v1')));if(!history.some(c=>c.input.date==='-001999-01-01'))throw Error('History did not survive reinstall');
  }
  phase='research';
  console.log('SMOKE native Research '+process.argv[4]);
  const baseline=process.argv[4]==='baseline';
  await require('./research-native-smoke.cjs').runResearchNative(page,{
   reopen:process.argv[4]==='reopen',expectExisting:!baseline,expectLauncher:true,expectTopicPanels:!baseline
  });
  if(process.argv[4]==='verify'){
   phase='online cohort';
   console.log('SMOKE native online cohort');
   const {verifyNativeCohort,verifyNativeCombinedCohort,verifyWindowsPlanner}=require('./research-cohort-native-smoke.cjs');
   await verifyNativeCohort(app,page);
   phase='cohort and Wikidata facts';
   await verifyNativeCombinedCohort(app,page);
   phase='native planner';
   await verifyWindowsPlanner(app,page);
  }else if(process.argv[4]==='reopen'){
   phase='retained native cohort';
   const {checkStoredCohort,checkStoredCombinedCohort,verifyWindowsPlanner}=require('./research-cohort-native-smoke.cjs');
   await checkStoredCohort(page);
   await checkStoredCombinedCohort(page);
   phase='retained native planner';
   await verifyWindowsPlanner(app,page,{reopen:true});
  }
  phase='update dialog';console.log('SMOKE update dialog');await page.locator('[data-menu=Help]').click();await page.locator('[data-menu-action=check-updates]').click();await page.waitForSelector('.native-update-dialog');
  if(await page.locator('.native-update-dialog footer button').count()!==1)throw Error('Update dialog has no bottom action');await page.locator('[data-update-close]').click();
  if(errors.length)throw Error(errors.join('; '));console.log(JSON.stringify({windowsNative:true,mode:process.argv[4],appVersion:expectedVersion,offlineBce:true,localData:true,nodeDisabled:true,updaterBridge:true,releaseDialog:true}));
 }finally{phase='closing';console.log('SMOKE closing');await app.close();clearTimeout(watchdog);console.log('SMOKE closed');}
})().catch(error=>{console.error(error.stack);process.exit(1);});
