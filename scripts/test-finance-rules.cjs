// Testa o texto exato das regras no serviço oficial, sem gravar dados de uso.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {context}=require('./firebase-context.cjs');
(async()=>{const c=await context();try{
 const {ALL}=await import('../roster.js');
 const prefix='/databases/(default)/documents',tests=[],names=[];
 const add=(name,t)=>{names.push(name);tests.push(t)};
 const mock=(fn,p,value)=>({function:fn,args:[{exactValue:p}],result:{value}});
 function build(type='payment',options={}){
  const user=options.user||'ob',admin=options.admin||false,time=options.time||'2026-11-22T03:00:00.000Z';
  const id=options.id||'example',method=options.method||'create',oldTime='2026-10-29T12:00:00.000Z';
  const fields=type==='payment'?{from:'ob',to:'pig',amountCents:100,kind:'payment',settlementId:'',paidOn:'2026-11-21',note:''}:type==='expense'?{title:'Mercado',cat:'mercado',amount:1,amountCents:100,payer:'pig',split:ALL}:{};
  const before=options.before|| (method==='update'?{...fields,by:user,at:'29/10 09:00',createdAt:oldTime,status:'active',version:1,updatedAt:oldTime,updatedBy:user}:{});
  const after={...fields,by:user,at:'29/10 09:00',createdAt:oldTime,status:'active',...before,...options.patch,version:method==='update'?before.version+1:1,updatedAt:time,updatedBy:user};
  if(method==='create')after.createdAt=time;
  if(type==='budget'){for(const key of Object.keys(after))delete after[key];Object.assign(after,{budget:14000,version:2,updatedAt:time,updatedBy:user});}
  if(type==='closing'){for(const key of Object.keys(after))delete after[key];Object.assign(after,{budget:14000,expenseTotalCents:100,transfers:{from:['ob'],to:['pig'],amountCents:[100]},version:1,updatedAt:time,updatedBy:user,closedAt:time,closedBy:user});}
  const eventId=`${type}_${id}_${after.version}`,event={type,recordId:id,version:after.version,action:method==='create'?'create':after.status==='cancelled'?'cancel':'update',by:user,before,after,createdAt:time};
  const collection={expense:'expenses',payment:'payments',budget:'settings',closing:'financeClosings'}[type],record=prefix+'/'+collection+'/'+id;
  const closed=options.closed||false,control={revision:5,closed,lastEvent:'previous'};
  const controlAfter={revision:6,closed:closed||type==='closing',lastEvent:eventId};
  const closing={transfers:{from:['ob'],to:['pig'],amountCents:[100]}};
  const functionMocks=[mock('get',prefix+'/people/'+user,{data:{uid:'finance-test-uid'}}),mock('exists',prefix+'/admins/finance-test-uid',admin),mock('get',prefix+'/financeControl/main',{data:control}),mock('getAfter',prefix+'/financeControl/main',{data:controlAfter}),mock('getAfter',prefix+'/financeHistory/'+eventId,{data:event}),mock('exists',record,method==='update'),mock('get',record,{data:before}),mock('getAfter',record,{data:after})];
  if(type!=='closing')functionMocks.push(mock('get',prefix+'/financeClosings/main',{data:closing}));
  const t={expectation:options.expectation||'ALLOW',request:{auth:{uid:'finance-test-uid',token:{email:user+'@congresso.app'}},time,path:record,method,resource:{data:after}},resource:{data:before},functionMocks,expressionReportLevel:'FULL'};
  return {t,event,eventId,after,before,record,control,controlAfter};
 }
 add('pagador lança',build().t);
 add('recebedor lança',build('payment',{user:'pig'}).t);
 add('terceiro negado',build('payment',{user:'luan',expectation:'DENY'}).t);
 add('ADM lança para terceiros',build('payment',{user:'bruno',admin:true}).t);
 add('pagamento antes da viagem',build('payment',{time:'2026-10-30T12:00:00Z',patch:{paidOn:'2026-10-29'}}).t);
 add('gasto novo auditado',build('expense').t);
 add('autor edita gasto',build('expense',{method:'update',patch:{title:'Mercado corrigido'}}).t);
 add('cancela sem apagar',build('expense',{method:'update',patch:{status:'cancelled'}}).t);
 add('terceiro não edita gasto',build('expense',{user:'luan',method:'update',before:{...build('expense',{method:'update'}).before,by:'ob'},expectation:'DENY'}).t);
 add('sem histórico negado',(()=>{const {t}=build();t.expectation='DENY';t.functionMocks.find(m=>m.function==='getAfter'&&m.args[0].exactValue.includes('financeHistory')).result.value=null;return t})());
 add('antes adulterado negado',(()=>{const {t,event}=build('expense',{method:'update'});t.expectation='DENY';event.before={};return t})());
 add('gasto após encerramento negado',build('expense',{closed:true,expectation:'DENY'}).t);
 add('pagamento manual após encerramento negado',build('payment',{closed:true,expectation:'DENY'}).t);
 for(const method of ['create','update'])for(const patch of [{from:'pig',to:'pig'},{amountCents:-1},{amountCents:1.5},{paidOn:'2026-11-23'},{paidOn:'2026-02-31'},{note:'x'.repeat(201)},{arbitrary:true}])add('dados inválidos '+method,build('payment',{method,patch,expectation:'DENY'}).t);
 const settlementOptions={id:'final_t0',closed:true,patch:{kind:'settlement',settlementId:'t0'}};
 add('pagador confirma final',build('payment',settlementOptions).t);
 add('recebedor confirma final',build('payment',{...settlementOptions,user:'pig'}).t);
 add('ADM confirma final',build('payment',{...settlementOptions,user:'bruno',admin:true}).t);
 add('terceiro não confirma final',build('payment',{...settlementOptions,user:'luan',expectation:'DENY'}).t);
 add('não confirma valor diferente',build('payment',{...settlementOptions,patch:{...settlementOptions.patch,amountCents:99},expectation:'DENY'}).t);
 add('não confirma antes de 22 SP',build('payment',{...settlementOptions,time:'2026-11-22T02:59:59.999Z',expectation:'DENY'}).t);
 add('não confirma sem fechar',build('payment',{...settlementOptions,closed:false,expectation:'DENY'}).t);
 add('fechamento ADM 22 SP',build('closing',{id:'main',user:'bruno',admin:true}).t);
 const full=build('closing',{id:'main',user:'bruno',admin:true});full.after.transfers={from:ALL.filter(id=>id!=='pig'),to:Array(13).fill('pig'),amountCents:Array(13).fill(100)};add('fechamento máximo 13 transferências',full.t);
 const reconfirm=build('payment',{...settlementOptions,method:'update',before:{...build('payment',{...settlementOptions,method:'update'}).before,kind:'settlement',settlementId:'t0',status:'cancelled'},patch:{...settlementOptions.patch,status:'active'}});add('reconfirma cancelada sem duplicar',reconfirm.t);
 const cancelFinal=build('payment',{...settlementOptions,method:'update',before:{...build('payment',{...settlementOptions,method:'update'}).before,kind:'settlement',settlementId:'t0'},patch:{...settlementOptions.patch,status:'cancelled'}});add('cancela confirmação final com histórico',cancelFinal.t);
 add('fechamento cedo negado',build('closing',{id:'main',user:'bruno',admin:true,time:'2026-11-22T02:59:59.999Z',expectation:'DENY'}).t);
 add('fechamento membro negado',build('closing',{id:'main',expectation:'DENY'}).t);
 for(const type of ['expense','payment','closing']){const {t}=build(type);t.request.method='delete';t.expectation='DENY';add('sem exclusão '+type,t);}
 for(const method of ['create','update','delete','get','list']){
  const {t,event,eventId}=build();t.request.path=prefix+'/financeHistory/'+eventId;t.request.method=method;t.request.resource.data=event;t.expectation=method==='update'||method==='delete'?'DENY':'ALLOW';add('histórico '+method,t);
 }
 const orphan=build();orphan.t.request.path=prefix+'/financeHistory/'+orphan.eventId;orphan.t.request.resource.data=orphan.event;orphan.t.functionMocks.find(m=>m.function==='getAfter'&&m.args[0].exactValue===orphan.record).result.value={data:{...orphan.after,version:0}};orphan.t.expectation='DENY';add('evento sem alteração negado',orphan.t);
 for(const type of ['payment','expense','closing']){const b=build(type,type==='closing'?{id:'main',user:'bruno',admin:true}:{});b.t.request.path=prefix+'/financeControl/main';b.t.request.method='update';b.t.resource={data:b.control};b.t.request.resource={data:b.controlAfter};add('controle atômico '+type,b.t);}
 const guest=build();guest.t.request.auth=null;guest.t.request.method='list';guest.t.expectation='DENY';add('visitante negado',guest.t);
 const {Client}=require(path.join(c.root,'lib/apiv2.js')),api=require(path.join(c.root,'lib/api.js')),client=new Client({urlPrefix:api.rulesOrigin(),apiVersion:'v1',auth:true});
 const response=await client.post('/projects/congresso-monogamico:test',{source:{files:[{name:'firestore.rules',content:fs.readFileSync('firestore.rules','utf8')}]},testSuite:{testCases:tests}},{skipLog:{body:true}});
 fs.writeFileSync('.private/finance-rules-report.json',JSON.stringify(response.body,null,2));
 const results=response.body.testResults||[],failed=results.map((r,i)=>({...r,name:names[i]})).filter(r=>r.state!=='SUCCESS');
 console.log(JSON.stringify({issues:response.body.issues,total:results.length,failed:failed.map(r=>({name:r.name,state:r.state,debug:r.debugMessages,error:r.errorPosition}))},null,2));
 assert.equal(results.length,tests.length);assert.equal(failed.length,0);
}finally{await c.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
