// Valida a fonte exata no serviço oficial com dados simulados, sem gravar votos.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {context}=require('./firebase-context.cjs');
(async()=>{const c=await context();try{
 const {NANU_VOTERS}=await import('../nanu-poll-model.js');
 const root='/databases/(default)/documents',base=root+'/nanuLive/main',uid='nanu-rule-user';
 const now='2026-11-21T18:00:00.000Z',past='2026-11-21T17:00:00.000Z';
 const empty={a:0,b:0,c:0,total:0},tests=[],names=[];
 const mock=(fn,p,value)=>({function:fn,args:[{exactValue:p}],result:{value}});
 const profile=who=>mock('get',root+'/people/'+who,[...NANU_VOTERS,'nanu'].includes(who)?{data:{uid}}:null);
 const round=q=>base+'/rounds/'+q,answer=(q,who)=>round(q)+'/answers/'+who;
 const add=(name,t)=>{names.push(name);tests.push(t);};
 function vote({q='1',who='ob',voter=who,target='answer',choice='a',text='Exigente',total=0,duplicate=false,sessionQuestion=Number(q),roundPatch={},answerPatch={},missingAnswer=false,missingAggregate=false,guest=false,expectation='ALLOW'}={}){
  const before={a:q==='11'?0:total,b:0,c:0,total},after={...before,total:total+1};
  if(q!=='11'&&['a','b','c'].includes(choice))after[choice]++;
  Object.assign(after,roundPatch);
  const response={...(q==='11'?{text}:{choice}),createdAt:now,...answerPatch};
  const session={question:sessionQuestion,startedAt:past,updatedAt:past};
  return {expectation,request:{auth:guest?null:{uid,token:{email:who+'@congresso.app'}},time:now,
   path:target==='round'?round(q):answer(q,voter),method:target==='round'?'update':'create',resource:{data:target==='round'?after:response}},
   resource:{data:target==='round'?before:response},functionMocks:[profile(who),mock('exists',base,true),mock('get',base,{data:session}),mock('getAfter',base,{data:session}),
    mock('exists',round(q),true),mock('get',round(q),{data:before}),mock('getAfter',round(q),missingAggregate?null:{data:after}),
    mock('exists',answer(q,who),duplicate),mock('get',answer(q,who),duplicate?{data:{...response,createdAt:past}}:null),
    mock('getAfter',answer(q,who),missingAnswer?null:{data:response})],expressionReportLevel:'FULL'};
 }
 function hostAction({kind='start',q=1,who='nanu',total=12,step=1,sessionPatch={},roundPatch={},missingRound=false,advanceParent=true,guest=false,expectation='ALLOW'}={}){
  const creating=kind==='start',roundCreate=kind==='round-create';
  const before={question:roundCreate?q-1:q,startedAt:past,updatedAt:past};
  const after={question:creating?1:roundCreate?q:q+step,startedAt:creating?now:past,updatedAt:now,...sessionPatch};
  const nextQ=String(after.question),previousQ=String(q),newRound={...empty,...roundPatch};
  return {expectation,request:{auth:guest?null:{uid,token:{email:who+'@congresso.app'}},time:now,
   path:roundCreate?round(nextQ):base,method:creating||roundCreate?'create':'update',resource:{data:roundCreate?newRound:after}},
   resource:{data:before},functionMocks:[profile(who),mock('exists',base,!creating&&!(roundCreate&&q===1)),mock('get',base,creating||roundCreate&&q===1?null:{data:before}),
    mock('getAfter',base,{data:advanceParent?after:before}),mock('get',round(previousQ),{data:{a:total,b:0,c:0,total}}),
    mock('exists',round(nextQ),false),mock('getAfter',round(nextQ),missingRound?null:{data:newRound})],expressionReportLevel:'FULL'};
 }
 add('Nanu inicia e prepara primeira pergunta',hostAction());
 add('primeiro agregado pareado',hostAction({kind:'round-create',q:1}));
 for(const who of ['bruno','igor','pig','ob','kirk']){
  add('outro perfil não inicia '+who,hostAction({who,expectation:'DENY'}));
  add('outro perfil não avança '+who,hostAction({kind:'next',who,expectation:'DENY'}));
 }
 add('visitante não inicia',hostAction({guest:true,expectation:'DENY'}));
 add('início exige agregado',hostAction({missingRound:true,expectation:'DENY'}));
 add('início não aceita contagens prontas',hostAction({roundPatch:{a:1,total:1},expectation:'DENY'}));
 for(const sessionPatch of [{question:2},{startedAt:past},{extra:true}])add('início inválido '+JSON.stringify(sessionPatch),hostAction({sessionPatch,expectation:'DENY'}));
 for(let q=1;q<=10;q++){
  add('Nanu avança após12 q'+q,hostAction({kind:'next',q}));
  add('prepara próximo agregado q'+(q+1),hostAction({kind:'round-create',q:q+1}));
  add('não avança com11 q'+q,hostAction({kind:'next',q,total:11,expectation:'DENY'}));
  add('não pula pergunta q'+q,hostAction({kind:'next',q,step:2,expectation:'DENY'}));
  for(const choice of ['a','b',...(q===8||q===9?[]:['c'])])for(const target of ['answer','round'])add('voto pareado '+q+choice+target,vote({q:String(q),choice,target}));
 }
 add('não há pergunta12',hostAction({kind:'next',q:11,expectation:'DENY'}));
 add('agregado não abre sozinho',hostAction({kind:'round-create',q:2,advanceParent:false,expectation:'DENY'}));
 add('próxima pergunta exige agregado vazio',hostAction({kind:'next',missingRound:true,expectation:'DENY'}));
 add('não reinicia primeira pergunta',hostAction({kind:'next',step:0,expectation:'DENY'}));
 add('não altera início original',hostAction({kind:'next',sessionPatch:{startedAt:now},expectation:'DENY'}));
 for(const target of ['answer','round']){
  for(const extra of [{who:'nanu'},{who:'kirk'},{guest:true},{duplicate:true},{sessionQuestion:2},{choice:''},{choice:'ab'},{choice:'d'},{total:12},
   {roundPatch:{total:2}},{roundPatch:{b:1}},{roundPatch:{a:-1}},{roundPatch:{a:13}},{roundPatch:{extra:true}},{roundPatch:{total:1.5}},
   {answerPatch:{createdAt:past}},{answerPatch:{extra:true}},{answerPatch:{choice:7}}])add('recusa voto '+target+JSON.stringify(extra),vote({target,...extra,expectation:'DENY'}));
  for(const q of ['8','9'])add('sem alternativaC q'+q+target,vote({q,target,choice:'c',expectation:'DENY'}));
  add('último voto permitido '+target,vote({target,total:11}));
  add('campo aberto pareado '+target,vote({q:'11',target}));
  add('texto140 '+target,vote({q:'11',target,text:'a'.repeat(140)}));
  for(const text of ['', '   ', '\t', 'a'.repeat(141), 123])add('texto inválido '+target+String(text).slice(0,20),vote({q:'11',target,text,expectation:'DENY'}));
 }
 add('voto não altera colega',vote({voter:'pig',expectation:'DENY'}));
 add('resposta precisa do agregado',vote({missingAggregate:true,expectation:'DENY'}));
 add('agregado precisa de resposta',vote({target:'round',missingAnswer:true,expectation:'DENY'}));
 for(const who of ['nanu','ob','bruno'])for(const target of ['answer','round'])for(const method of ['update','delete']){
  if(target==='round'&&method==='update')continue;
  const t=vote({who,target});t.request.method=method;t.expectation='DENY';add('imutável '+who+target+method,t);
 }
 function read({q='1',who='ob',target='round',method='get',own=false,voter='pig',sessionQuestion=Number(q),guest=false,expectation='ALLOW'}={}){
  const t=vote({q,who,target,duplicate:own,voter,sessionQuestion,guest,expectation});t.request.method=method;return t;
 }
 add('Nanu acompanha contagens',read({who:'nanu'}));
 add('contagens depois do próprio voto',read({own:true}));
 add('contagens ocultas antes de responder',read({expectation:'DENY'}));
 add('pergunta futura não pode ser lida',read({q:'2',sessionQuestion:1,own:true,expectation:'DENY'}));
 add('lista de agregados negada',read({who:'nanu',method:'list',expectation:'DENY'}));
 add('resposta própria pode ser recuperada',read({target:'answer',voter:'ob'}));
 add('resposta alheia não aparece',read({target:'answer',expectation:'DENY'}));
 add('Nanu também não vê voto individual',read({target:'answer',who:'nanu',expectation:'DENY'}));
 for(const method of ['get','list']){
  add('Nanu vê nuvem '+method,read({q:'11',who:'nanu',target:'answer',method}));
  add('participante vê nuvem depois do palpite '+method,read({q:'11',own:true,target:'answer',method}));
  add('nuvem escondida antes do palpite '+method,read({q:'11',target:'answer',method,expectation:'DENY'}));
  add('nuvem futura escondida '+method,read({q:'11',sessionQuestion:10,own:true,target:'answer',method,expectation:'DENY'}));
  add('visitante não vê nuvem '+method,read({q:'11',guest:true,target:'answer',method,expectation:'DENY'}));
 }
 const {Client}=require(path.join(c.root,'lib/apiv2.js')),api=require(path.join(c.root,'lib/api.js'));
 const client=new Client({urlPrefix:api.rulesOrigin(),apiVersion:'v1',auth:true}),report={issues:[],testResults:[]};
 for(let offset=0;offset<tests.length;offset+=50){
  let r;for(let retry=0;retry<3;retry++){
   try{r=await client.post('/projects/congresso-monogamico:test',{source:{files:[{name:'firestore.rules',content:fs.readFileSync('firestore.rules','utf8')}]},testSuite:{testCases:tests.slice(offset,offset+50)}},{skipLog:{body:true}});break;}
   catch(error){if(retry===2||!String(error.message).includes('503'))throw error;await new Promise(resolve=>setTimeout(resolve,1000*(retry+1)));}
  }
  report.issues.push(...r.body.issues||[]);report.testResults.push(...r.body.testResults||[]);
 }
 fs.writeFileSync('.private/nanu-rules-report.json',JSON.stringify({names,...report},null,2));
 const failed=report.testResults.flatMap((r,i)=>r.state==='SUCCESS'?[]:[{name:names[i],...r}]);
 console.log(JSON.stringify({total:report.testResults.length,issues:report.issues,failed},null,2));
 assert.equal(report.testResults.length,tests.length);assert.equal(failed.length,0);
}finally{await c.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
