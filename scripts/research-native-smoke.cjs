// Run against the real packaged application, including its custom origin/worker.
async function openLabLauncher(page,{allowResume=true}={}){
 await page.locator('[data-workspace=research-lab]').click();
 const prompt=page.locator('#research-cohort-prompt');
 if(allowResume){
  const activeTopic=page.locator('[data-r-action=close-lab-topic]').or(page.locator('#research-question'));
  await prompt.or(activeTopic).first().waitFor();
  if(!await prompt.isVisible()){
   const close=page.locator('[data-r-action=close-lab-topic]');
   if(await close.isVisible())await close.click();
   else{
    const collapsed=page.locator('#research-lab-topics-toggle[aria-expanded=false]');
    if(await collapsed.isVisible())await collapsed.click();
    await page.locator('#research-lab-new-topic').click();
   }
  }
 }
 await prompt.waitFor();
 await page.locator('#research-lab-topics').waitFor();
}

async function verifyLabTopicPanels(page,topicId,{notes}){
 const tabs=page.getByRole('tablist',{name:/research lab|topic views/i}).filter({has:page.getByRole('tab',{name:'Main',exact:true})});
 const main=page.getByRole('tab',{name:'Main',exact:true});
 const notesTab=page.getByRole('tab',{name:'Notes',exact:true});
 const addData=page.locator('.research-members #research-add-data');
 const right=page.locator('.research-lab-toolbar-right');
 const close=page.locator('[data-r-action=close-lab-topic]');
 await main.waitFor();
 if(await tabs.count()!==1||await main.getAttribute('aria-selected')!=='true')throw Error('The Research Lab topic did not open on Main');
 await addData.waitFor();
 await right.locator('[data-r-action=edit-topic-notes]').waitFor();
 for(const action of ['topic-settings','import-backup','export-project'])await right.locator(`[data-r-action=${action}]`).waitFor();
 const [leftBox,rightBox]=await Promise.all([addData.boundingBox(),right.boundingBox()]);
 if(!leftBox||!rightBox||leftBox.x+leftBox.width>=rightBox.x)throw Error('Research Lab data and topic controls are not on their expected sides');
 await notesTab.click();
 if(await notesTab.getAttribute('aria-selected')!=='true')throw Error('Notes tab did not become active');
 const textarea=page.locator('#research-topic-notes');
 await textarea.waitFor();
 if(await textarea.inputValue()!==notes)throw Error('Research Lab did not preserve topic notes');
 await page.locator('#research-question').waitFor({state:'hidden'});
 await main.click();
 await page.locator('#research-question').waitFor();
 await textarea.waitFor({state:'hidden'});
 await close.click();
 await page.getByRole('heading',{name:'JyotishGPT',exact:true}).waitFor();
 if(!page.url().endsWith('#research-lab'))throw Error('Closing the topic left Research Lab');
 await page.locator('#research-question').waitFor({state:'hidden'});
 await page.locator(`[data-r-lab-topic="${topicId}"]`).click();
 await page.locator('#research-question').waitFor();
}

async function runClassicResearchNative(page,{reopen=false,legacy=false,expectExisting=false}={}){
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

async function runLabResearchNative(page,{reopen=false,expectExisting=false,expectLegacyPin=false,expectLauncher=false,expectTopicPanels=false}={}){
 const title='Native Research Smoke',datasetTitle='Native CSV evidence';
 const question='Distribution of Moon signs where Minutes played >= 10';
 const original=await page.evaluate(()=>({
  saved:localStorage.getItem('jyotish-studio.saved.v1'),
  history:localStorage.getItem('jyotish-studio.history.v1'),tabs:JyotishStateDiagnostics().workspace.length
 }));
 const topic=await page.evaluate(async({title,question,reopen,expectExisting,expectLegacyPin})=>{
  const {createResearchStore,addResearchMembers}=await import('/research-storage.mjs');
  const store=await createResearchStore();
  try{
   const summary=(await store.listProjects()).find(project=>project.name===title);
   let project=summary?await store.getProject(summary.id):null;
   if((reopen||expectExisting)&&!project)throw Error('Research topic did not survive startup');
   if(!project){
    const library=JSON.parse(localStorage.getItem('jyotish-studio.saved.v1'));
    const source=library.charts.find(chart=>chart.kind==='natal');
    if(!source)throw Error('Native Research test needs a saved chart');
    project=await store.createProject(title);
    const next=addResearchMembers(project,[source]);
    next.notes='Retained native Research notes';
    project=await store.saveProject(next,{expectedRevision:project.revision});
   }
   if(project.notes!=='Retained native Research notes'||project.members.length!==1)throw Error('Research topic data changed');
   if(expectLegacyPin){
    if(project.pins.length!==1)throw Error('Previous installer pin was not retained');
    const pin=await store.getPin(project.pins[0].id);
    if(pin.notes!=='Frozen native Research evidence')throw Error('Pinned evidence was not retained');
   }
   const priorResult=(await store.listPromptResults(project.id)).find(prompt=>prompt.query===question);
   if((reopen||expectExisting&&!expectLegacyPin)&&!priorResult)throw Error('Saved Research Lab result did not survive startup');
   return {id:project.id,memberId:project.members[0].id,priorResultId:priorResult?.id};
  }finally{store.close();}
 },{title,question,reopen,expectExisting,expectLegacyPin});

 await page.locator('[data-workspace=research]').click();
 await page.locator(`[data-r-library-topic="${topic.id}"]`).click();
 await page.locator('#continue-research').waitFor();
 if(await page.locator('#research-question').count())throw Error('Research Library exposed the Lab prompt');
 if(expectLegacyPin){
  await page.locator('[data-r-library-view=analyses]').click();
  await page.getByRole('button',{name:'Native Moon sign result'}).click();
  await page.getByText('Frozen native Research evidence',{exact:true}).waitFor();
 }
 await page.locator('#continue-research').click();
 await page.locator('#research-question').waitFor();
 const labTopic=page.locator(`[data-r-lab-topic="${topic.id}"]`);
 const hasLauncher=await page.locator('#research-lab-topics').count()>0;
 if(expectLauncher&&!hasLauncher)throw Error('Expected native Research Lab launcher and topic list');
 if(hasLauncher)await page.locator('#research-lab-topics-toggle[aria-expanded=false]').waitFor();
 else{
  await page.locator(`#research-topic-tabs-slot [data-r-topic-tab="${topic.id}"][aria-selected=true]`).waitFor();
 }
 await page.locator('[data-workspace=research-lab][aria-pressed=true]').waitFor();
 await page.locator('#research-question').waitFor();
 if(await page.locator('[data-chart-document],.document-tabs').count())throw Error('Chart navigation leaked into Research Lab');

 if(!topic.priorResultId){
  await page.locator('#research-add-data').click();
  const dialog=page.getByRole('dialog',{name:'Add data'});
  await dialog.locator('#research-data-csv').setInputFiles({
   name:'native-csv-evidence.csv',mimeType:'text/csv',buffer:Buffer.from(`person_id,Minutes played\n${topic.memberId},42\n`)
  });
  await dialog.locator('#research-data-title').fill(datasetTitle);
  await dialog.getByRole('button',{name:'Review matches'}).click();
  await dialog.getByRole('button',{name:'Attach dataset'}).click();
  await dialog.locator('.research-data-attached strong').filter({hasText:datasetTitle}).waitFor();
  await dialog.getByRole('button',{name:'Close Add data'}).click();
  await page.locator('#research-question').fill(question);
  await page.locator('#research-query-form button[type=submit]').click();
  await page.locator('.research-data-review').waitFor();
  await page.locator('[data-r-action=run-review]').click();
 }
 const savedQuestion=page.locator('.research-prompt-history [data-r-prompt]').filter({hasText:question});
 await savedQuestion.waitFor({timeout:60000});
 const savedId=await savedQuestion.getAttribute('data-r-prompt');
 if(topic.priorResultId&&savedId!==topic.priorResultId)throw Error('Research Lab replaced the saved result during upgrade');
 await savedQuestion.click();
 await page.locator('.research-results-data').waitFor();
 const evidence=await page.evaluate(async({topicId,savedId,datasetTitle})=>{
  const {createResearchStore}=await import('/research-storage.mjs'),store=await createResearchStore();
  try{
   const report=await store.getPromptResult(topicId,savedId);
   const datasets=await store.listResearchDatasets(topicId);
   const source=report.result.context.data.sources[0];
   return {
    eligible:report.result.eligible,matched:report.result.context.data.matched,
    dataset:datasets.some(dataset=>dataset.title===datasetTitle&&dataset.id===source.id&&dataset.version===source.version)
   };
  }finally{store.close();}
 },{topicId:topic.id,savedId,datasetTitle});
 if(evidence.eligible!==1||evidence.matched!==1||!evidence.dataset)throw Error('Native CSV evidence did not persist: '+JSON.stringify(evidence));
 if(await page.locator('.research-results [data-r-finding]').count()!==12)throw Error('Native Moon-sign distribution did not produce twelve categories');
 const errors=await page.locator('.research-error').allTextContents();
 if(errors.length)throw Error('Native Research failed: '+errors.join(' · '));

 await page.locator(`.research-members [data-r-inspect="${topic.memberId}"]`).click();
 await page.locator('.research-inspector svg').waitFor();
 await page.locator('[data-r-inspector-division="9"]').click();
 await page.locator('.research-inspector svg[aria-label="D9 South Indian chart"]').waitFor();
 await page.locator('.research-inspector-positions').waitFor();
 await page.locator('[data-r-action=close-inspector]').click();
 if(expectTopicPanels)await verifyLabTopicPanels(page,topic.id,{notes:'Retained native Research notes'});
 else if(hasLauncher){
  await page.locator('#research-lab-topics-toggle').click();
  await labTopic.waitFor();
  await labTopic.click();
  await page.locator('#research-lab-topics-toggle[aria-expanded=false]').waitFor();
 }else{
  await page.locator(`[data-r-close-topic="${topic.id}"]`).click();
  await page.locator(`[data-r-topic-tab="${topic.id}"]`).waitFor({state:'detached'});
  await page.locator('#research-topic').selectOption(topic.id);
  await page.locator(`[data-r-topic-tab="${topic.id}"][aria-selected=true]`).waitFor();
 }
 await page.locator(`[data-r-prompt="${savedId}"]`).waitFor();

 await page.locator('[data-workspace=charts]').click();
 const after=await page.evaluate(()=>({
  saved:localStorage.getItem('jyotish-studio.saved.v1'),
  history:localStorage.getItem('jyotish-studio.history.v1'),tabs:JyotishStateDiagnostics().workspace.length,
  worker:JyotishStateDiagnostics().research.engine,retainedEvidence:JyotishStateDiagnostics().research.workspace.retainedEvidenceCharts,
  retainedMembers:JyotishStateDiagnostics().research.workspace.retainedMemberSnapshots
 }));
 if(after.saved!==original.saved||after.history!==original.history||after.tabs!==original.tabs)throw Error('Research changed Saved, History or main chart tabs');
 if(after.worker.worker||after.worker.pending||after.retainedEvidence!==0||after.retainedMembers!==0)throw Error('Research retained the worker or chart evidence on exit');
 console.log(JSON.stringify({nativeResearchLab:true,reopen,numericWorker:true,customOrigin:page.url(),
  csvFilter:true,datasetVersionRetained:true,inspectorD9:true,savedQuestionRetained:!!topic.priorResultId,
  legacyPinRetained:expectLegacyPin,desktopLauncher:hasLauncher,topicPanels:expectTopicPanels,releasedWorker:true}));
}

async function runResearchNative(page,options={}){
 return await page.locator('[data-workspace=research-lab]').count()
  ?runLabResearchNative(page,options)
  :runClassicResearchNative(page,options);
}
module.exports={runResearchNative,openLabLauncher,verifyLabTopicPanels};
