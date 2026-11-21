// Serviço oficial de regras; somente documentos simulados, sem votos de produção.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {context}=require('./firebase-context.cjs');
(async()=>{const c=await context();try{
 const {IGOR_VOTERS,igorOptions,igorEmptyRound}=await import('../igor-poll-model.js');
 const root='/databases/(default)/documents',base=root+'/igorLive/main',uid='igor-rule-user';
 const now='2026-11-21T19:00:00.000Z',past='2026-11-21T18:00:00.000Z',tests=[],names=[];
 const mock=(fn,p,value)=>({function:fn,args:[{exactValue:p}],result:{value}});
 const profile=who=>mock('get',root+'/people/'+who,[...IGOR_VOTERS,'igor'].includes(who)?{data:{uid}}:null);
 const round=q=>base+'/rounds/'+q,answer=(q,who)=>round(q)+'/answers/'+who;
 const add=(name,t)=>{names.push(name);tests.push(t);};
 function vote({q='1',who='ob',voter=who,target='answer',choice='a',total=0,duplicate=false,sessionQuestion=Number(q),roundPatch={},countsPatch={},answerPatch={},missingAnswer=false,missingAggregate=false,guest=false,expectation='ALLOW'}={}){
  const before=igorEmptyRound(Number(q));before.total=total;before.counts[igorOptions(Number(q))[0].id]=total;
  const after=structuredClone(before);after.total++;after.counts[choice]=(after.counts[choice]||0)+1;
  Object.assign(after,roundPatch);Object.assign(after.counts,countsPatch);
  const response={choice,createdAt:now,...answerPatch};
  const session={question:sessionQuestion,startedAt:past,updatedAt:past};
  return {expectation,request:{auth:guest?null:{uid,token:{email:who+'@congresso.app'}},time:now,path:target==='round'?round(q):answer(q,voter),method:target==='round'?'update':'create',resource:{data:target==='round'?after:response}},resource:{data:target==='round'?before:response},functionMocks:[profile(who),mock('exists',base,true),mock('get',base,{data:session}),mock('getAfter',base,{data:session}),mock('exists',round(q),true),mock('get',round(q),{data:before}),mock('getAfter',round(q),missingAggregate?null:{data:after}),mock('exists',answer(q,who),duplicate),mock('get',answer(q,who),duplicate?{data:{...response,createdAt:past}}:null),mock('getAfter',answer(q,who),missingAnswer?null:{data:response})]};
 }
 function hostAction({kind='start',q=1,who='igor',total=12,step=1,sessionPatch={},roundPatch={},missingRound=false,advanceParent=true,guest=false,expectation='ALLOW'}={}){
  const creating=kind==='start',roundCreate=kind==='round-create';
  const before={question:roundCreate?q-1:q,startedAt:past,updatedAt:past};
  const after={question:creating?1:roundCreate?q:q+step,startedAt:creating?now:past,updatedAt:now,...sessionPatch};
  const nextQ=String(after.question),newRound={...igorEmptyRound(after.question),...roundPatch};
  return {expectation,request:{auth:guest?null:{uid,token:{email:who+'@congresso.app'}},time:now,path:roundCreate?round(nextQ):base,method:creating||roundCreate?'create':'update',resource:{data:roundCreate?newRound:after}},resource:{data:before},functionMocks:[profile(who),mock('exists',base,!creating&&!(roundCreate&&q===1)),mock('get',base,creating||roundCreate&&q===1?null:{data:before}),mock('getAfter',base,{data:advanceParent?after:before}),mock('get',round(String(q)),{data:{...igorEmptyRound(q),total}}),mock('exists',round(nextQ),false),mock('getAfter',round(nextQ),missingRound?null:{data:newRound})]};
 }
 add('Igor inicia',hostAction());add('primeiro agregado pareado',hostAction({kind:'round-create',q:1}));
 for(const who of ['bruno','nanu','pig','ob','kirk'])for(const kind of ['start','next'])add('só Igor controla '+who+kind,hostAction({who,kind,expectation:'DENY'}));
 add('visitante não inicia',hostAction({guest:true,expectation:'DENY'}));
 add('primeira pergunta exige agregado',hostAction({missingRound:true,expectation:'DENY'}));
 for(const sessionPatch of [{question:2},{startedAt:past},{extra:true}])add('sessão inválida '+JSON.stringify(sessionPatch),hostAction({sessionPatch,expectation:'DENY'}));
 add('agregado inicial deve estar vazio',hostAction({roundPatch:{counts:{a:1,b:0},total:1},expectation:'DENY'}));
 for(let q=1;q<=10;q++){
  for(const o of igorOptions(q))for(const target of ['answer','round'])add('opção válida '+q+o.id+target,vote({q:String(q),choice:o.id,target}));
  if(q<10){
   add('avanço após12 q'+q,hostAction({kind:'next',q}));
   for(const total of [0,1,11])add('Igor avança com '+total+' respostas q'+q,hostAction({kind:'next',q,total}));
   add('sem pular q'+q,hostAction({kind:'next',q,step:2,expectation:'DENY'}));
   add('agregado seguinte q'+(q+1),hostAction({kind:'round-create',q:q+1}));
  }
 }
 add('sem pergunta11',hostAction({kind:'next',q:10,expectation:'DENY'}));
 add('agregado não abre sozinho',hostAction({kind:'round-create',q:2,advanceParent:false,expectation:'DENY'}));
 add('próxima pergunta exige agregado',hostAction({kind:'next',missingRound:true,expectation:'DENY'}));
 add('não reinicia',hostAction({kind:'next',step:0,expectation:'DENY'}));
 add('início original imutável',hostAction({kind:'next',sessionPatch:{startedAt:now},expectation:'DENY'}));
 for(const target of ['answer','round']){
  for(const extra of [{who:'igor'},{who:'kirk'},{guest:true},{duplicate:true},{sessionQuestion:2},{choice:''},{choice:'ab'},{choice:'z'},{total:12},{roundPatch:{total:2}},{countsPatch:{b:1}},{countsPatch:{a:-1}},{countsPatch:{a:13}},{countsPatch:{a:1.5}},{countsPatch:{z:0}},{roundPatch:{extra:true}},{roundPatch:{total:1.5}},{answerPatch:{createdAt:past}},{answerPatch:{extra:true}},{answerPatch:{choice:7}},{answerPatch:{other:'texto inesperado'}}])add('voto inválido '+target+JSON.stringify(extra),vote({target,...extra,expectation:'DENY'}));
  for(const [q,choice] of [['3','y0'],['3','y31'],['3','over'],['4','y1'],['4','y6'],['4','y105'],['4','never'],['7','i'],['8','c'],['10','c']])add('fora do intervalo '+q+choice+target,vote({q,choice,target,expectation:'DENY'}));
  add('último voto permitido '+target,vote({target,total:11}));
  add('Outro apenas conta votos '+target,vote({q:'9',choice:'i',target}));
  add('Outro recusa texto adicional '+target,vote({q:'9',choice:'i',answerPatch:{other:'Madonna'},target,expectation:'DENY'}));
 }
 add('não vota pelo colega',vote({voter:'pig',expectation:'DENY'}));
 add('resposta exige agregado',vote({missingAggregate:true,expectation:'DENY'}));
 add('agregado exige resposta',vote({target:'round',missingAnswer:true,expectation:'DENY'}));
 for(const who of ['igor','ob','bruno'])for(const target of ['answer','round'])for(const method of ['update','delete']){
  if(target==='round'&&method==='update')continue;
  const t=vote({who,target,expectation:'DENY'});t.request.method=method;add('não reescreve '+who+target+method,t);
 }
 function read({q='1',who='ob',own=false,target='round',method='get',voter='pig',guest=false,sessionQuestion=Number(q),expectation='ALLOW'}={}){
  return {expectation,request:{auth:guest?null:{uid,token:{email:who+'@congresso.app'}},time:now,path:target==='session'?base:target==='round'?round(q):answer(q,voter),method},functionMocks:[profile(who),mock('exists',base,true),mock('get',base,{data:{question:sessionQuestion}}),mock('exists',answer(q,who),own)]};
 }
 add('sessão visível aos membros',read({target:'session'}));add('sessão privada',read({target:'session',guest:true,expectation:'DENY'}));
 add('Igor acompanha contagens',read({who:'igor'}));add('contagens após voto',read({own:true}));add('contagens ocultas antes do voto',read({expectation:'DENY'}));
 add('pergunta futura oculta',read({q:'2',sessionQuestion:1,own:true,expectation:'DENY'}));add('sem lista de agregados',read({who:'igor',method:'list',expectation:'DENY'}));
 add('recupera resposta própria',read({target:'answer',voter:'ob'}));add('não lê resposta alheia',read({target:'answer',expectation:'DENY'}));
 add('Igor pode recuperar respostas para exportar',read({target:'answer',who:'igor'}));add('Igor pode listar respostas abertas',read({target:'answer',who:'igor',method:'list'}));
 add('outros não listam respostas',read({target:'answer',method:'list',own:true,expectation:'DENY'}));
 add('Igor não lista pergunta futura',read({target:'answer',who:'igor',q:'2',sessionQuestion:1,method:'list',expectation:'DENY'}));
 const {Client}=require(path.join(c.root,'lib/apiv2.js')),api=require(path.join(c.root,'lib/api.js'));
 const client=new Client({urlPrefix:api.rulesOrigin(),apiVersion:'v1',auth:true}),report={issues:[],testResults:[]};
 for(let offset=0;offset<tests.length;offset+=40){
  let result;for(let retry=0;retry<3;retry++){
   try{result=await client.post('/projects/congresso-monogamico:test',{source:{files:[{name:'firestore.rules',content:fs.readFileSync('firestore.rules','utf8')}]},testSuite:{testCases:tests.slice(offset,offset+40)}},{skipLog:{body:true}});break;}
   catch(e){if(retry===2||!String(e.message).includes('503'))throw e;}
  }
  report.issues.push(...result.body.issues||[]);report.testResults.push(...result.body.testResults||[]);
 }
 fs.writeFileSync('.private/igor-rules-report.json',JSON.stringify({names,...report},null,2));
 const failed=report.testResults.flatMap((r,i)=>r.state==='SUCCESS'?[]:[{name:names[i],state:r.state,debug:r.debugMessages}]);
 console.log(JSON.stringify({total:report.testResults.length,issues:report.issues,failed},null,2));assert.equal(report.testResults.length,tests.length);assert.equal(failed.length,0);
}finally{await c.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
