// Exercise the native cohort endpoint with bounded public-record fixtures.
const {openLabLauncher}=require('./research-native-smoke.cjs');
const cohortEndpoint='/api/research/cohort';
const exampleTitle='U.S. presidents';
const fixtureName='Native fixture president';
const modelPrompt='Please find everyone who occupied the top elected office in the United States';
const fakeKey='sk-native-smoke-fake-key';
const nbaTopic='NBA players';
const nbaFixture='Native fixture basketball player';
const nbaDataPrompt='I want all their stats too';
const nbaAnalysis='Distribution of Moon signs where Points >= 7000';

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

async function checkStoredCombinedCohort(page){
 return page.evaluate(async({nbaTopic,nbaFixture,nbaAnalysis})=>{
  const {createResearchStore}=await import('/research-storage.mjs');
  const store=await createResearchStore();
  try{
   const matches=(await store.listProjects()).filter(topic=>topic.name===nbaTopic);
   if(matches.length!==1)throw Error('Expected one retained NBA roster and stats topic');
   const {id}=matches[0],topic=await store.getProject(id);
   const member=topic.members.find(person=>person.name===nbaFixture);
   if(!member||member.sourcePersonId!=='nba-game-nativfi01'||member.input.timeKnown!==false)throw Error('The joined player must retain its public ID and unknown-time chart qualification');
   const data=await store.getResearchDatasets(id);
   if(data.length!==1||!data[0].fields.some(field=>field.key==='points'))throw Error('The reviewed statistics dataset did not stay attached');
   const joined=data[0].records.find(record=>record.memberId===member.id);
   if(joined?.values.points!==7350)throw Error('The saved points do not belong to the fixture player');
   const notes=await store.listPromptResults(id),summary=notes.find(item=>item.query===nbaAnalysis);
   if(!summary)throw Error('No retained question for the imported dataset');
   const report=await store.getPromptResult(id,summary.id);
   const scope=report.result.context.data;
   if(scope.matched!==1||report.result.eligible!==1||report.result.context.birthTime.unknownIncluded!==1||
      scope.sources[0]?.id!==data[0].id||scope.sources[0]?.version!==data[0].version){
    throw Error('The retained query did not use the reviewed dataset or chart eligibility rules');
   }
   return {topicId:id,resultId:summary.id,dataVersion:data[0].version};
  }finally{store.close();}
 },{nbaTopic,nbaFixture,nbaAnalysis});
}

async function verifyNativeCombinedCohort(app,page){
 await app.evaluate((_,{fixtureName})=>{
  const original=globalThis.fetch,response=body=>new Response(body);
  globalThis.nativeCombinedFixture={original,calls:[]};
  const totals='season,lg,player,player_id,age,team,pos,g,gs,mp,fg,fga,fg_percent,x3p,x3pa,x3p_percent,x2p,x2pa,x2p_percent,e_fg_percent,ft,fta,ft_percent,orb,drb,trb,ast,stl,blk,tov,pf,pts,trp_dbl\n'+
   `2005,NBA,${fixtureName},nativfi01,25,ABC,PG,350,300,10000,2600,5000,.52,650,1800,.361,1950,3200,.609,.585,1500,1800,.833,100,300,400,1400,300,50,500,700,7350,4\n`+
   '2005,NBA,Native fixture basketball reserve,nativfi02,24,ABC,SG,100,30,3500,400,1000,.40,150,500,.30,250,500,.50,.475,200,300,.667,50,100,150,400,70,20,150,150,1150,0\n';
  const born=[
   ['Q1000993','n/nativfi01','100001','1980-01-01T00:00:00Z'],
   ['Q1000994','n/nativfi02','100002','1981-01-01T00:00:00Z'],
  ].map(([id,profile,nba,date])=>Object.fromEntries(Object.entries({
   person:'http://www.wikidata.org/entity/'+id,profile,nba,date,
   place:'http://www.wikidata.org/entity/Q18094',placeName:'Honolulu',
   point:'Point(-157.8583 21.3069)',tz:'Pacific/Honolulu',cc:'US'
  }).map(([key,value])=>[key,{value}])));
  globalThis.fetch=async(input,init)=>{
   const url=new URL(input instanceof Request?input.url:input);
   const record=name=>globalThis.nativeCombinedFixture.calls.push(name);
   if(url.hostname==='raw.githubusercontent.com'&&url.pathname.endsWith('/Player%20Totals.csv')){
    record('totals');return response(totals);
   }
   if(url.hostname==='raw.githubusercontent.com'&&url.pathname.endsWith('/Player%20Career%20Info.csv')){
    record('career profiles');return response('player_id,birth_date,pos,ht_in_in,wt,hof\nnativfi01,1980-01-01,PG,76,195,FALSE\nnativfi02,1981-01-01,SG,78,205,FALSE\n');
   }
   if(url.hostname==='raw.githubusercontent.com'&&url.pathname.endsWith('/library/data.py')){
    record('directory');return response(`players = [\n    [100001, "Player", "Fixture", "${fixtureName}", True],\n    [100002, "Reserve", "Fixture", "Native fixture basketball reserve", False],\n]\n`);
   }
   if(url.hostname==='www.kaggle.com'&&url.pathname.endsWith('/Players.csv')){
    record('player dates');return response('personId,birthdate\n100001,1980-01-01\n100002,1981-01-01\n');
   }
   if(url.origin==='https://query.wikidata.org'&&url.pathname==='/sparql'){
    if(!url.searchParams.get('query')?.includes('n/nativfi01'))throw Error('Unexpected Wikidata cohort query during combined fixture');
    record('birth claims');return Response.json({results:{bindings:born}});
   }
   return original(input,init);
  };
 },{fixtureName:nbaFixture});
 try{
  await openLabLauncher(page);
  await page.locator('#research-cohort-prompt').fill('All NBA players');
  await page.locator('#research-cohort-data-toggle').click();
  await page.locator('#research-cohort-data-prompt').fill(nbaDataPrompt);
  await page.locator('#research-cohort-form button[type=submit]').click();
  await page.locator('.research-cohort-data-review').waitFor();
  await page.locator('#research-cohort-confirm').waitFor();
  const before=await app.evaluate(()=>globalThis.nativeCombinedFixture.calls);
  if(before.length)throw Error('The native launcher fetched roster or stat sources before confirmation');
  await page.locator('#research-cohort-confirm').click();
  await page.locator('#research-question').waitFor({timeout:60000});
  await page.getByText(nbaFixture,{exact:true}).first().waitFor();
  await page.locator('#research-question').fill(nbaAnalysis);
  await page.locator('#research-query-form button[type=submit]').click();
  await page.locator('.research-data-review').waitFor();
  await page.locator('[data-r-action=run-review]').click();
  await page.locator('.research-results-data').waitFor({timeout:60000});
  await checkStoredCombinedCohort(page);
  const calls=await app.evaluate(()=>globalThis.nativeCombinedFixture.calls);
  if(!calls.includes('birth claims')||!calls.includes('totals'))throw Error('The native combined import did not use its roster and stats sources');
  const close=page.locator('[data-r-action=close-lab-topic]');
  await close.click();
  await page.getByRole('heading',{name:'JyotishGPT',exact:true}).waitFor();
  await page.locator('#research-lab-topics').getByRole('button',{name:nbaTopic,exact:true}).click();
  await page.locator('.research-prompt-history [data-r-prompt]').filter({hasText:nbaAnalysis}).waitFor();
  await page.locator('[data-workspace=charts]').click();
  console.log(JSON.stringify({nativeCombinedCohort:true,combinedReview:true,statsFiltered:true,retainedOnClose:true,fixtureSourceCalls:calls}));
 }finally{
  await app.evaluate(()=>{
   globalThis.fetch=globalThis.nativeCombinedFixture.original;
   delete globalThis.nativeCombinedFixture;
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

module.exports={verifyNativeCohort,checkStoredCohort,verifyNativeCombinedCohort,checkStoredCombinedCohort,verifyWindowsPlanner};
