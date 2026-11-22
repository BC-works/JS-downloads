// The upgrade runner creates this topic with the previous installer, then uses
// the new UI to repair its missing chart and save a follow-up on one finding.
const topicName='Native birth correction and follow-up';
const sourceId='qa:missing-place';
const parentQuery='Distribution of Moon signs';
const childQuery='Distribution of Sun signs';

async function seedBirthTopic(page){
 await page.evaluate(async({topicName,sourceId})=>{
  const {createResearchStore,addResearchCohortProject}=await import('/research-storage.mjs');
  const store=await createResearchStore();
  const url='https://example.org/native-research-register';
  try{
   if((await store.listProjects()).some(item=>item.name===topicName))throw Error('The baseline profile already has the correction fixture');
   const input={name:'Atlas Example',date:'1990-05-15',time:'10:30:00',city:'New Delhi',lat:28.6139,lon:77.209,tz:'Asia/Kolkata',timeKnown:true};
   await addResearchCohortProject(store,{title:topicName,members:[{personId:'qa:charted',name:input.name,input}],cohort:{
    prompt:'Research native test roster',criteria:{title:topicName,description:'Two synthetic records for an upgrade test.'},
    sources:[{label:'Test register',url}],stats:{discovered:2,charted:1,knownTimes:1,unknownTimes:0,missingPlaces:1},complete:true,
    omitted:[{name:'Nova Example',personId:sourceId,birthDate:'1963-02-17',sourceUrl:url,reason:'Birthplace or time zone could not be verified'}],
   }});
  }finally{store.close();}
 },{topicName,sourceId});
}

async function savedState(page){
 return page.evaluate(async({topicName,sourceId,parentQuery,childQuery})=>{
  const {createResearchStore}=await import('/research-storage.mjs');
  const store=await createResearchStore();
  try{
   const entry=(await store.listProjects()).find(p=>p.name===topicName);
   if(!entry)throw Error('Upgrading lost the existing topic');
   const project=await store.getProject(entry.id);
   const member=project.members.find(m=>m.sourcePersonId===sourceId);
   const prompts=await store.listPromptResults(entry.id);
   const reports=await Promise.all(prompts.filter(p=>[parentQuery,childQuery].includes(p.query)).map(p=>store.getPromptResult(entry.id,p.id)));
   const parent=reports.find(p=>p.query===parentQuery);
   const child=reports.find(p=>p.query===childQuery);
   return {topicId:entry.id,charted:project.members.length,omitted:project.cohort.omitted.length,member:member&&{time:member.input.time,known:member.input.timeKnown,zone:member.input.tz,date:member.input.date},
    parentId:parent?.id,child:child&&{parentId:child.lineage?.parentId,scope:child.lineage?.count,charted:child.members.length,eligible:child.result.eligible}};
  }finally{store.close();}
 },{topicName,sourceId,parentQuery,childQuery});
}

async function ask(page,question){
 await page.locator('#research-question').fill(question);
 await page.locator('#research-query-form button[type=submit]').click();
 await page.locator('.research-review [data-r-action="run-review"]').waitFor();
}

async function checkBirthTopic(page,{reopen=false}={}){
 const before=await savedState(page);
 if(!reopen){
  if(before.charted!==1||before.omitted!==1)throw Error('The original unresolved identity was not retained');
  await page.locator('[data-workspace=research]').click();
  await page.locator(`[data-r-library-topic="${before.topicId}"]`).click();
  await page.locator('#continue-research').click();
  await page.locator(`[data-r-action="roster-data"][data-r-person="${sourceId}"]`).click();
  await page.locator('[data-r-action="edit-birth-details"]').click();
  const editor=page.locator('dialog.research-birth-editor');
  await editor.waitFor();
  await editor.locator('#rb-city').fill('Brooklyn, New York');
  const coords=editor.locator('[data-rb-coordinates]');
  if(!await coords.evaluate(e=>e.open))await coords.locator('summary').click();
  await editor.locator('#rb-lat').fill('40.6501');
  await editor.locator('#rb-lon').fill('-73.94958');
  await editor.locator('#rb-tz').fill('America/New_York');
  await editor.locator('#rb-time-known').check();
  await editor.locator('#rb-time').fill('13:43');
  await editor.locator('#rb-source-note').fill('Synthetic birth record entered during the installer test.');
  await editor.locator('[data-rb-save]').click();
  await editor.waitFor({state:'detached'});
  const details=page.getByRole('dialog',{name:'People and properties'});
  if(await details.isVisible())await details.getByRole('button',{name:'Close dialog'}).click();
  await ask(page,parentQuery);
  await page.locator('[data-r-action="run-review"]').click();
  const bars=page.locator('.research-results [data-r-finding]');
  await bars.first().waitFor();
  await bars.first().click();
  await page.locator('[data-r-action="followup-finding"]').click();
  const count=await page.locator('[data-r-followup-scope]').getAttribute('data-r-followup-count');
  if(count!=='1')throw Error('The category follow-up should contain exactly one chart');
  await ask(page,childQuery);
  await page.locator('.research-review [data-r-followup-review]').waitFor();
  await page.locator('[data-r-action="run-review"]').click();
  await page.locator('[data-r-followup-origin]').waitFor();
 }
 const state=await savedState(page);
 if(state.charted!==2||state.omitted!==0||!state.member?.known||!state.member.time.startsWith('13:43')||
    state.member.date!=='1963-02-17'||state.member.zone!=='America/New_York'||!state.parentId||
    state.child?.parentId!==state.parentId||state.child.scope!==1||state.child.charted!==1||state.child.eligible!==1){
  throw Error('Research correction or scoped answer did not survive: '+JSON.stringify(state));
 }
 console.log(JSON.stringify({nativeBirthAndFollowup:true,reopen,topicCharts:state.charted,chartedAfterManualEdit:true,childCharts:state.child.charted,parentLinked:true}));
 await page.locator('[data-workspace=charts]').click();
}
module.exports={seedBirthTopic,checkBirthTopic};
