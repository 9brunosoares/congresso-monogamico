// Ensaio Nanu/Bru no serviço oficial, somente com dados simulados.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {context}=require('./firebase-context.cjs');
(async()=>{const c=await context();try{
 const {ALL}=await import('../roster.js');
 const root='/databases/(default)/documents',base=root+'/nanuLive/teste',uid='rehearsal-test-user',now='2026-11-21T20:00:00.000Z',past='2026-11-21T19:00:00.000Z';
 const empty={a:0,b:0,c:0,total:0},tests=[],names=[];
 const round=q=>base+'/rounds/'+q,answer=q=>round(q)+'/answers/bruno';
 const mock=(fn,p,value)=>({function:fn,args:[{exactValue:p}],result:{value}});
 const profile=who=>mock('get',root+'/people/'+who,ALL.includes(who)?{data:{uid}}:null);
 const add=(name,t)=>{names.push(name);tests.push(t);};
 function vote({q='1',who='bruno',voter='bruno',target='answer',choice='a',text='Sem pressa',total=0,duplicate=false,current=Number(q),missingAnswer=false,missingRound=false,patch={},answerPatch={},guest=false,expectation='ALLOW'}={}){
  const before={...empty,total,a:q==='11'?0:total},after={...before,total:total+1};if(q!=='11')after[choice]=(after[choice]||0)+1;Object.assign(after,patch);
  const value={...(q==='11'?{text}:{choice}),createdAt:now,...answerPatch};
  return {expectation,request:{auth:guest?null:{uid,token:{email:who+'@congresso.app'}},time:now,path:target==='round'?round(q):round(q)+'/answers/'+voter,method:target==='round'?'update':'create',resource:{data:target==='round'?after:value}},resource:{data:target==='round'?before:value},functionMocks:[profile(who),mock('exists',base,true),mock('get',base,{data:{question:current}}),mock('exists',answer(q),duplicate),mock('get',round(q),{data:before}),mock('getAfter',round(q),missingRound?null:{data:after}),mock('getAfter',answer(q),missingAnswer?null:{data:value})]};
 }
 function host({kind='start',q=1,who='nanu',total=1,step=1,patch={},roundPatch={},missingRound=false,parent=true,expectation='ALLOW'}={}){
  const start=kind==='start',child=kind==='round',before={question:child?q-1:q,startedAt:past,updatedAt:past};
  const next={question:start?1:child?q:q+step,startedAt:start?now:past,updatedAt:now,...patch},nextQ=String(next.question),data={...empty,...roundPatch};
  return {expectation,request:{auth:{uid,token:{email:who+'@congresso.app'}},time:now,path:child?round(nextQ):base,method:start||child?'create':'update',resource:{data:child?data:next}},resource:{data:before},functionMocks:[profile(who),mock('exists',base,!start&&!(child&&q===1)),mock('get',base,start||child&&q===1?null:{data:before}),mock('getAfter',base,{data:parent?next:before}),mock('get',round(String(q)),{data:{...empty,a:total,total}}),mock('exists',round(nextQ),false),mock('getAfter',round(nextQ),missingRound?null:{data})]};
 }
 add('Nanu inicia ensaio',host());add('primeiro agregado pareado',host({kind:'round'}));
 for(const who of ['bruno','igor','pig','ob','kirk'])for(const kind of ['start','next'])add('controle exclusivo Nanu '+who+kind,host({who,kind,expectation:'DENY'}));
 for(let q=1;q<=10;q++){
  for(const choice of ['a','b',...([8,9].includes(q)?[]:['c'])])for(const target of ['answer','round'])add('Bru vota '+q+choice+target,vote({q:String(q),choice,target}));
  add('avança com uma resposta q'+q,host({kind:'next',q}));
  add('aguarda Bru q'+q,host({kind:'next',q,total:0,expectation:'DENY'}));
  add('sem pular pergunta q'+q,host({kind:'next',q,step:2,expectation:'DENY'}));
  add('agregado seguinte q'+(q+1),host({kind:'round',q:q+1}));
 }
 for(const target of ['answer','round']){
  for(const extra of [{who:'nanu'},{who:'igor'},{who:'pig'},{who:'ob'},{who:'kirk'},{guest:true},{duplicate:true},{total:1},{current:2},{choice:'d'},{choice:''},{patch:{total:0}},{patch:{a:2,total:1}},{patch:{b:1}},{patch:{extra:true}},{patch:{a:1.5}},{answerPatch:{extra:true}},{answerPatch:{createdAt:past}}])add('recusa voto '+target+JSON.stringify(extra),vote({target,...extra,expectation:'DENY'}));
  for(const q of ['8','9'])add('C inexistente '+q+target,vote({q,target,choice:'c',expectation:'DENY'}));
  add('Bru envia palpite final '+target,vote({q:'11',target}));
  add('texto140 '+target,vote({q:'11',target,text:'a'.repeat(140)}));
  for(const text of ['', '  ', '\t', 'a'.repeat(141),123])add('texto inválido '+target+String(text).slice(0,8),vote({q:'11',target,text,expectation:'DENY'}));
 }
 add('não vota como outro perfil',vote({voter:'nanu',expectation:'DENY'}));
 add('resposta exige incremento',vote({missingRound:true,expectation:'DENY'}));add('incremento exige resposta',vote({target:'round',missingAnswer:true,expectation:'DENY'}));
 add('sem pergunta12',host({kind:'next',q:11,expectation:'DENY'}));add('agregado não abre sozinho',host({kind:'round',q:2,parent:false,expectation:'DENY'}));
 for(const extra of [{missingRound:true},{patch:{question:2}},{patch:{startedAt:past}},{roundPatch:{a:1,total:1}},{patch:{extra:true}}])add('início inválido '+JSON.stringify(extra),host({...extra,expectation:'DENY'}));
 function read({who='bruno',target='session',q='1',voter='bruno',method='get',own=false,current=Number(q),expectation='ALLOW'}={}){
  return {expectation,request:{auth:{uid,token:{email:who+'@congresso.app'}},time:now,path:target==='session'?base:target==='round'?round(q):round(q)+'/answers/'+voter,method},functionMocks:[profile(who),mock('exists',base,true),mock('get',base,{data:{question:current}}),mock('exists',answer(q),own)]};
 }
 for(const who of ['nanu','bruno'])add('participa do ensaio '+who,read({who}));
 for(const who of ['igor','pig','ob','kirk'])for(const target of ['session','round','answer'])add('ensaio privado '+who+target,read({who,target,q:'11',own:true,expectation:'DENY'}));
 add('Nanu vê contagens',read({who:'nanu',target:'round'}));add('Bru não antecipa resultado',read({target:'round',expectation:'DENY'}));add('Bru vê após votar',read({target:'round',own:true}));
 add('Bru recupera recibo',read({target:'answer'}));add('Nanu não lê voto individual',read({who:'nanu',target:'answer',expectation:'DENY'}));
 for(const method of ['get','list']){
  add('Nanu vê nuvem '+method,read({who:'nanu',q:'11',target:'answer',method}));
  add('Bru vê nuvem após enviar '+method,read({q:'11',target:'answer',method,own:true}));
  if(method==='list')add('Bru não lê nuvem antes de enviar',read({q:'11',target:'answer',method,expectation:'DENY'}));
 }
 for(const who of ['nanu','bruno'])for(const target of ['session','round','answer'])for(const method of ['update','delete']){
  if(method==='update'&&target!=='answer')continue;
  const t=read({who,target,own:true,expectation:'DENY'});t.request.method=method;t.request.resource={data:{}};t.resource={data:{}};add('imutável '+who+target+method,t);
 }
 const {Client}=require(path.join(c.root,'lib/apiv2.js')),api=require(path.join(c.root,'lib/api.js')),client=new Client({urlPrefix:api.rulesOrigin(),apiVersion:'v1',auth:true});
 const report={issues:[],testResults:[]};
 for(let offset=0;offset<tests.length;offset+=40){const r=await client.post('/projects/congresso-monogamico:test',{source:{files:[{name:'firestore.rules',content:fs.readFileSync('firestore.rules','utf8')}]},testSuite:{testCases:tests.slice(offset,offset+40)}},{skipLog:{body:true}});report.issues.push(...r.body.issues||[]);report.testResults.push(...r.body.testResults||[]);}
 fs.writeFileSync('.private/nanu-rehearsal-rules-report.json',JSON.stringify({names,...report},null,2));
 const failed=report.testResults.flatMap((r,i)=>r.state==='SUCCESS'?[]:[{name:names[i],state:r.state,debug:r.debugMessages}]);
 console.log(JSON.stringify({total:report.testResults.length,issues:report.issues,failed}));assert.equal(report.testResults.length,tests.length);assert.equal(failed.length,0);
}finally{await c.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
