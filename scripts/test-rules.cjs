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
 function linksCase(method,admin=true,expectation='ALLOW'){
  const before={albumUrl:'',playlistUrl:'https://open.spotify.com/playlist/example',mapUrl:'https://maps.app.goo.gl/example',airbnbUrl:'https://www.airbnb.com.br/rooms/example',address:'',wifiName:'',wifiPassword:'',version:1,updatedAt:new Date(testTime).toISOString(),updatedBy:'bruno'};
  return {expectation,request:{auth:{uid,token:{email:'bruno@congresso.app'}},time:new Date(testTime).toISOString(),path:prefix+'/officialLinks/main',method,resource:{data:{...before,version:method==='update'?2:1}}},resource:{data:before},functionMocks:[mock('get',prefix+'/people/bruno',{data:{uid}}),mock('exists',prefix+'/admins/'+uid,admin)]};
 }
 for(const method of ['create','update','get'])cases.push(linksCase(method));
 for(const method of ['create','update'])cases.push(linksCase(method,false,'DENY'));
 cases.push(linksCase('get',false));cases.push(linksCase('delete',true,'DENY'));
 const guestLinks=linksCase('get',false,'DENY');guestLinks.request.auth=null;cases.push(guestLinks);
 for(const method of ['create','update'])for(const patch of [{playlistUrl:'javascript:alert(1)'},{mapUrl:'http://example.com'},{albumUrl:7},{wifiPassword:'x'.repeat(121)},{address:'x'.repeat(301)},{arbitrary:true},{updatedBy:'ob'},{version:8}]){const t=linksCase(method,true,'DENY');Object.assign(t.request.resource.data,patch);cases.push(t);}
 function reactionCase(method,data={votes:{bruno:'😂'}},expectation='ALLOW',status='ok'){
  return {expectation,request:{auth:{uid,token:{email:'bruno@congresso.app'}},time:new Date(testTime).toISOString(),path:prefix+'/caseReactions/example',method,resource:{data}},resource:{data:{votes:{bruno:'👏',ob:'❤️'}}},functionMocks:[mock('get',prefix+'/people/bruno',{data:{uid}}),mock('get',prefix+'/cases/example',{data:{status}})]};
 }
 cases.push(reactionCase('create'),reactionCase('get'),reactionCase('update',{votes:{bruno:'😱',ob:'❤️'}}),reactionCase('update',{votes:{ob:'❤️'}}));
 cases.push(reactionCase('update',{votes:{bruno:'👏',ob:'❤️'}}));
 for(const method of ['create','update']){
  for(const data of [{votes:{ob:'😂'}},{votes:{bruno:'💔'}},{votes:{bruno:7}},{votes:{bruno:'x'.repeat(10000)}},{votes:{stranger:'😂'}},{votes:[]},{votes:{} ,extra:1},{}])cases.push(reactionCase(method,data,'DENY'));
  cases.push(reactionCase(method,{votes:{bruno:'😂'}},'DENY','pend'));
 }
 cases.push(reactionCase('update',{votes:{bruno:'😂',ob:'👏'}},'DENY'));
 cases.push(reactionCase('update',{votes:{}},'DENY'));
 for(const method of ['get','create','update']){const t=reactionCase(method,undefined,'DENY');t.request.auth=null;cases.push(t);}
 for(const method of ['get','create','update']){const t=reactionCase(method,undefined,'DENY');t.functionMocks.find(m=>m.args[0].exactValue.endsWith('/cases/example')).result.value=null;cases.push(t);}
 for(const method of ['list','delete'])cases.push(reactionCase(method,undefined,'DENY'));
 const fullVotes=Object.fromEntries(ALL.map(id=>[id,'😂']));cases.push(reactionCase('update',{votes:fullVotes},'DENY'));
 const fullRead=reactionCase('get');fullRead.resource.data={votes:fullVotes};cases.push(fullRead);
 const taskPath=prefix+'/tasks/direct-example',taskPointPath=prefix+'/points/task_direct-example';
 const taskData={who:'bruno',d:5,why:'Lavar a louça',status:'ok',at:'19/11 11:59',createdAt:new Date(testTime).toISOString()};
 const taskPoint={who:'bruno',d:5,why:'Lavar a louça',kind:'aux',at:taskData.at,createdAt:taskData.createdAt};
 function directTaskCase(path,method,expectation='ALLOW',closed=false,admin=false){
  return {expectation,request:{auth:{uid,token:{email:'bruno@congresso.app'}},time:new Date(testTime).toISOString(),path,method,resource:{data:structuredClone(path===taskPath?taskData:taskPoint)}},resource:{data:structuredClone(path===taskPath?taskData:taskPoint)},functionMocks:[mock('get',prefix+'/people/bruno',{data:{uid}}),mock('exists',prefix+'/admins/'+uid,admin),mock('exists',prefix+'/scoreClosures/main',closed),mock('exists',taskPath,false),mock('getAfter',taskPath,{data:taskData}),mock('getAfter',taskPointPath,{data:taskPoint}),mock('existsAfter',taskPointPath,!closed)]};
 }
 cases.push(directTaskCase(taskPath,'create'),directTaskCase(taskPointPath,'create'));
 cases.push(directTaskCase(taskPath,'create','ALLOW',true),directTaskCase(taskPointPath,'create','DENY',true));
 for(const path of [taskPath,taskPointPath]){
  const guest=directTaskCase(path,'create','DENY');guest.request.auth=null;cases.push(guest);
  const forged=directTaskCase(path,'create','DENY');forged.request.resource.data.who='ob';cases.push(forged);
  const inflated=directTaskCase(path,'create','DENY');inflated.request.resource.data.d=20;cases.push(inflated);
 }
 const aloneTask=directTaskCase(taskPath,'create','DENY');aloneTask.functionMocks.find(m=>m.function==='getAfter'&&m.args[0].exactValue===taskPointPath).result.value=null;cases.push(aloneTask);
 const alonePoint=directTaskCase(taskPointPath,'create','DENY');alonePoint.functionMocks.find(m=>m.function==='getAfter'&&m.args[0].exactValue===taskPath).result.value=null;cases.push(alonePoint);
 const reused=directTaskCase(taskPointPath,'create','DENY');reused.functionMocks.find(m=>m.function==='exists'&&m.args[0].exactValue===taskPath).result.value=true;cases.push(reused);
 const pending=directTaskCase(taskPath,'create','DENY');pending.request.resource.data.status='pend';cases.push(pending);
 for(const method of ['update','delete'])cases.push(directTaskCase(taskPath,method,'DENY'));
 const deleteWithPoints=directTaskCase(taskPath,'delete','DENY',false,true);cases.push(deleteWithPoints);
 const deletePair=directTaskCase(taskPath,'delete','ALLOW',false,true);deletePair.functionMocks.find(m=>m.function==='existsAfter').result.value=false;cases.push(deletePair);
 cases.push(directTaskCase(taskPath,'delete','DENY',true,true));
 const chatPath=prefix+'/chat/new-message',ownerPath=prefix+'/chatAuthors/'+uid+'/messages/new-message';
 const threadKey='a'.repeat(32);const chatData={text:'Mensagem de teste',createdAt:new Date(testTime).toISOString(),struck:false,threadKey};
 function chatCase(path,method,expectation='ALLOW',owner=true,admin=false){
  return {expectation,request:{auth:{uid,token:{email:'bruno@congresso.app'}},time:new Date(testTime).toISOString(),path,method,resource:{data:path===chatPath?{...chatData,struck:method==='update'}:{owned:true}}},resource:{data:chatData},functionMocks:[mock('get',prefix+'/people/bruno',{data:{uid}}),mock('exists',prefix+'/admins/'+uid,admin),mock('exists',ownerPath,owner),mock('getAfter',ownerPath,owner?{data:{owned:true}}:null),mock('exists',chatPath,false),mock('getAfter',chatPath,{data:chatData}),mock('getAfter',prefix+'/chatAuthors/'+uid,{data:{threadKey}})]};
 }
 for(const path of [chatPath,ownerPath])cases.push(chatCase(path,'create'));
 cases.push(chatCase(chatPath,'update'),chatCase(chatPath,'get'),chatCase(chatPath,'list'),chatCase(ownerPath,'get'),chatCase(ownerPath,'list'));
 for(const admin of [false,true]){
  cases.push(chatCase(chatPath,'update','DENY',false,admin),chatCase(chatPath,'delete','DENY',true,admin));
  const other=chatCase(prefix+'/chatAuthors/other-uid/messages/new-message','get','DENY',true,admin);cases.push(other);
 }
 for(const method of ['update','delete'])cases.push(chatCase(ownerPath,method,'DENY'));
 for(const patch of [{text:'Alterada'},{createdAt:'2026-01-01T00:00:00Z'},{author:'bruno'},{struck:'true'}]){const t=chatCase(chatPath,'update','DENY');Object.assign(t.request.resource.data,patch);cases.push(t);}
 const unstrike=chatCase(chatPath,'update','DENY');unstrike.resource.data={...chatData,struck:true};unstrike.request.resource.data.struck=false;cases.push(unstrike);
 const aloneChat=chatCase(chatPath,'create','DENY',false);cases.push(aloneChat);
 const claim=chatCase(ownerPath,'create','DENY');claim.functionMocks.find(m=>m.function==='exists'&&m.args[0].exactValue===chatPath).result.value=true;cases.push(claim);
 const orphanOwner=chatCase(ownerPath,'create','DENY');orphanOwner.functionMocks.find(m=>m.function==='getAfter'&&m.args[0].exactValue===chatPath).result.value=null;cases.push(orphanOwner);
 const legacy=chatCase(chatPath,'create','DENY');delete legacy.request.resource.data.struck;cases.push(legacy);
 for(const path of [chatPath,ownerPath])for(const method of ['get','list','create','update','delete']){const t=chatCase(path,method,'DENY');t.request.auth=null;cases.push(t);}
 const authorPath=prefix+'/chatAuthors/'+uid,threadPath=prefix+'/chatThreads/'+threadKey;
 function threadCase(path,method,expectation='ALLOW'){
  const data=path===authorPath?{threadKey}:{uid};
  return {expectation,request:{auth:{uid,token:{email:'bruno@congresso.app'}},time:new Date(testTime).toISOString(),path,method,resource:{data:{...data}}},resource:{data:{...data}},functionMocks:[mock('get',prefix+'/people/bruno',{data:{uid}}),mock('exists',threadPath,false),mock('getAfter',threadPath,{data:{uid}}),mock('getAfter',authorPath,{data:{threadKey}})]};
 }
 for(const path of [authorPath,threadPath]){
  for(const method of ['create','get'])cases.push(threadCase(path,method));
  for(const method of ['list','update','delete'])cases.push(threadCase(path,method,'DENY'));
  const guest=threadCase(path,'get','DENY');guest.request.auth=null;cases.push(guest);
  const orphan=threadCase(path,'create','DENY');orphan.functionMocks.find(m=>m.function==='getAfter'&&m.args[0].exactValue===(path===authorPath?threadPath:authorPath)).result.value=null;cases.push(orphan);
 }
 const otherAuthor=threadCase(authorPath,'get','DENY');otherAuthor.request.path=prefix+'/chatAuthors/other-uid';cases.push(otherAuthor);
 const otherThread=threadCase(threadPath,'get','DENY');otherThread.resource.data.uid='other-uid';cases.push(otherThread);
 const stolenThread=threadCase(authorPath,'create','DENY');stolenThread.functionMocks.find(m=>m.function==='exists').result.value=true;cases.push(stolenThread);
 const invalidAuthor=threadCase(authorPath,'create','DENY');invalidAuthor.request.resource.data.threadKey='bruno';cases.push(invalidAuthor);
 const spoofedUid=threadCase(threadPath,'create','DENY');spoofedUid.request.resource.data.uid='other-uid';cases.push(spoofedUid);
 const forgedMessage=chatCase(chatPath,'create','DENY');forgedMessage.request.resource.data.threadKey='b'.repeat(32);cases.push(forgedMessage);
 const recolor=chatCase(chatPath,'update','DENY');recolor.request.resource.data.threadKey='b'.repeat(32);cases.push(recolor);
 const previous=chatCase(chatPath,'update');previous.resource={data:{...previous.resource.data}};delete previous.resource.data.threadKey;delete previous.request.resource.data.threadKey;cases.push(previous);
 const {Client}=require(path.join(c.root,'lib/apiv2.js')),api=require(path.join(c.root,'lib/api.js'));
 const client=new Client({urlPrefix:api.rulesOrigin(),apiVersion:'v1',auth:true});
 const result=await client.post('/projects/congresso-monogamico:test',{source:{files:[{name:'firestore.rules',content:source}]},testSuite:{testCases:cases}},{skipLog:{body:true}});
 fs.writeFileSync('.private/rules-report.json',JSON.stringify(result.body,null,2));
 const results=result.body.testResults||[];console.log(JSON.stringify({issues:result.body.issues,testResults:results.map((t,i)=>({case:i+1,state:t.state,debugMessages:t.debugMessages,errorPosition:t.errorPosition}))},null,2));
 assert.equal(results.length,cases.length);assert(results.every(t=>t.state==='SUCCESS'),'Há regras com falha no relatório.');console.log(`OK: ${cases.length} cenários de votação, prazo, fotos e denúncias.`);
}finally{await c.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
