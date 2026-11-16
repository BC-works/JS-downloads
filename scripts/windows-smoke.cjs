const fs=require('node:fs'),path=require('node:path');
const {_electron}=require(process.argv[3]);
const expectedVersion=JSON.parse(fs.readFileSync('staging/manifest.json','utf8')).tag.slice(1);
(async()=>{
 const app=await _electron.launch({executablePath:process.argv[2],timeout:60000});
 try{const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.waitForSelector('#birth-form',{timeout:60000});
  if(await page.evaluate(()=>typeof require)!=='undefined')throw Error('Renderer has Node access');
  if((await page.evaluate(()=>JyotishDesktopUpdates.status())).currentVersion!==expectedVersion)throw Error('Wrong installed version');
  if(process.argv[4]==='seed'){
   await page.evaluate(async()=>{const {setDateValue}=await import('/date-entry.mjs');setDateValue('#birth-date','-001999-01-01',{notify:true});});
   await page.locator('#chart-name').fill('Windows Update Smoke');await page.locator('#birth-time').fill('12:00:00');await page.locator('#birth-form button[type=submit]').click();
   if(!(await page.locator('.status-bar').innerText()).includes('2000 BCE'))throw Error('Installed BCE calculation failed');
   await page.locator('#quick-save-calculation').click();await page.locator('#save-notes').fill('Retained through Windows reinstall');await page.locator('.modal button[type=submit]').click();
  }else{
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jyotish-studio.saved.v1'))),chart=saved.charts.find(c=>c.name==='Windows Update Smoke');
   if(!chart||chart.input.date!=='-001999-01-01'||chart.notes!=='Retained through Windows reinstall')throw Error('Saved Charts did not survive Windows reinstall');
   const history=await page.evaluate(()=>JSON.parse(localStorage.getItem('jyotish-studio.history.v1')));if(!history.some(c=>c.input.date==='-001999-01-01'))throw Error('History did not survive reinstall');
  }
  await page.locator('[data-menu=Help]').click();await page.locator('[data-menu-action=check-updates]').click();await page.waitForSelector('.native-update-dialog');
  if(await page.locator('.native-update-dialog footer button').count()!==1)throw Error('Update dialog has no bottom action');await page.locator('[data-update-close]').click();
  if(errors.length)throw Error(errors.join('; '));console.log(JSON.stringify({windowsNative:true,mode:process.argv[4],appVersion:expectedVersion,offlineBce:true,localData:true,nodeDisabled:true,updaterBridge:true,releaseDialog:true}));
 }finally{await app.close();}
})().catch(error=>{console.error(error.stack);process.exit(1);});
