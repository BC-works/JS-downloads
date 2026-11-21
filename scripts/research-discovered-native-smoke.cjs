// Drive the installed renderer, parser, native backend, and storage with reproducible publisher and model transports.
const {openLabLauncher}=require('./research-native-smoke.cjs');

async function verifyDiscoveredCohort(app,page){
 const title='Meridian instrument fellows';
 const prompt='First-edition fellows in the Meridian musical instrument fellowship';
 const source='https://catalogue.meridian-foundation.org/fellows/first-edition.csv';
 const first='Rowan Native Fixture',second='Asha Native Fixture';
 await app.evaluate(({app},{title,source,first,second,prompt})=>{
  const require=process.getBuiltinModule('node:module').createRequire(app.getAppPath()+'/package.json');
  const {createCohortBackend}=require('./research-cohort-backend.cjs');
  const {createDatasetStore}=require('./research-source-plans.cjs');
  const path=process.getBuiltinModule('node:path');
  const calls={search:0,read:0};
  const mapping={
   format:'csv',rowsPath:null,childrenPath:null,tableIndex:null,nextPath:null,
   fields:{id:'id',name:'name',firstName:null,lastName:null,sourceUrl:null,birthDate:'dob',birthTime:null,
    birthPlace:'place',birthLat:'lat',birthLon:'lon',birthTz:'zone'},
   filters:[],properties:[{key:'instrument',label:'Instrument',type:'text',unit:null,path:'instrument'}]
  };
  const plan={outcome:'source',message:null,title,description:'First-edition fellows on the published Meridian instrument fellowship roster.',
   membership:[{phrase:prompt,filterIndex:null,explanation:'The first-edition roster lists admitted fellowship participants.'}],
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
    if(!req.tools?.some(tool=>tool.type.startsWith('web_search')))return Response.json({status:'completed',output:[message({kind:'unsupported',message:'A dedicated register is needed.',data:{provider:'unsupported',fields:null,message:'This field comes from the register.'}})]});
    if(req.store!==false)throw Error('Source discovery must disable provider response storage');
    calls.search++;
    return Response.json({status:'completed',output:[
     {type:'web_search_call',status:'completed',action:{type:'search',sources:[{type:'url',url:source}]}},message(plan)
    ]});
   },
   fetchPublicDataset:async url=>{
    if(url!==source)throw Error('The importer requested an unreviewed source');
    calls.read++;
    const csv=['id,name,dob,place,lat,lon,zone,instrument','m01,'+first+',1984-01-01,Honolulu,21.307,-157.859,Pacific/Honolulu,Violin','m02,'+second+',,Honolulu,21.307,-157.859,Pacific/Honolulu,Cello'].join('\n');
    const response=new Response(csv,{headers:{'content-type':'text/csv'}});
    Object.defineProperty(response,'url',{value:source});return response;
   }
  });
  globalThis.nativeDiscoveredFixture={handle,calls};
 },{title,source,first,second,prompt});
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
  await page.locator('#research-cohort-prompt').fill(prompt);
  await page.locator('#research-cohort-data-toggle').click();
  await page.locator('#research-cohort-data-prompt').fill('Instrument');
  await page.locator('#research-cohort-form button[type=submit]').click();
  const example=page.locator('.research-cohort-example');
  await example.getByText(first,{exact:false}).first().waitFor();
  await example.getByText(/Violin/).first().waitFor();
  if(await read())throw Error('Preview committed a topic');
  await page.locator('#research-cohort-confirm').click();
  await page.locator('.research-collection-preview').waitFor({timeout:60000});
  if(await read())throw Error('Collection committed a topic before report approval');
  await page.locator('#research-cohort-start').click();
  await page.locator('#research-question').waitFor({timeout:60000});
  const saved=await read(),calls=await app.evaluate(()=>globalThis.nativeDiscoveredFixture.calls);
  if(!saved||saved.names.length!==1||saved.names[0]!==first||saved.known!==false||saved.stats.discovered!==2||saved.stats.missingDates!==1||
   !saved.values.includes('Violin')||!saved.sources.includes(source)||calls.search!==1||calls.read<1)throw Error('The installed discovery workflow did not retain the reviewed source fields and exclusions: '+JSON.stringify({saved,calls}));
  await page.locator('[data-workspace=charts]').click();
  console.log(JSON.stringify({nativePublicDataset:true,modelSearchSimulated:true,sourceExample:true,independentCollectionReport:true,verifiedCsvData:true,calls}));
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
module.exports={verifyDiscoveredCohort,verifyLivePublicRegister};
