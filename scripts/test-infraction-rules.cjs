// Apenas documentos simulados no serviço oficial; não grava dados do congresso.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {context}=require('./firebase-context.cjs');
(async()=>{const c=await context();try{
 const root='/databases/(default)/documents',uid='infraction-test-user',tests=[],names=[];
 const mock=(fn,ref,value)=>({function:fn,args:[{exactValue:ref}],result:{value}});
 const add=(name,t)=>{names.push(name);tests.push(t);};
 function sample({actor='ob',admin=false,closed=false,guest=false,bound=true,method='create',id='inf_example',
  time='2026-11-20T16:00:00.000Z',patch={},beforePatch={},expectation='ALLOW'}={}){
  const data={who:'igor',d:-3,why:'Chamou o Bru pelo nome morto',kind:'inf',by:actor,at:'20/11, 13:00',createdAt:time,...patch};
  return {expectation,request:{auth:guest?null:{uid,token:{email:actor+'@congresso.app'}},time,path:root+'/points/'+id,method,resource:{data}},resource:{data:{...data,...beforePatch}},
   functionMocks:[mock('get',root+'/people/'+actor,{data:{uid:bound?uid:'different'}}),mock('exists',root+'/admins/'+uid,admin),mock('exists',root+'/scoreClosures/main',closed)],expressionReportLevel:'FULL'};
 }
 const presets=[['Lixo no chão',-5],['Louça suja pela casa',-5],['Atraso na programação',-3],['Chamou o Bru pelo nome morto',-3],['Infração da monogamia',-15]];
 for(const [why,d] of presets)for(const who of ['ob','igor'])add('membro registra '+why+' para '+who,sample({patch:{why,d,who}}));
 for(const extra of [{closed:true},{guest:true},{bound:false},{time:'2026-11-18T02:59:59.999Z'},
  {patch:{d:3}},{patch:{d:0}},{patch:{d:-30}},{patch:{d:-3.5}},{patch:{d:-101}},
  {patch:{why:'Sem look temático',d:-5}},{patch:{why:'Inventada'}},{patch:{who:'kirk'}},
  {patch:{kind:'aux'}},{patch:{kind:'jogo'}},{patch:{by:'pig'}},{patch:{by:'kirk'}},{patch:{extra:true}},
  {patch:{createdAt:'2026-11-19T16:00:00.000Z'}},{id:'manual'},{id:'task_example'},{id:'lake_100'},{id:'quiz_ob_'+uid},
  {method:'update'},{method:'delete'}])add('recusa '+JSON.stringify(extra),sample({...extra,expectation:'DENY'}));
 const missing=sample({expectation:'DENY'});delete missing.request.resource.data.by;add('recusa autor ausente',missing);
 add('ADM valor personalizado negativo',sample({actor:'bruno',admin:true,patch:{d:-7,why:'Infração personalizada'}}));
 add('ADM não falsifica autor',sample({actor:'bruno',admin:true,patch:{by:'pig'},expectation:'DENY'}));
 add('ADM corrige mantendo autor',sample({actor:'bruno',admin:true,method:'update',patch:{by:'ob'}}));
 add('ADM não muda autor da infração',sample({actor:'bruno',admin:true,method:'update',beforePatch:{by:'ob'},expectation:'DENY'}));
 add('ADM exclui infração',sample({actor:'bruno',admin:true,method:'delete'}));
 add('ADM não exclui após fechamento',sample({actor:'bruno',admin:true,method:'delete',closed:true,expectation:'DENY'}));
 add('membro lê o histórico',sample({method:'get'}));
 for(const target of ['task','point'])for(const d of [5,10]){
  const t=sample({id:'task_organizar',expectation:d===5?'ALLOW':'DENY'}),time=t.request.time;
  const task={who:'ob',d,why:'Organizar a casa',status:'ok',at:'20/11, 13:00',createdAt:time};
  const point={who:'ob',d,why:'Organizar a casa',kind:'aux',at:task.at,createdAt:time};
  t.request.path=root+(target==='task'?'/tasks/organizar':'/points/task_organizar');
  t.request.resource.data=target==='task'?task:point;
  t.functionMocks.push(mock('exists',root+'/tasks/organizar',false),mock('getAfter',root+'/tasks/organizar',{data:task}),mock('getAfter',root+'/points/task_organizar',{data:point}));
  add('organizar a casa '+target+' '+d,t);
 }
 const {Client}=require(path.join(c.root,'lib/apiv2.js')),api=require(path.join(c.root,'lib/api.js'));
 const client=new Client({urlPrefix:api.rulesOrigin(),apiVersion:'v1',auth:true});
 const result=await client.post('/projects/congresso-monogamico:test',{source:{files:[{name:'firestore.rules',content:fs.readFileSync('firestore.rules','utf8')}]},testSuite:{testCases:tests}},{skipLog:{body:true}});
 fs.writeFileSync('.private/infraction-rules-report.json',JSON.stringify(result.body,null,2));
 const rows=result.body.testResults||[],failed=rows.flatMap((r,i)=>r.state==='SUCCESS'?[]:[{name:names[i],...r}]);
 console.log(JSON.stringify({total:rows.length,issues:result.body.issues,failed:failed.map(({name,state,error})=>({name,state,error}))},null,2));
 assert.equal(rows.length,tests.length);assert.equal(failed.length,0);
}finally{await c.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
