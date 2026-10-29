// Avalia as regras exatas com documentos simulados, sem escrever no banco.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {context}=require('./firebase-context.cjs');
(async()=>{const c=await context();try{
 const {ALL,EMOJIS}=await import('../roster.js'),{applyBallot,dayKey}=await import('../shared.js');
 const key=dayKey(),uid='test-rule-uid',prefix='/databases/(default)/documents',base=prefix+'/querido/'+key;
 const source=fs.readFileSync('firestore.rules','utf8'),ballot=id=>Object.fromEntries(ALL.filter(x=>x!==id).map(x=>[x,EMOJIS[0]]));
 const first=applyBallot(undefined,ballot('bruno'),'bruno'),second=applyBallot(first,ballot('ob'),'ob');
 const mock=(name,p,value)=>({function:name,args:[{exactValue:p}],result:{value}});
 function make(id,next,previous,marker=false){
  const auth={uid,token:{email:id+'@congresso.app'}},mocks=[mock('get',prefix+'/people/'+id,{data:{uid}}),mock('exists',base+'/voters/'+uid,false),mock('getAfter',base+'/voters/'+uid,{data:{voted:true}}),mock('exists',base,!!previous),mock('get',base,{data:previous||{voters:0}}),mock('getAfter',base,{data:next})];
  return structuredClone({expectation:'ALLOW',request:{auth,time:new Date().toISOString(),path:marker?base+'/voters/'+uid:base,method:previous&&!marker?'update':'create',resource:{data:marker?{voted:true}:next}},...(previous?{resource:{data:previous}}:{}),functionMocks:mocks,expressionReportLevel:'FULL'});
 }
 const cases=[make('bruno',first),make('bruno',first,null,true),make('ob',second,first),make('ob',second,first,true)];
 const doubled=make('bruno',first);doubled.expectation='DENY';doubled.request.resource.data.counts.ob+=2;cases.push(doubled);
 const self=make('bruno',first);self.expectation='DENY';self.request.resource.data.counts.bruno=1;cases.push(self);
 const missing=make('bruno',first);missing.expectation='DENY';delete missing.request.resource.data.counts.ob;cases.push(missing);
 const duplicate=make('ob',second,first);duplicate.expectation='DENY';duplicate.functionMocks.find(m=>m.function==='exists'&&m.args[0].exactValue.endsWith('/voters/'+uid)).result.value=true;cases.push(duplicate);
 const alone=make('ob',second,first,true);alone.expectation='DENY';alone.functionMocks.find(m=>m.function==='getAfter'&&m.args[0].exactValue===base).result.value={data:first};cases.push(alone);
 const {Client}=require(path.join(c.root,'lib/apiv2.js')),api=require(path.join(c.root,'lib/api.js'));
 const client=new Client({urlPrefix:api.rulesOrigin(),apiVersion:'v1',auth:true});
 const result=await client.post('/projects/congresso-monogamico:test',{source:{files:[{name:'firestore.rules',content:source}]},testSuite:{testCases:cases}},{skipLog:{body:true}});
 fs.writeFileSync('.private/rules-report.json',JSON.stringify(result.body,null,2));
 const results=result.body.testResults||[];console.log(JSON.stringify({issues:result.body.issues,testResults:results.map((t,i)=>({case:i+1,state:t.state,debugMessages:t.debugMessages,errorPosition:t.errorPosition}))},null,2));
 assert.equal(results.length,cases.length);assert(results.every(t=>t.state==='SUCCESS'),'Há regras com falha no relatório.');console.log('OK: nove cenários, inclusive primeiro voto, atualização, voto próprio, adulteração e repetição.');
}finally{await c.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});