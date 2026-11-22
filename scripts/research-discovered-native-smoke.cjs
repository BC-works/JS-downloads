// Drive the installed renderer, parser, native backend, and storage with reproducible publisher and model transports.
const {openLabLauncher}=require('./research-native-smoke.cjs');

async function verifyDiscoveredCohort(app,page){
 const title='Meridian instrument fellows';
 const group='Meridian musical instrument fellowship recipients';
 const original=group+' along with their instruments and number of performances';
 const question='Which edition of the fellowship should I include?';
 const answer='The first edition only.';
 const groupAfterReply='First-edition fellows in the Meridian musical instrument fellowship';
 const source='https://catalogue.meridian-foundation.org/fellows/first-edition.csv';
 const first='Rowan Native Fixture',second='Asha Native Fixture';
 await app.evaluate(({app},{title,source,first,second,group,original,question,answer,groupAfterReply})=>{
  const require=process.getBuiltinModule('node:module').createRequire(app.getAppPath()+'/package.json');
  const {createCohortBackend}=require('./research-cohort-backend.cjs');
  const {createDatasetStore}=require('./research-source-plans.cjs');
  const path=process.getBuiltinModule('node:path');
  const calls={intent:0,search:0,read:0};
  const mapping={
   format:'csv',rowsPath:null,childrenPath:null,tableIndex:null,nextPath:null,
   fields:{id:'id',name:'name',firstName:null,lastName:null,sourceUrl:null,birthDate:'dob',birthTime:null,
    birthPlace:'place',birthLat:'lat',birthLon:'lon',birthTz:'zone'},
   filters:[],properties:[{key:'instrument',label:'Instrument',type:'text',unit:null,path:'instrument'}]
  };
  const plan={outcome:'source',message:null,title,description:'First-edition fellows on the published Meridian instrument fellowship roster.',
   membership:[{phrase:groupAfterReply,filterIndex:null,explanation:'The first-edition roster lists admitted fellowship participants.'}],
   rules:['Include each fellow on the first-edition roster once.'],limitations:['The register covers its first edition only.'],
   unavailableFields:[],roster:{label:'Meridian fellowship register',url:source,evidenceUrl:source,identityNamespace:'meridian-fellows',mapping},supplement:null};
  const message=body=>({type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(body)}]});
  const handle=createCohortBackend({
   datasetStore:createDatasetStore(path.join(app.getPath('userData'),'fixture-source-plans')),
   loadModelSettings:async()=>({apiKey:'sk-test-research-fixture',model:'gpt-5-mini'}),
   fetchFn:async(url,options)=>{
    if(url.startsWith('https://www.wikidata.org/w/api.php'))return Response.json({search:[]});
    if(url!=='https://api.openai.com/v1/responses')throw Error('Unexpected native fixture upstream URL');
    const req=JSON.parse(options.body);
    const input=JSON.parse(req.input);
    if(req.store!==false)throw Error('Research must disable provider response storage');
    if(req.text?.format?.name==='research_cohort_intent'){
     calls.intent++;
     const turns=input.clarifications||[],reply=turns.at(-1);
     if(input.groupRequest!==original||turns.length>1||reply&&(reply.question!==question||reply.answer!==answer)){
      throw Error('The model did not receive the original prompt and its clarification');
     }
     const intent={parts:[{role:'group',text:group},{role:'data',text:'along with their instruments and number of performances'}],
      groupPrompt:reply?groupAfterReply:group,dataPrompt:'Instruments and number of performances',question:reply?null:question};
     const interpretation={kind:'unsupported',id:null,occupation:null,relation:null,entity:null,country:null,
      message:'A dedicated fellowship register is needed.',data:{provider:'unsupported',fields:null,message:'Look up the published instrument.'},intent};
     return Response.json({status:'completed',output:[message(interpretation)]});
    }
    if(!req.tools?.some(tool=>tool.type==='web_search')||input.group!==groupAfterReply||input.data!==(input.membershipOnly?'':'Instruments and number of performances')){
     throw Error('Discovery lost the clarified population or the originally requested data');
    }
    calls.search++;
    const performances=source.replace('first-edition','performances');
    const facts={...plan.roster,url:performances,evidenceUrl:performances,mapping:{format:'csv',fields:{id:'id',name:'name'},
     rollup:{grain:'One performance',rowKeys:['event'],metrics:[{key:'performances',label:'Performances',op:'countDistinct',path:'event'}]}}};
    const proposal=input.membershipOnly?{...plan,roster:{...plan.roster,mapping:{...mapping,properties:[]}}}:
     input.verifiedRoster?{...plan,supplement:facts}:{outcome:'unavailable',message:'No combined register.'};
    return Response.json({status:'completed',output:[
     {type:'web_search_call',status:'completed',action:{type:'search',sources:[{type:'url',url:source},{type:'url',url:performances}]}},message(proposal)
    ]});
   },
   fetchPublicDataset:async url=>{
    if(url===source.replace('first-edition','performances')){calls.read++;return new Response(['id,name,event','m01,'+first+',p1','m01,'+first+',p2','m02,'+second+',p1'].join('\n'));}
    if(url!==source)throw Error('The importer requested an unreviewed source');
    calls.read++;
    const csv=['id,name,dob,place,lat,lon,zone,instrument','m01,'+first+',1984-01-01,Honolulu,21.307,-157.859,Pacific/Honolulu,Violin','m02,'+second+',,Honolulu,21.307,-157.859,Pacific/Honolulu,Cello'].join('\n');
    const response=new Response(csv,{headers:{'content-type':'text/csv'}});
    Object.defineProperty(response,'url',{value:source});return response;
   }
  });
  globalThis.nativeDiscoveredFixture={handle,calls};
 },{title,source,first,second,group,original,question,answer,groupAfterReply});
 await page.exposeFunction('nativeDiscoveryFixtureRequest',payload=>app.evaluate(async(_,body)=>{
  const url='jyotish://app/api/research/cohort';
  const result=await globalThis.nativeDiscoveredFixture.handle(new Request(url,{method:'POST',headers:{'Content-Type':'application/json'},body}));
  return {status:result.status,body:await result.json()};
 },payload));
 await page.evaluate(()=>{
  const original=globalThis.fetch;
  globalThis.nativeOriginalDiscoveryFetch=original;
  globalThis.fetch=async(input,init)=>{
   const url=new URL(input instanceof Request?input.url:input,location.href);
   if(url.origin!==location.origin||url.pathname!=='/api/research/cohort')return original(input,init);
   const reply=await globalThis.nativeDiscoveryFixtureRequest(init?.body??await input.text());
   return Response.json(reply.body,{status:reply.status});
  };
 });
 async function read(){
  return page.evaluate(async title=>{
   const {createResearchStore}=await import('/research-storage.mjs');
   const store=await createResearchStore();
   try{
    const summary=(await store.listProjects()).find(project=>project.name===title);
    if(!summary)return null;
    const project=await store.getProject(summary.id),data=await store.getResearchDatasets(summary.id);
    return {names:project.members.map(member=>member.name),known:project.members[0]?.input.timeKnown,
     stats:project.cohort.stats,values:data.flatMap(dataset=>dataset.records.map(record=>record.values.instrument)),
     sources:project.cohort.sources.map(source=>source.url)};
   }finally{store.close();}
  },title);
 }
 try{
  await openLabLauncher(page);
  await page.locator('#research-cohort-prompt').fill(original);
  await page.locator('#research-cohort-form button[type=submit]').click();
  await page.getByText(question,{exact:true}).waitFor();
  const reply=page.getByRole('textbox',{name:'Your reply',exact:true});
  await reply.waitFor();
  if(await read()||await page.locator('#research-cohort-confirm').isVisible())throw Error('Clarifying a request started collection early');
  await reply.fill(answer);
  await page.getByRole('button',{name:'Send reply',exact:true}).click();
  const example=page.locator('.research-cohort-example');
  await example.getByText(first,{exact:false}).first().waitFor();
  await example.getByText(/Violin/).first().waitFor();
  await page.getByText(/Estimated topic storage.*for 2 people/).waitFor();
  if(await read())throw Error('Preview committed a topic');
  await page.locator('#research-cohort-confirm').click();
  await page.locator('.research-collection-preview').waitFor({timeout:60000});
  await page.getByText(/Retrieved data.*in this draft/).waitFor();
  if(await read())throw Error('Collection committed a topic before report approval');
  await page.locator('#research-cohort-start').click();
  await page.locator('#research-question').waitFor({timeout:60000});
  await page.getByRole('button',{name:'Topic settings',exact:true}).click();
  await page.locator('[data-topic-storage]').filter({hasText:/Topic data · [0-9]/}).waitFor();
  await page.keyboard.press('Escape');
  await page.locator('[data-r-action=roster-data][data-r-person]').click();
  const personDialog=page.getByRole('dialog');
  await personDialog.getByRole('heading',{name:second}).waitFor();
  await personDialog.getByText('Cello',{exact:true}).waitFor();
  await personDialog.getByText('1',{exact:true}).first().waitFor();
  await personDialog.getByRole('button',{name:'‹ Everyone'}).click();
  await personDialog.locator('[name=roster-field]').selectOption({label:'Performances · Calculated properties'});
  await personDialog.locator('[name=roster-op]').selectOption('atLeast');
  await personDialog.locator('[name=roster-value]').fill('2');
  await personDialog.getByRole('button',{name:'Apply filter'}).click();
  await personDialog.getByText('1 of 2 people',{exact:true}).waitFor();
  await personDialog.getByRole('button',{name:first}).waitFor();
  await page.keyboard.press('Escape');
  const saved=await read(),calls=await app.evaluate(()=>globalThis.nativeDiscoveredFixture.calls);
  if(!saved||saved.names.length!==1||saved.names[0]!==first||saved.known!==false||saved.stats.discovered!==2||saved.stats.missingDates!==1||
   !saved.values.includes('Violin')||!saved.sources.includes(source)||calls.intent!==2||calls.search!==3||calls.read<1)throw Error('The installed discovery workflow did not retain the reviewed source fields and exclusions: '+JSON.stringify({saved,calls}));
  await page.locator('[data-workspace=charts]').click();
  console.log(JSON.stringify({nativePublicDataset:true,singlePrompt:true,conversationalClarification:true,modelSearchSimulated:true,sourceExample:true,independentCollectionReport:true,verifiedCsvData:true,rosterRecovery:true,calculatedProperty:true,unchartedFilter:true,calls}));
 }finally{
  await page.evaluate(()=>{globalThis.fetch=globalThis.nativeOriginalDiscoveryFetch;delete globalThis.nativeOriginalDiscoveryFetch;});
  await app.evaluate(()=>{delete globalThis.nativeDiscoveredFixture;});
 }
}
async function verifyLivePublicRegister(app){
 // A real register exercises the packaged Windows HTTPS transport and tabular parser together.
 const evidence=await app.evaluate(async({app})=>{
  const require=process.getBuiltinModule('node:module').createRequire(app.getAppPath()+'/package.json');
  const {createPublicDatasetFetcher}=require('./public-dataset-transport.cjs');
  const {readPublicTable}=require('./server/research-public-table.mjs');
  const url='https://unitedstates.github.io/congress-legislators/legislators-current.csv';
  const read=createPublicDatasetFetcher();
  let response;
  for(let attempt=1;attempt<=2;attempt++){
   try{response=await read(url);break;}catch(error){if(attempt===2)throw error;}
  }
  const mapping={format:'csv',fields:{id:'bioguide_id',name:'full_name',birthDate:'birthday'},properties:[{key:'party',path:'party',label:'Party',type:'text'}]};
  const {rows}=readPublicTable({text:await response.text(),url:response.url||url,mapping});
  return {rows:rows.length,withNames:rows.filter(r=>r.name).length,withBirthDates:rows.filter(r=>r.birthDate).length,withParty:rows.filter(r=>r.properties.party).length};
 });
 if(evidence.rows<300||Math.min(evidence.withNames,evidence.withBirthDates,evidence.withParty)<300)throw Error('Packaged public CSV returned insufficient evidence: '+JSON.stringify(evidence));
 console.log(JSON.stringify({livePublicCongressRegister:true,...evidence}));
}
async function verifyLiveCareerSearch(page){
 await openLabLauncher(page);
 const prompt='all historical and current nba players and their career averages + games played please';
 await page.locator('#research-cohort-prompt').fill(prompt);
 await page.locator('#research-cohort-form button[type=submit]').click();
 try{
  await page.locator('.research-cohort-example').waitFor({timeout:65000});
  await page.locator('#research-cohort-confirm').click();
  await page.locator('#research-cohort-start').waitFor({timeout:300000});
  await page.locator('#research-cohort-start').click();
  await page.locator('#research-question').waitFor({timeout:60000});
 }catch(error){
  const visible=await page.locator('body').innerText();
  throw Error('Live research flow stopped: '+visible.slice(-2500)+' · '+error.message);
 }
 const summary=await page.evaluate(async prompt=>{
  const {createResearchStore}=await import('/research-storage.mjs');
  const {rosterRecords}=await import('/research-roster.mjs');
  const store=await createResearchStore();
  try{
   const entry=(await store.listProjects()).find(r=>r.name==='NBA players');
   const project=await store.getProject(entry.id),report=project.cohort;
   if(report.prompt!==prompt)throw Error('Live topic did not retain the submitted request');
   const roster=rosterRecords(project,await store.getResearchDatasets(entry.id));
   const named=roster.people.find(person=>person.name==='Michael Jordan');
   const key=label=>roster.fields.find(f=>f.label===label)?.id;
   const games=key('Career games played'),ppg=key('Points per game');
   return {people:roster.people.length,charted:project.members.length,noon:report.stats.unknownTimes,recordedTimes:report.stats.knownTimes,withDate:roster.people.filter(p=>p.date).length,
     withPpg:roster.people.filter(p=>p.values.has(ppg)).length,
     jordan:{games:[...named.values.get(games)][0],ppg:[...named.values.get(ppg)][0]},
     coverage:report.criteria.description,source:report.sources.find(s=>s.url.includes('/versions/'))?.url};
  }finally{store.close();}
 },prompt);
 if(summary.people<4800||summary.charted<100||summary.withPpg<4700||summary.jordan.games!==1072||Math.abs(summary.jordan.ppg-32292/1072)>0.00001)
  throw Error('Live topic statistics failed verification: '+JSON.stringify(summary));
 console.log(JSON.stringify({liveCareerPrompt:true,...summary}));
 await page.locator('[data-workspace=charts]').click();
}
module.exports={verifyDiscoveredCohort,verifyLivePublicRegister,verifyLiveCareerSearch};
