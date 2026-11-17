// Run against the real packaged application, including its custom origin/worker.
async function runResearchNative(page,{reopen=false,legacy=false,expectExisting=false}={}){
 const original=await page.evaluate(()=>({saved:localStorage.getItem('jyotish-studio.saved.v1'),history:localStorage.getItem('jyotish-studio.history.v1'),tabs:JyotishStateDiagnostics().workspace.length}));
 const topic=await page.evaluate(async({reopen,expectExisting})=>{
  const {createResearchStore,addResearchMembers}=await import('/research-storage.mjs'),store=await createResearchStore();
  try{
   let summary=(await store.listProjects()).find(p=>p.name==='Native Research Smoke'),project=summary?await store.getProject(summary.id):null;
   if(reopen||expectExisting){if(!project||project.notes!=='Retained native Research notes'||project.pins.length!==1)throw Error('Research topic/pin did not survive app upgrade or restart');const pin=await store.getPin(project.pins[0].id);if(pin.notes!=='Frozen native Research evidence')throw Error('Pinned notes were not retained');}
   if(!project){
    project=await store.createProject('Native Research Smoke');const library=JSON.parse(localStorage.getItem('jyotish-studio.saved.v1')),source=library.charts.find(c=>c.kind==='natal');if(!source)throw Error('Native Research test needs a saved chart');
    const next=addResearchMembers(project,[source]);next.notes='Retained native Research notes';project=await store.saveProject(next,{expectedRevision:project.revision});
   }
   return {id:project.id,pins:project.pins.length};
  }finally{store.close();}
 },{reopen,expectExisting});
 await page.locator(legacy?'[data-nav=research]':'[data-workspace=research]').click();
 await page.locator('#research-topic').waitFor();await page.locator('#research-topic').selectOption(topic.id);
 await page.waitForFunction(()=>document.querySelector('#research-workspace')?.dataset.analysisState==='complete',null,{timeout:60000});
 if(!legacy){
  if(await page.locator('[data-workspace=research]').getAttribute('aria-pressed')!=='true')throw Error('Research is not the selected primary workspace');
  if(await page.locator('[data-chart-document],.document-tabs').count())throw Error('Chart navigation leaked into the Research workspace');
  await page.locator('#research-toolbar-slot [data-r-action=new-topic]').waitFor();
  await page.locator(`#research-topic-tabs-slot [data-r-topic-tab="${topic.id}"][aria-selected=true]`).waitFor();
 }
 await page.locator('#research-question').fill('Distribution of Moon signs');await page.locator('#research-query-form button[type=submit]').click();await page.locator('[data-r-action=run-review]').click();
 await page.waitForFunction(()=>!document.querySelector('.research-progress')&&document.querySelector('.research-results')&&document.querySelector('#research-workspace')?.dataset.analysisState==='complete',null,{timeout:60000});
 const errors=await page.locator('.research-error').allTextContents();if(errors.length)throw Error('Native Research failed: '+errors.join('; '));
 const summary=await page.locator('.research-results .research-summary').first().innerText(),eligible=await page.locator('.research-results .research-summary strong').first().innerText();if(Number(eligible)!==1)throw Error('Native Research denominator is wrong: '+JSON.stringify({summary,eligible}));
 if(await page.locator('.research-results [data-r-finding]').count()!==12)throw Error('Native Moon-sign distribution did not produce twelve categories');
 await page.locator('[data-r-finding]').first().click();await page.locator('.research-evidence [data-r-inspect]').first().click();await page.locator('.research-inspector svg').waitFor();
 await page.locator('[data-r-inspector-division="9"]').click();if((await page.locator('.research-inspector svg').getAttribute('aria-label'))!=='D9 South Indian chart')throw Error('Native Research division inspector failed');
 await page.locator('[data-r-action=close-inspector]').click();
 if(!topic.pins){
  await page.locator('[data-r-action=pin][data-r-result=main]').click();await page.locator('#research-dialog-name').fill('Native Moon sign result');await page.locator('#research-dialog-form textarea').fill('Frozen native Research evidence');await page.locator('#research-dialog-form button[type=submit]').click();await page.waitForFunction(()=>!document.querySelector('.research-dialog'));
 }
 if(!legacy){
  await page.locator(`[data-r-close-topic="${topic.id}"]`).click();
  if(await page.locator(`[data-r-topic-tab="${topic.id}"]`).count())throw Error('Research topic tab did not close');
  await page.locator('#research-topic').selectOption(topic.id);
  await page.waitForFunction(()=>document.querySelector('#research-workspace')?.dataset.analysisState==='complete',null,{timeout:60000});
  await page.locator(`[data-r-topic-tab="${topic.id}"][aria-selected=true]`).waitFor();
  const preserved=await page.evaluate(async id=>{const {createResearchStore}=await import('/research-storage.mjs'),store=await createResearchStore();try{const project=await store.getProject(id);return project?.notes==='Retained native Research notes'&&project.pins.length===1;}finally{store.close();}},topic.id);
  if(!preserved)throw Error('Closing a Research topic tab changed its saved project');
 }
 await page.locator(legacy?'[data-nav=chart]':'[data-workspace=charts]').click();
 const after=await page.evaluate(()=>({saved:localStorage.getItem('jyotish-studio.saved.v1'),history:localStorage.getItem('jyotish-studio.history.v1'),tabs:JyotishStateDiagnostics().workspace.length,worker:JyotishStateDiagnostics().research.engine,retainedEvidence:JyotishStateDiagnostics().research.workspace.retainedEvidenceCharts,retainedMembers:JyotishStateDiagnostics().research.workspace.retainedMemberSnapshots}));
 if(after.saved!==original.saved||after.history!==original.history||after.tabs!==original.tabs)throw Error('Research changed Saved, History or main chart tabs');
 if(after.worker.worker||after.worker.pending||after.retainedEvidence!==0||after.retainedMembers!==0)throw Error('Research worker or evidence was retained after leaving the workspace');
 console.log(JSON.stringify({nativeResearch:true,reopen,legacy,expectExisting,customOrigin:page.url(),numericWorker:true,inspectorD9:true,pinned:true,primaryWorkspace:!legacy,topicTabs:!legacy,isolatedLibraries:true,releasedWorker:true}));
}
module.exports={runResearchNative};
