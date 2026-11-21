// Exercise the native cohort endpoint with bounded public-record fixtures.
const {openLabLauncher}=require('./research-native-smoke.cjs');
const cohortEndpoint='/api/research/cohort';
const exampleTitle='U.S. presidents';
const fixtureName='Native fixture president';
const modelPrompt='Please find everyone who occupied the top elected office in the United States';
const fakeKey='sk-native-smoke-fake-key';
const combinedTopic='UK prime ministers';
const combinedFixture='Native fixture officeholder';
const combinedDataPrompt='Occupations';
const combinedAnalysis='Distribution of Moon signs where Occupations contains "Lawyer"';
const combinedNote='Retain these cohort notes through archive and restart';

async function checkStoredCohort(page){
 const topic=await page.evaluate(async title=>{
  const {createResearchStore}=await import('/research-storage.mjs'),store=await createResearchStore();
  try{
   const summary=(await store.listProjects()).find(item=>item.name===title);
   return summary?await store.getProject(summary.id):null;
  }finally{store.close();}
 },exampleTitle);
 const member=topic?.members[0];
 if(topic?.members.length!==1||topic?.cohort?.stats.discovered!==2||topic.cohort.stats.missingDates!==1||
    member?.name!==fixtureName||member.input.date!=='1980-01-01'||member.input.tz!=='Pacific/Honolulu'||
    member.input.time!=='12:00:00'||member.input.timeKnown!==false){
  throw Error('Native cohort and unknown-time chart were not saved correctly');
 }
}

async function verifyNativeOrbitAssets(page){
 const images=await page.evaluate(async()=>{
  return Promise.all(['orbital-sky','orbital-strip','lotus-wordmark'].map(async name=>{
   const image=new Image();
   image.src='/assets/research/'+name+'.webp';
   await image.decode();
   return [name,image.naturalWidth,image.naturalHeight];
  }));
 });
 if(images.some(([,width,height])=>width<=0||height<=0))throw Error('The packaged research artwork could not be decoded');
}

async function savedResearchTopics(page){
 return page.evaluate(async()=>{
  const {createResearchStore}=await import('/research-storage.mjs');
  const store=await createResearchStore();
  try{return (await store.listProjects()).map(topic=>topic.id).sort();}
  finally{store.close();}
 });
}

async function approveCollection(page,fixture){
 const before=await savedResearchTopics(page);
 const example=page.locator('.research-cohort-example');
 await example.getByText(fixture,{exact:false}).first().waitFor();
 await example.locator('a[href^="https://"]').first().waitFor();
 await page.locator('#research-cohort-confirm').click();
 const report=page.locator('.research-collection-preview');
 await report.waitFor({timeout:60000});
 if(JSON.stringify(before)!==JSON.stringify(await savedResearchTopics(page)))throw Error('A Research topic was saved before accepting the collection report');
 await page.locator('#research-cohort-start').click();
 await page.locator('#research-question').waitFor({timeout:60000});
}

async function verifyNativeCohort(app,page){
 const request=async payload=>page.evaluate(async({endpoint,payload})=>{
  const response=await fetch(endpoint,{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
  });
  return {status:response.status,body:await response.json()};
 },{endpoint:cohortEndpoint,payload});
 const invalid=await request({action:'page',criteria:{id:'unrecognized'},cursor:null});
 if(invalid.status!==422||!invalid.body.error)throw Error('Native cohort endpoint did not validate criteria: '+JSON.stringify(invalid));
 await app.evaluate((_,fixtureName)=>{
  const original=globalThis.fetch;
  const value=value=>({value}),entity=id=>value('http://www.wikidata.org/entity/'+id);
  globalThis.nativeResearchFixture={original,calls:0};
  globalThis.fetch=async(input,init)=>{
   const target=new URL(input instanceof Request?input.url:input);
   if(target.origin!=='https://query.wikidata.org'||target.pathname!=='/sparql')return original(input,init);
   if(!target.searchParams.get('query')?.includes('wd:Q11696'))throw Error('Unexpected public request in the cohort smoke');
   globalThis.nativeResearchFixture.calls++;
   return Response.json({results:{bindings:[{
    person:entity('Q1000991'),name:value(fixtureName),date:value('1980-01-01T00:00:00Z'),
    place:entity('Q18094'),placeName:value('Honolulu'),point:value('Point(-157.8583 21.3069)'),
    tz:value('Pacific/Honolulu'),cc:value('US')
   },{person:entity('Q1000992'),name:value('Native fixture missing birth date')}]}});
  };
 },fixtureName);
 try{
  const savedCharts=()=>page.evaluate(()=>({
   saved:localStorage.getItem('jyotish-studio.saved.v1'),history:localStorage.getItem('jyotish-studio.history.v1')
  }));
  const before=await savedCharts();
  await openLabLauncher(page);
  await verifyNativeOrbitAssets(page);
  await page.locator('#research-cohort-prompt').fill('Find all U.S. presidents');
  await page.locator('#research-cohort-form button[type=submit]').click();
  await approveCollection(page,fixtureName);
  await page.getByText(fixtureName,{exact:true}).first().waitFor();
  await checkStoredCohort(page);
  if(JSON.stringify(before)!==JSON.stringify(await savedCharts()))throw Error('Native cohort creation changed Saved Charts or History');
  const calls=await app.evaluate(()=>globalThis.nativeResearchFixture.calls);
  if(calls<2)throw Error('The native endpoint must verify a source example before collecting the roster');
  await page.locator('[data-workspace=charts]').click();
  console.log(JSON.stringify({nativeOnlineCohort:true,reviewed:true,fixtureRecords:2,charted:1,upstreamCalls:calls}));
 }finally{
  await app.evaluate(()=>{
   globalThis.fetch=globalThis.nativeResearchFixture.original;
   delete globalThis.nativeResearchFixture;
  });
 }
}

async function getCombinedEvidence(page,{archived=false}={}){
 return page.evaluate(async({combinedTopic,combinedFixture,combinedAnalysis,combinedNote,archived})=>{
  const {createResearchStore}=await import('/research-storage.mjs');
  const store=await createResearchStore();
  try{
   const matches=(await store.listProjects({archived})).filter(topic=>topic.name===combinedTopic);
   if(matches.length!==1)throw Error('Expected one retained officeholder topic');
   const {id}=matches[0],topic=await store.getProject(id);
   const member=topic.members.find(person=>person.name===combinedFixture);
   if(!member||member.sourcePersonId!=='Q1000993'||member.input.timeKnown!==false)throw Error('The joined officeholder must retain their public ID and unknown-time chart qualification');
   if(topic.notes!==combinedNote||Boolean(topic.archivedAt)!==archived)throw Error('The combined topic did not retain its notes or archive state');
   const data=await store.getResearchDatasets(id);
   if(data.length!==1||!data[0].fields.some(field=>field.key==='occupation'))throw Error('The reviewed Wikidata dataset did not stay attached');
   const joined=data[0].records.find(record=>record.memberId===member.id);
   if(joined?.values.occupation!=='Lawyer')throw Error('The saved occupation does not belong to the fixture officeholder');
   const notes=await store.listPromptResults(id),summary=notes.find(item=>item.query===combinedAnalysis);
   if(!summary)throw Error('No retained question for the imported dataset');
   const report=await store.getPromptResult(id,summary.id);
   const scope=report.result.context.data;
   if(scope.matched!==1||report.result.eligible!==1||report.result.context.birthTime.unknownIncluded!==1||
      scope.sources[0]?.id!==data[0].id||scope.sources[0]?.version!==data[0].version){
    throw Error('The retained query did not use the reviewed dataset or chart eligibility rules');
   }
   return {topicId:id,resultId:summary.id,dataVersion:data[0].version};
  }finally{store.close();}
 },{combinedTopic,combinedFixture,combinedAnalysis,combinedNote,archived});
}

async function checkStoredCombinedCohort(page){
 const stored=await getCombinedEvidence(page,{archived:true});
 await openLabLauncher(page);
 const archive=page.locator('details.research-topic-archive:visible');
 const row=archive.locator(`[data-r-archived-topic="${stored.topicId}"]`);
 if(await archive.getAttribute('open')===null)await archive.locator('summary').click();
 await row.getByRole('button',{name:'Restore '+combinedTopic,exact:true}).click();
 await row.waitFor({state:'detached'});
 await page.locator('#research-lab-topics').getByRole('button',{name:combinedTopic,exact:true}).click();
 await page.locator('.research-prompt-history [data-r-prompt]').filter({hasText:combinedAnalysis}).click();
 await page.locator('.research-results-data').getByText('Wikidata biographical facts',{exact:false}).first().waitFor();
 const restored=await getCombinedEvidence(page);
 if(JSON.stringify(stored)!==JSON.stringify(restored))throw Error('Restoring the archived cohort changed its result or dataset reference');
 await page.locator('[data-workspace=charts]').click();
}

async function verifyNativeCombinedCohort(app,page){
 const invalid=await page.evaluate(async()=>await (await fetch('/api/research/wikidata?ids=invalid&props=claims')).status);
 if(invalid!==400)throw Error('Packaged desktop did not register or validate its facts endpoint');
 await app.evaluate(({app},fixtureName)=>{
  const original=globalThis.fetch;
  const require=process.getBuiltinModule('node:module').createRequire(app.getAppPath()+'/package.json');
  const {createWikidataBackend}=require('./wikidata-backend.cjs');
  const calls=[];
  const factsTransport=createWikidataBackend({version:app.getVersion(),fetchFn:async input=>{
   const target=new URL(input);
   const props=target.searchParams.get('props'),ids=target.searchParams.get('ids')?.split('|').sort();
   if(target.origin!=='https://www.wikidata.org'||target.pathname!=='/w/api.php'||target.searchParams.get('action')!=='wbgetentities'){
    throw Error('Unexpected facts provider request');
   }
   calls.push([props,ids]);
   if(props==='claims'){
    const claim=id=>({claims:{P106:[{rank:'normal',mainsnak:{
     snaktype:'value',datavalue:{value:{'entity-type':'item',id}}
    }}]}});
    return Response.json({entities:{Q1000993:claim('Q1601'),Q1000994:claim('Q1602')}});
   }
   return Response.json({entities:{Q1601:{labels:{en:{value:'Lawyer'}}},Q1602:{labels:{en:{value:'Historian'}}}}});
  }});
  globalThis.nativeCombinedFixture={original,calls,factsTransport};
  const bindings=[
   ['Q1000993',fixtureName,'1980-01-01T00:00:00Z'],
   ['Q1000994','Native fixture former officeholder','1981-01-01T00:00:00Z'],
  ].map(([id,name,date])=>Object.fromEntries(Object.entries({
   person:'http://www.wikidata.org/entity/'+id,name,date,
   place:'http://www.wikidata.org/entity/Q18094',placeName:'Honolulu',
   point:'Point(-157.8583 21.3069)',tz:'Pacific/Honolulu',cc:'US',sampleOccupation:'Lawyer'
  }).map(([key,value])=>[key,{value}])));
  globalThis.fetch=async(input,init)=>{
   const target=new URL(input instanceof Request?input.url:input);
   if(target.origin!=='https://query.wikidata.org'||target.pathname!=='/sparql')return original(input,init);
   if(!target.searchParams.get('query')?.includes('wd:Q14211'))throw Error('Unexpected officeholder search during combined fixture');
   calls.push('officeholders');return Response.json({results:{bindings}});
  };
 },combinedFixture);
 await page.exposeFunction('loadNativeWikidataFixture',url=>app.evaluate(async(_,requestUrl)=>{
  const response=await globalThis.nativeCombinedFixture.factsTransport(new Request(requestUrl));
  return {status:response.status,body:await response.json()};
 },url));
 await page.evaluate(()=>{
  const original=globalThis.fetch;
  globalThis.nativeCombinedRendererFetch=original;
  globalThis.fetch=async(input,init)=>{
   const target=new URL(input instanceof Request?input.url:input,location.href);
   if(target.protocol!=='jyotish:'||target.pathname!=='/api/research/wikidata')return original(input,init);
   const reply=await globalThis.loadNativeWikidataFixture(target.href);
   return Response.json(reply.body,{status:reply.status});
  };
 });
 try{
  await openLabLauncher(page);
  await page.locator('#research-cohort-prompt').fill('All UK prime ministers');
  await page.locator('#research-cohort-data-toggle').click();
  await page.locator('#research-cohort-data-prompt').fill(combinedDataPrompt);
  await page.locator('#research-cohort-form button[type=submit]').click();
  await page.locator('.research-cohort-data-review').getByText('Occupations',{exact:false}).first().waitFor();
  await approveCollection(page,combinedFixture);
  await page.getByText(combinedFixture,{exact:true}).first().waitFor();
  await page.locator('#research-question').fill(combinedAnalysis);
  await page.locator('#research-query-form button[type=submit]').click();
  await page.locator('.research-data-review').waitFor();
  await page.locator('[data-r-action=run-review]').click();
  await page.locator('.research-results-data').waitFor({timeout:60000});
  await page.getByRole('tab',{name:'Notes',exact:true}).click();
  await page.getByRole('tabpanel',{name:'Notes'}).getByRole('textbox',{name:'Topic notes'}).fill(combinedNote);
  await page.getByRole('button',{name:'Save notes',exact:true}).click();
  await page.getByText('Topic notes saved.',{exact:true}).waitFor();
  const saved=await getCombinedEvidence(page);
  const calls=await app.evaluate(()=>globalThis.nativeCombinedFixture.calls);
  const fullFacts=calls.some(call=>Array.isArray(call)&&call[0]==='claims'&&call[1].includes('Q1000993')&&call[1].includes('Q1000994'));
  if(calls.filter(call=>call==='officeholders').length<2||!fullFacts)throw Error('The native import did not verify a sample and collect the reviewed roster and facts: '+JSON.stringify(calls));
  await page.getByRole('button',{name:'Archive topic',exact:true}).click();
  await page.getByRole('dialog',{name:'Archive this topic?'}).getByRole('button',{name:'Archive topic',exact:true}).click();
  await page.getByRole('heading',{name:'JyotishGPT',exact:true}).waitFor();
  await page.locator(`[data-r-archived-topic="${saved.topicId}"]`).waitFor();
  const archived=await getCombinedEvidence(page,{archived:true});
  if(JSON.stringify(saved)!==JSON.stringify(archived))throw Error('Archiving changed the cohort analysis or attached data');
  await page.locator('[data-workspace=charts]').click();
  console.log(JSON.stringify({nativeCombinedCohort:true,combinedReview:true,factsFiltered:true,archivedForRestart:true,fixtureSourceCalls:calls}));
 }finally{
  await page.evaluate(()=>{
   globalThis.fetch=globalThis.nativeCombinedRendererFetch;
   delete globalThis.nativeCombinedRendererFetch;
  });
  await app.evaluate(()=>{
   globalThis.fetch=globalThis.nativeCombinedFixture.original;
   delete globalThis.nativeCombinedFixture;
  });
 }
}

async function verifyWindowsPlannerMigration(app,page,baseline){
 if(!baseline)await app.evaluate(()=>{
  globalThis.originalMigrationFetch=globalThis.fetch;
  globalThis.fetch=async(url,init)=>{
   if(String(url)!=='https://api.openai.com/v1/models'||new Headers(init?.headers).get('Authorization')!=='Bearer sk-legacy-migration-test-credential'){
    throw Error('Legacy credential could not be used to list account models');
   }
   return Response.json({object:'list',data:[{id:'gpt-4.1',object:'model',created:1744415210,owned_by:'system'}]});
  };
 });
 let result;
 try{
  result=await page.evaluate(async baseline=>{
  const bridge=globalThis.JyotishDesktopResearchModel;
  if(baseline){
   return bridge.save({apiKey:'sk-legacy-migration-test-credential',model:'gpt-4.1'});
  }
  const before=await bridge.status();
  const account=await bridge.models(true);
  if(!account.verified||!account.options.some(option=>option.id==='gpt-4.1'))throw Error('Migrated credential could not be unlocked');
  await bridge.remove();
  if((await bridge.status()).configured)throw Error('Legacy key could not be removed');
  return before;
  },baseline);
 }finally{
  if(!baseline)await app.evaluate(()=>{globalThis.fetch=globalThis.originalMigrationFetch;delete globalThis.originalMigrationFetch;});
 }
 if(!result.available||!result.configured||result.model!=='gpt-4.1'||Object.keys(result).length!==3){
  throw Error('Encrypted legacy planner settings did not survive the installer upgrade');
 }
 console.log(JSON.stringify({legacyPlannerKey:true,phase:baseline?'seed':'verify'}));
}

async function installWindowsPlannerFixture(app,model){
 await app.evaluate((_,{fakeKey,prompt,model})=>{
  const fixture={original:globalThis.fetch,models:0,plans:0};
  globalThis.nativeModelFixture=fixture;
  globalThis.fetch=async(input,init)=>{
   const target=input instanceof Request?input.url:String(input);
   const authorization=new Headers(init?.headers).get('Authorization');
   if(target==='https://api.openai.com/v1/models'){
    if(init?.method!=='GET'||authorization!=='Bearer '+fakeKey||init.redirect!=='error')throw Error('Unexpected account model listing request');
    fixture.models++;
    return Response.json({object:'list',data:[model,'gpt-5-mini','text-embedding-3-small'].map(id=>({
     id,object:'model',created:1744415210,owned_by:'system'
    }))});
   }
   if(new URL(target).hostname==='query.wikidata.org'){
    const sample=Object.fromEntries(Object.entries({
     person:'http://www.wikidata.org/entity/Q1000991',name:'Native fixture president',date:'1980-01-01T00:00:00Z'
    }).map(([key,value])=>[key,{value}]));
    return Response.json({results:{bindings:[sample]}});
   }
   if(target!=='https://api.openai.com/v1/responses')throw Error('Unexpected upstream request during model review');
   const body=JSON.parse(init.body);
   if(init.method!=='POST'||authorization!=='Bearer '+fakeKey||body.model!==model||body.input!==prompt||body.store!==false){
    throw Error('Research did not use the exact selected account model');
   }
   fixture.plans++;
   const plan={kind:'named',id:'us-presidents',group:null,occupation:null,relation:null,entity:null,country:null,message:null};
   return Response.json({status:'completed',output:[{
    type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(plan)}]
   }]});
  };
 },{fakeKey,prompt:modelPrompt,model});
}

async function verifyWindowsPlanner(app,page,{reopen=false}={}){
 if(process.platform!=='win32')return;
 const model='gpt-4.1-nano';
 await installWindowsPlannerFixture(app,model);
 try{
  await openLabLauncher(page);
  await page.locator('[data-r-action=planner-settings]').click();
  const dialog=page.getByRole('dialog',{name:'JyotishGPT settings'});
  const key=dialog.getByLabel('OpenAI API key',{exact:true});
  const choice=dialog.getByLabel('Research model',{exact:true});
  const accountModel=choice.locator('option[value="'+model+'"]');
  if(!reopen){
   if((await page.evaluate(()=>JyotishDesktopResearchModel.status())).configured)throw Error('Unexpected saved key before Windows model setup');
   await key.fill(fakeKey);
   await dialog.getByRole('button',{name:'Save key',exact:true}).click();
   await accountModel.waitFor({state:'attached'});
   await choice.locator('option[value="text-embedding-3-small"]').waitFor({state:'attached'});
   if((await page.evaluate(()=>JyotishDesktopResearchModel.status())).model!==null)throw Error('A first key must wait for an explicit research model');
   await choice.selectOption(model);
   await dialog.getByRole('button',{name:'Save changes',exact:true}).click();
   await page.waitForFunction(async model=>(await JyotishDesktopResearchModel.status()).model===model,model);
  }else{
   await accountModel.waitFor({state:'attached'});
   if(await choice.inputValue()!==model)throw Error('Selected account model did not survive restart');
  }
  if(await key.inputValue())throw Error('The saved key remained in the renderer input');
  const state=await page.evaluate(async()=>({
   status:await JyotishDesktopResearchModel.status(),
   cached:await JyotishDesktopResearchModel.models(false),
   storage:Object.values(localStorage).join(' ')
  }));
  if(!state.status.available||!state.status.configured||state.status.model!==model||Object.keys(state.status).length!==3||JSON.stringify(state).includes(fakeKey)){
   throw Error('Unexpected exposed credential or incorrect account model');
  }
  // A cached list can paint before the automatic provider request completes on reopen.
  await dialog.locator('#research-catalog-status').filter({hasText:/Your OpenAI project lists 3 models/}).waitFor();
  const counts=await app.evaluate(()=>globalThis.nativeModelFixture.models);
  if(counts<1)throw Error('The installed app did not automatically request available models');
  const encrypted=await app.evaluate(async({app},fakeKey)=>{
   const fs=process.getBuiltinModule('node:fs/promises'),path=process.getBuiltinModule('node:path');
   const raw=await fs.readFile(path.join(app.getPath('userData'),'research-model-key.json'),'utf8');
   const {encryptedKey}=JSON.parse(raw);
   return !!encryptedKey&&!raw.includes(fakeKey)&&!Buffer.from(encryptedKey,'base64').includes(fakeKey);
  },fakeKey);
  if(!encrypted)throw Error('The native planner did not encrypt the saved key');
  if(reopen){
   await dialog.getByRole('button',{name:'Remove key',exact:true}).click();
   await page.waitForFunction(async()=>!(await JyotishDesktopResearchModel.status()).configured);
   await dialog.getByRole('button',{name:'Close planner settings'}).click();
  }else{
   await dialog.getByRole('button',{name:'Close planner settings'}).click();
   await page.locator('#research-cohort-prompt').fill(modelPrompt);
   await page.locator('#research-cohort-form button[type=submit]').click();
   await page.locator('.research-cohort-review > strong').filter({hasText:exampleTitle}).waitFor();
   await page.locator('#research-cohort-confirm').waitFor();
   if(await app.evaluate(()=>globalThis.nativeModelFixture.plans)!==1)throw Error('The model review did not use one request');
   const before=await savedResearchTopics(page);
   await page.locator('[data-r-action=discard-cohort]').click();
   await page.locator('#research-cohort-prompt').waitFor();
   if(JSON.stringify(before)!==JSON.stringify(await savedResearchTopics(page)))throw Error('Discarding the model review created a topic');
  }
  await page.locator('[data-workspace=charts]').click();
  console.log(JSON.stringify({nativePlanner:true,encryptedKey:true,accountModel:model,automaticModelListCalls:counts,modelReview:!reopen,retainedKeyRemoved:reopen}));
 }finally{
  await app.evaluate(()=>{
   globalThis.fetch=globalThis.nativeModelFixture.original;
   delete globalThis.nativeModelFixture;
  });
 }
}

module.exports={verifyNativeCohort,checkStoredCohort,verifyNativeCombinedCohort,checkStoredCombinedCohort,verifyWindowsPlanner,verifyWindowsPlannerMigration};
