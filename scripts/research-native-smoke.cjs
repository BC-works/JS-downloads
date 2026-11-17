// Run against the real packaged application, including its custom origin/worker.
async function runResearchNative(page,{reopen=false}={}){
 const original=await page.evaluate(()=>({saved:localStorage.getItem('jyotish-studio.saved.v1'),history:localStorage.getItem('jyotish-studio.history.v1'),tabs:document.querySelectorAll('[data-chart-document]').length}));
 const topic=await page.evaluate(async reopen=>{
  const {createResearchStore,addResearchMembers}=await import('/research-storage.mjs'),store=await createResearchStore();
  try{
   let summary=(await store.listProjects()).find(p=>p.name==='Native Research Smoke'),project=summary?await store.getProject(summary.id):null;
   if(reopen){if(!project||project.notes!=='Retained native Research notes'||project.pins.length!==1)throw Error('Research topic/pin did not survive app restart');const pin=await store.getPin(project.pins[0].id);if(pin.notes!=='Frozen native Research evidence')throw Error('Pinned notes were not retained');}
   if(!project){
    project=await store.createProject('Native Research Smoke');const library=JSON.parse(localStorage.getItem('jyotish-studio.saved.v1')),source=library.charts.find(c=>c.kind==='natal');if(!source)throw Error('Native Research test needs a saved chart');
    const next=addResearchMembers(project,[source]);next.notes='Retained native Research notes';project=await store.saveProject(next,{expectedRevision:project.revision});
   }
   return {id:project.id,pins:project.pins.length};
  }finally{store.close();}
 },reopen);
 await page.locator('[data-nav=research]').click();await page.locator('#research-topic').waitFor();await page.locator('#research-topic').selectOption(topic.id);
 await page.locator('#research-question').fill('Distribution of Moon signs');await page.locator('#research-query-form button[type=submit]').click();await page.locator('[data-r-action=run-review]').click();
 await page.waitForFunction(()=>!document.querySelector('.research-progress')&&document.querySelector('.research-results'),null,{timeout:60000});
 const errors=await page.locator('.research-error').allTextContents();if(errors.length)throw Error('Native Research failed: '+errors.join('; '));
 const summary=await page.locator('.research-results .research-summary').first().innerText(),eligible=await page.locator('.research-results .research-summary strong').first().innerText();if(Number(eligible)!==1)throw Error('Native Research denominator is wrong: '+JSON.stringify({summary,eligible}));
 await page.locator('[data-r-finding]').first().click();await page.locator('.research-evidence [data-r-inspect]').first().click();await page.locator('.research-inspector svg').waitFor();
 await page.locator('[data-r-inspector-division="9"]').click();if((await page.locator('.research-inspector svg').getAttribute('aria-label'))!=='D9 South Indian chart')throw Error('Native Research division inspector failed');
 await page.locator('[data-r-action=close-inspector]').click();
 if(!topic.pins){
  await page.locator('[data-r-action=pin][data-r-result=main]').click();await page.locator('#research-dialog-name').fill('Native Moon sign result');await page.locator('#research-dialog-form textarea').fill('Frozen native Research evidence');await page.locator('#research-dialog-form button[type=submit]').click();await page.waitForFunction(()=>!document.querySelector('.research-dialog'));
 }
 await page.locator('[data-nav=chart]').click();
 const after=await page.evaluate(()=>({saved:localStorage.getItem('jyotish-studio.saved.v1'),history:localStorage.getItem('jyotish-studio.history.v1'),tabs:document.querySelectorAll('[data-chart-document]').length,worker:JyotishStateDiagnostics().research.engine}));
 if(after.saved!==original.saved||after.history!==original.history||after.tabs!==original.tabs)throw Error('Research changed Saved, History or main chart tabs');
 if(after.worker.worker||after.worker.pending)throw Error('Research worker was retained after leaving the workspace');
 console.log(JSON.stringify({nativeResearch:true,reopen,customOrigin:page.url(),numericWorker:true,inspectorD9:true,pinned:true,isolatedLibraries:true,releasedWorker:true}));
}
module.exports={runResearchNative};
