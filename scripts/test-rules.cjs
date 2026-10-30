// Avalia as regras exatas com documentos simulados, sem escrever no banco.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {context}=require('./firebase-context.cjs');
(async()=>{const c=await context();try{
 const {ALL,EMOJIS}=await import('../roster.js'),{applyBallot,dayKey}=await import('../shared.js');
 const testTime="2026-11-19T11:59:59-03:00";
 const key=dayKey(Date.parse(testTime)),uid='test-rule-uid',prefix='/databases/(default)/documents',base=prefix+'/querido/'+key;
 const source=fs.readFileSync('firestore.rules','utf8'),ballot=id=>Object.fromEntries(ALL.filter(x=>x!==id).map(x=>[x,EMOJIS[0]]));
 const first=applyBallot(undefined,ballot('bruno'),'bruno'),second=applyBallot(first,ballot('ob'),'ob');
 const mock=(name,p,value)=>({function:name,args:[{exactValue:p}],result:{value}});
 function make(id,next,previous,marker=false){
  const auth={uid,token:{email:id+'@congresso.app'}},mocks=[mock('get',prefix+'/people/'+id,{data:{uid}}),mock('exists',base+'/voters/'+uid,false),mock('getAfter',base+'/voters/'+uid,{data:{voted:true}}),mock('getAfter',prefix+'/participation/'+key+'/people/'+id,{data:{voted:true}}),mock('exists',base,!!previous),mock('get',base,{data:previous||{voters:0}}),mock('getAfter',base,{data:next})];
  return structuredClone({expectation:'ALLOW',request:{auth,time:new Date(testTime).toISOString(),path:marker?base+'/voters/'+uid:base,method:previous&&!marker?'update':'create',resource:{data:marker?{voted:true}:next}},...(previous?{resource:{data:previous}}:{}),functionMocks:mocks,expressionReportLevel:'FULL'});
 }
 const cases=[make('bruno',first),make('bruno',first,null,true),make('ob',second,first),make('ob',second,first,true)];
 const doubled=make('bruno',first);doubled.expectation='DENY';doubled.request.resource.data.counts.ob+=2;cases.push(doubled);
 const self=make('bruno',first);self.expectation='DENY';self.request.resource.data.counts.bruno=1;cases.push(self);
 const missing=make('bruno',first);missing.expectation='DENY';delete missing.request.resource.data.counts.ob;cases.push(missing);
 const duplicate=make('ob',second,first);duplicate.expectation='DENY';duplicate.functionMocks.find(m=>m.function==='exists'&&m.args[0].exactValue.endsWith('/voters/'+uid)).result.value=true;cases.push(duplicate);
 const alone=make('ob',second,first,true);alone.expectation='DENY';alone.functionMocks.find(m=>m.function==='getAfter'&&m.args[0].exactValue===base).result.value={data:first};cases.push(alone);
 for(const time of ['2026-11-19T12:00:00-03:00','2026-11-19T23:59:59-03:00','2026-11-18T10:00:00-03:00','2026-11-23T10:00:00-03:00']){
  const denied=make('bruno',first);denied.expectation='DENY';denied.request.time=new Date(time).toISOString();
  const actual=dayKey(Date.parse(time));denied.request.path=denied.request.path.replace('/'+key,'/'+actual);
  for(const mock of denied.functionMocks)mock.args[0].exactValue=mock.args[0].exactValue.replace('/'+key,'/'+actual);
  cases.push(denied);
 }
 const noReceipt=make('bruno',first);noReceipt.expectation='DENY';noReceipt.functionMocks.find(m=>m.args[0].exactValue.includes('/participation/')).result.value=null;cases.push(noReceipt);
 const receipt=make('bruno',first);receipt.request.path=prefix+'/participation/'+key+'/people/bruno';receipt.request.resource.data={voted:true};cases.push(receipt);
 const wrongReceipt=structuredClone(receipt);wrongReceipt.expectation='DENY';wrongReceipt.request.path=prefix+'/participation/'+key+'/people/ob';cases.push(wrongReceipt);
 const casePath=prefix+'/cases/test-photo-case',photoPath=prefix+'/casePhotos/test-photo-case',photo={dataUrl:'data:image/jpeg;base64,AAAA'};
 const caseData={by:'bruno',who:'ob',what:'Teste',status:'pend',hasPhoto:true};
 function photoTest(method,data,status='pend',admin=false,expectation='DENY',parentExists=false){
  return {expectation,request:{auth:{uid,token:{email:'bruno@congresso.app'}},time:new Date(testTime).toISOString(),path:photoPath,method,resource:{data}},functionMocks:[
   mock('get',prefix+'/people/bruno',{data:{uid}}),mock('exists',prefix+'/admins/'+uid,admin),
   mock('exists',casePath,parentExists),mock('get',casePath,{data:{...caseData,status}}),mock('getAfter',casePath,{data:{...caseData,status}})
  ]};
 }
 cases.push(photoTest('create',photo,'pend',false,'ALLOW'));
 cases.push(photoTest('create',{dataUrl:'data:image/svg+xml;base64,AAAA'}));
 cases.push(photoTest('create',{dataUrl:'data:image/jpeg;base64,'+'A'.repeat(180001)}));
 cases.push(photoTest('create',photo,'pend',false,'DENY',true));
 cases.push(photoTest('get',photo,'pend',false,'DENY',true));
 cases.push(photoTest('get',photo,'pend',true,'ALLOW',true));
 cases.push(photoTest('get',photo,'ok',false,'ALLOW',true));
 const orphan=photoTest('create',photo);orphan.functionMocks.find(m=>m.function==='getAfter').result.value=null;cases.push(orphan);
 const wrongAuthor=photoTest('create',photo);wrongAuthor.functionMocks.find(m=>m.function==='getAfter').result.value.data.by='ob';cases.push(wrongAuthor);
 const overwrite=photoTest('update',photo,'ok',true,'DENY',true);overwrite.resource={data:photo};cases.push(overwrite);
 const guestPhoto=photoTest('get',photo,'ok');guestPhoto.request.auth=null;cases.push(guestPhoto);
 for(const [status,admin,expectation] of [['pend',false,'DENY'],['pend',true,'ALLOW'],['ok',false,'ALLOW']]){
  const sample=photoTest('get',photo,status,admin,expectation,true);sample.request.path=casePath;sample.resource={data:{...caseData,status}};cases.push(sample);
 }
 function pixTest(method,id='bruno',data={type:'email',value:'teste@example.com'},expectation='ALLOW'){
  return {expectation,request:{auth:{uid,token:{email:'bruno@congresso.app'}},time:new Date(testTime).toISOString(),path:prefix+'/pixKeys/'+id,method,resource:{data}},resource:{data:{type:'email',value:'antes@example.com'}},functionMocks:[mock('get',prefix+'/people/bruno',{data:{uid}}),mock('exists',prefix+'/admins/'+uid,true)]};
 }
 for(const method of ['create','update','delete','get','list'])cases.push(pixTest(method));
 for(const method of ['create','update','delete'])cases.push(pixTest(method,'ob',undefined,'DENY'));
 cases.push(pixTest('get','ob'));
 for(const method of ['get','list']){const guest=pixTest(method,'ob',undefined,'DENY');guest.request.auth=null;cases.push(guest);}
 for(const data of [{type:'email',value:'x'},{type:'email',value:'a'.repeat(78)+'@e.com'},{type:'email',value:3},{type:'email'},{type:'email',value:'a@b.com',admin:true},{type:'other',value:'a@b.com'}]){
  for(const method of ['create','update'])cases.push(pixTest(method,'bruno',data,'DENY'));
 }
 for(const data of [{type:'cpf',value:'52998224725'},{type:'telefone',value:'+5511999991234'},{type:'aleatoria',value:'12345678-abcd-1234-abcd-123456789012'}])cases.push(pixTest('create','bruno',data));
 for(const [time,expectation] of [['2026-11-19T11:59:59-03:00','DENY'],['2026-11-19T12:00:00-03:00','ALLOW'],['2026-11-19T20:00:00-03:00','ALLOW']]){
  for(const endpoint of [base,prefix+'/participation/'+key+'/people/bruno']){
   const t=make('bruno',first);t.expectation=expectation;t.request.method='get';t.request.time=new Date(time).toISOString();t.request.path=endpoint;t.resource={data:first};cases.push(t);
  }
 }
 const adminMorning=make('bruno',first);adminMorning.request.method='get';adminMorning.expectation='DENY';adminMorning.functionMocks.push(mock('exists',prefix+'/admins/'+uid,true));cases.push(adminMorning);
 function scoreCase(method,admin,closed=false){
  return {expectation:'ALLOW',request:{auth:{uid,token:{email:'bruno@congresso.app'}},time:new Date(testTime).toISOString(),path:prefix+'/scoreClosures/main',method,resource:{data:{closedAt:new Date(testTime).toISOString(),closedBy:'bruno'}}},functionMocks:[mock('get',prefix+'/people/bruno',{data:{uid}}),mock('exists',prefix+'/admins/'+uid,admin),mock('exists',prefix+'/scoreClosures/main',closed)]};
 }
 cases.push(scoreCase('create',true));const memberScore=scoreCase('create',false);memberScore.expectation='DENY';cases.push(memberScore);
 for(const method of ['update','delete']){const t=scoreCase(method,true,true);t.expectation='DENY';cases.push(t);}
 for(const closed of [false,true]){
  for(const method of ['create','update','delete']){
   const t=scoreCase(method,true,closed);t.expectation=closed?'DENY':'ALLOW';t.request.path=prefix+'/points/example';
   const point={who:'bruno',d:5,why:'Tarefa',kind:'aux',at:'19/11 11:59',createdAt:new Date(testTime).toISOString()};t.request.resource.data=point;t.resource={data:point};cases.push(t);
  }
 }
 const {Client}=require(path.join(c.root,'lib/apiv2.js')),api=require(path.join(c.root,'lib/api.js'));
 const client=new Client({urlPrefix:api.rulesOrigin(),apiVersion:'v1',auth:true});
 const result=await client.post('/projects/congresso-monogamico:test',{source:{files:[{name:'firestore.rules',content:source}]},testSuite:{testCases:cases}},{skipLog:{body:true}});
 fs.writeFileSync('.private/rules-report.json',JSON.stringify(result.body,null,2));
 const results=result.body.testResults||[];console.log(JSON.stringify({issues:result.body.issues,testResults:results.map((t,i)=>({case:i+1,state:t.state,debugMessages:t.debugMessages,errorPosition:t.errorPosition}))},null,2));
 assert.equal(results.length,cases.length);assert(results.every(t=>t.state==='SUCCESS'),'Há regras com falha no relatório.');console.log(`OK: ${cases.length} cenários de votação, prazo, fotos e denúncias.`);
}finally{await c.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
