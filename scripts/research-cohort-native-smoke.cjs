// Exercise the native cohort endpoint with bounded public-record fixtures.
const {openLabLauncher}=require('./research-native-smoke.cjs');
const cohortEndpoint='/api/research/cohort';
const exampleTitle='U.S. presidents';
const fixtureName='Native fixture president';
const modelPrompt='Please find everyone who occupied the top elected office in the United States';
const fakeKey='sk-native-smoke-fake-key';

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

async function verifyNativeCohort(app,page){
 const request=async payload=>page.evaluate(async({endpoint,payload})=>{
  const response=await fetch(endpoint,{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
  });
  return {status:response.status,body:await response.json()};
 },{endpoint:cohortEndpoint,payload});
 const invalid=await request({action:'page',criteria:{id:'unrecognized'},cursor:null});
 if(invalid.status!==422||!invalid.body.error)throw Error('Native cohort endpoint did not validate criteria: '+JSON.stringify(invalid));
 const reviewed=await request({action:'prepare',prompt:'U.S. presidents'});
 if(reviewed.status!==200||reviewed.body.criteria?.title!==exampleTitle||!reviewed.body.sources?.length)throw Error('Native cohort endpoint did not prepare a recognized group: '+JSON.stringify(reviewed));
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
  await page.locator('#research-cohort-prompt').fill('Find all U.S. presidents');
  await page.locator('#research-cohort-form button[type=submit]').click();
  await page.locator('#research-cohort-confirm').waitFor();
  if(await app.evaluate(()=>globalThis.nativeResearchFixture.calls)!==0)throw Error('Cohort sources were accessed before review confirmation');
  await page.locator('#research-cohort-confirm').click();
  await page.locator('#research-question').waitFor({timeout:60000});
  await page.getByText(fixtureName,{exact:true}).first().waitFor();
  await checkStoredCohort(page);
  if(JSON.stringify(before)!==JSON.stringify(await savedCharts()))throw Error('Native cohort creation changed Saved Charts or History');
  const calls=await app.evaluate(()=>globalThis.nativeResearchFixture.calls);
  if(calls!==1)throw Error('Native cohort endpoint should request one fixture page');
  await page.locator('[data-workspace=charts]').click();
  console.log(JSON.stringify({nativeOnlineCohort:true,reviewed:true,fixtureRecords:2,charted:1,upstreamCalls:calls}));
 }finally{
  await app.evaluate(()=>{
   globalThis.fetch=globalThis.nativeResearchFixture.original;
   delete globalThis.nativeResearchFixture;
  });
 }
}

async function verifyWindowsPlanner(app,page,{reopen=false}={}){
 if(process.platform!=='win32')return;
 await openLabLauncher(page);
 await page.getByRole('button',{name:'Planner settings',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'JyotishGPT settings'});
 const status=dialog.getByRole('status');
 if(reopen){
  await status.getByText('An API key is saved on this device.',{exact:true}).waitFor();
  await dialog.getByRole('button',{name:'Remove key',exact:true}).click();
  await status.getByText('API key removed.',{exact:true}).waitFor();
  if((await page.evaluate(()=>JyotishDesktopResearchModel.status())).configured)throw Error('The native planner key could not be removed');
  await dialog.getByRole('button',{name:'Close planner settings'}).click();
 }else{
  await status.getByText('No API key saved.',{exact:true}).waitFor();
  await dialog.getByLabel('OpenAI API key',{exact:true}).fill(fakeKey);
  await dialog.getByRole('button',{name:'Save key',exact:true}).click();
  await status.getByText('API key saved on this device.',{exact:true}).waitFor();
  if(await dialog.getByLabel('OpenAI API key',{exact:true}).inputValue())throw Error('The native planner left a key in its input');
  const settings=await page.evaluate(()=>JyotishDesktopResearchModel.status());
  if(!settings.available||!settings.configured||settings.model!=='gpt-5-mini'||Object.keys(settings).length!==3)throw Error('The native planner returned unexpected settings');
  const encrypted=await app.evaluate(async({app},fakeKey)=>{
   const fs=process.getBuiltinModule('node:fs/promises'),path=process.getBuiltinModule('node:path');
   const raw=await fs.readFile(path.join(app.getPath('userData'),'research-model-key.json'),'utf8');
   const {encryptedKey}=JSON.parse(raw);
   return !!encryptedKey&&!raw.includes(fakeKey)&&!Buffer.from(encryptedKey,'base64').includes(fakeKey);
  },fakeKey);
  if(!encrypted)throw Error('The native planner did not encrypt the key on disk');
  await dialog.getByRole('button',{name:'Close planner settings'}).click();
  await app.evaluate((_,{fakeKey,prompt})=>{
   globalThis.nativeModelFixture={original:globalThis.fetch,calls:0};
   globalThis.fetch=async(input,init)=>{
    const target=input instanceof Request?input.url:String(input);
    if(target!=='https://api.openai.com/v1/responses')throw Error('Unexpected upstream request during model review');
    const body=JSON.parse(init.body);
    if(init.method!=='POST'||new Headers(init.headers).get('Authorization')!==`Bearer ${fakeKey}`||
      body.model!=='gpt-5-mini'||body.input!==prompt||body.store!==false)throw Error('Unexpected model request');
    globalThis.nativeModelFixture.calls++;
    const plan={kind:'named',id:'us-presidents',group:null,occupation:null,relation:null,entity:null,country:null,message:null};
    return Response.json({status:'completed',output:[{
     type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(plan)}]
    }]});
   };
  },{fakeKey,prompt:modelPrompt});
  try{
   await page.locator('#research-cohort-prompt').fill(modelPrompt);
   await page.locator('#research-cohort-form button[type=submit]').click();
   await page.locator('.research-cohort-review').getByText(exampleTitle,{exact:true}).waitFor();
   await page.locator('#research-cohort-confirm').waitFor();
   if(await app.evaluate(()=>globalThis.nativeModelFixture.calls)!==1)throw Error('The native model review did not use one request');
  }finally{
   await app.evaluate(()=>{
    globalThis.fetch=globalThis.nativeModelFixture.original;
    delete globalThis.nativeModelFixture;
   });
  }
 }
 await page.locator('[data-workspace=charts]').click();
 console.log(JSON.stringify({nativePlanner:true,encryptedKey:true,modelReview:!reopen,retainedKeyRemoved:reopen}));
}

module.exports={verifyNativeCohort,checkStoredCohort,verifyWindowsPlanner};
