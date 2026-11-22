// Serviço oficial de regras, exclusivamente com documentos simulados.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {context}=require('./firebase-context.cjs');
(async()=>{const c=await context();try{
 const m=await import('../presentation-ranking-model.js');const {ALL}=await import('../roster.js');
 const root='/databases/(default)/documents',tally=root+'/presentationTallies/main',now='2026-11-22T06:00:00.000Z',past='2026-11-22T04:00:00.000Z',uid='ranking-user';
 const cases=[],names=[],mock=(fn,p,value)=>({function:fn,args:[{exactValue:p}],result:{value}}),add=(name,t)=>{names.push(name);cases.push(t);};
 const zero={voters:0,sums:Object.fromEntries(m.PRESENTERS.map(id=>[id,0])),samples:Object.fromEntries(m.PRESENTERS.map(id=>[id,0]))};
 function vote({who='ibrahim',target='ballot',updating=false,order=m.rankingCandidates(who),duplicate=false,marker=true,guest=false,profileUid=uid,time=now,ballotPatch={},tallyPatch={},tamperSum=false,tamperSample=false,missingTally=false,missingBallot=false,expectation='ALLOW',method}={}){
  const valid=m.rankingDelta(who,m.rankingCandidates(who));
  const before=updating?m.rankingDelta('ob',m.rankingCandidates('ob')):zero;
  const after={voters:before.voters+1,sums:Object.fromEntries(m.PRESENTERS.map(id=>[id,before.sums[id]+valid.sums[id]])),samples:Object.fromEntries(m.PRESENTERS.map(id=>[id,before.samples[id]+valid.samples[id]])),...tallyPatch};
  if(tamperSum)after.sums.ob++;if(tamperSample)after.samples.ob++;
  const data={order,scores:valid.sums,createdAt:time,...ballotPatch},ballot=root+'/presentationBallots/'+who;
  return {expectation,request:{auth:guest?null:{uid,token:{email:who+'@congresso.app'}},time,path:target==='ballot'?ballot:tally,method:method||(target==='tally'&&updating?'update':'create'),resource:{data:target==='ballot'?data:after}},resource:{data:target==='ballot'?{order:m.rankingCandidates(who),createdAt:past}:before},functionMocks:[mock('get',root+'/people/'+who,{data:{uid:profileUid}}),mock('exists',root+'/querido/20779/voters/'+uid,marker),mock('exists',ballot,duplicate),mock('getAfter',ballot,missingBallot?null:{data}),mock('exists',tally,updating),mock('get',tally,updating?{data:before}:null),mock('getAfter',tally,missingTally?null:{data:after})]};
 }
 for(const who of ALL)for(const target of ['ballot','tally'])for(const updating of [false,true])add('voto '+who+target+updating,vote({who,target,updating}));
 for(const target of ['ballot','tally']){
  for(const extra of [{marker:false},{guest:true},{profileUid:'other'},{order:m.rankingCandidates('ibrahim').slice(1)},{order:[...m.rankingCandidates('ibrahim'),'ibrahim']},{order:m.rankingCandidates('ibrahim').map((id,i)=>i===0?'estranho':id)},{order:m.rankingCandidates('ibrahim').map((id,i)=>i===0?'ob':id)},{ballotPatch:{createdAt:past}},{ballotPatch:{extra:1}},{tallyPatch:{extra:1}},{tallyPatch:{voters:3}},{tamperSum:true},{tamperSample:true},{missingTally:true},{missingBallot:true}]){
   if(target==='ballot'&&extra.missingBallot||target==='tally'&&extra.missingTally)continue;
   add('inválido '+target+JSON.stringify(extra),vote({target,...extra,expectation:'DENY'}));
  }
  for(const time of ['2026-11-22T02:59:59.999Z','2026-11-22T15:00:00.000Z'])add('prazo '+target+time,vote({target,time,expectation:'DENY'}));
  add('último milissegundo '+target,vote({target,time:'2026-11-22T14:59:59.999Z'}));
 }
 add('tally duplicado',vote({target:'tally',updating:true,duplicate:true,expectation:'DENY'}));
 const scores=m.rankingDelta('ibrahim',m.rankingCandidates('ibrahim')).sums;
 for(const target of ['ballot','tally'])for(const bad of [{...scores,ibrahim:110},{...scores,ob:999},{...scores,extra:0},{}])add('pontuação forjada '+target+JSON.stringify(bad),vote({target,ballotPatch:{scores:bad},expectation:'DENY'}));
 for(const method of ['update','delete'])add('voto imutável '+method,vote({method,expectation:'DENY'}));
 function read({target='ballot',who='ob',owner=who,time=now,method='get',guest=false,expectation='ALLOW'}={}){return {expectation,request:{auth:guest?null:{uid,token:{email:who+'@congresso.app'}},time,path:target==='tally'?tally:root+'/presentationBallots/'+owner,method},functionMocks:[mock('get',root+'/people/'+who,{data:{uid}})]};}
 add('recupera próprio voto',read());add('não lê colega',read({owner:'ibrahim',expectation:'DENY'}));add('sem lista votos',read({method:'list',expectation:'DENY'}));add('sem prévia agregado',read({target:'tally',expectation:'DENY'}));add('resultado liberado',read({target:'tally',time:'2026-11-22T15:00:00Z'}));add('visitante sem resultado',read({target:'tally',time:'2026-11-22T15:00:00Z',guest:true,expectation:'DENY'}));
 const fixture={voters:13,sums:Object.fromEntries(m.PRESENTERS.map((id,i)=>[id,(12-i)*100])),samples:Object.fromEntries(m.PRESENTERS.map(id=>[id,12]))};
 function award({who='bruno',target='bruno',d=20,method='create',time='2026-11-22T15:00:00Z',closed=false,values=fixture,patch={},expectation='ALLOW',id='presentation_'+target}={}){
  const data={who:target,d,kind:'jogo',why:m.PRESENTATION_REASON,at:'22/11,12:00',createdAt:time,...patch};
  return {expectation,request:{auth:{uid,token:{email:who+'@congresso.app'}},time,path:root+'/points/'+id,method,resource:{data}},resource:{data},functionMocks:[mock('get',root+'/people/'+who,{data:{uid}}),mock('exists',root+'/admins/'+uid,true),mock('exists',root+'/scoreClosures/main',closed),mock('get',tally,{data:values})]};
 }
 for(const who of ALL)for(const [target,d]of [['bruno',20],['ob',10],['luan',5]])add('prêmio '+who+target,award({who,target,d}));
 for(const extra of [{target:'igor',d:5},{d:10},{target:'diogo',d:20},{id:'presentation_pig'},{time:now},{closed:true},{patch:{why:'Inventado'}},{patch:{kind:'aux'}},{patch:{extra:1}}])add('bônus recusado '+JSON.stringify(extra),award({...extra,expectation:'DENY'}));
 for(const method of ['update','delete'])add('nem ADM altera bônus '+method,award({method,expectation:'DENY'}));
 const tie=structuredClone(fixture);tie.sums.ob=tie.sums.bruno;
 add('empate primeiro',award({target:'ob',values:tie}));add('após empate é terceiro',award({target:'luan',d:5,values:tie}));add('sem segundo após empate',award({target:'luan',d:10,values:tie,expectation:'DENY'}));
 const none=structuredClone(zero);add('sem prêmio vazio',award({values:none,expectation:'DENY'}));
 const {Client}=require(path.join(c.root,'lib/apiv2.js')),api=require(path.join(c.root,'lib/api.js'));
 const client=new Client({urlPrefix:api.rulesOrigin(),apiVersion:'v1',auth:true}),report={issues:[],testResults:[]};
 for(let offset=0;offset<cases.length;offset+=30){const r=await client.post('/projects/congresso-monogamico:test',{source:{files:[{name:'firestore.rules',content:fs.readFileSync('firestore.rules','utf8')}]},testSuite:{testCases:cases.slice(offset,offset+30)}},{skipLog:{body:true}});report.issues.push(...r.body.issues||[]);report.testResults.push(...r.body.testResults||[]);}
 fs.writeFileSync('.private/presentation-ranking-rules-report.json',JSON.stringify({names,...report},null,2));
 const failed=report.testResults.flatMap((r,i)=>r.state==='SUCCESS'?[]:[{name:names[i],state:r.state,debug:r.debugMessages}]);console.log(JSON.stringify({total:report.testResults.length,issues:report.issues,failed},null,2));assert.equal(report.testResults.length,cases.length);assert.equal(failed.length,0);
}finally{await c.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
