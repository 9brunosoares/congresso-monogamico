const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {context}=require('./firebase-context.cjs');
(async()=>{const c=await context();try{
 const root='/databases/(default)/documents',uid='review-test',keys=['geral','chacara','comida','programacao','organizacao','app'];
 const empty={voters:0,ratings:Object.fromEntries(keys.map(k=>[k,0])),suggestions:[]};
 const suggestion={id:'0123456789abcdef0123456789abcdef',text:'Mais tempo livre!'};
 const mock=(fn,ref,value)=>({function:fn,args:[{exactValue:ref}],result:{value}}),tests=[],names=[];
 function sample({method='create',marker=false,actor='ob',bound=true,guest=false,admin=false,voted=false,pair=true,before=empty,after,ref='congressReviews/xvi',patch={}}={}){
  after??={voters:before.voters+1,ratings:Object.fromEntries(keys.map(k=>[k,before.ratings[k]+65536])),suggestions:before.suggestions};
  const tally=root+'/congressReviews/xvi',receipt=root+'/congressReviewVoters/'+uid;
  return {expectation:'ALLOW',request:{auth:guest?null:{uid,token:{email:actor+'@congresso.app'}},time:'2026-11-22T20:00:00.000Z',path:root+'/'+(marker?'congressReviewVoters/'+uid:ref),method,resource:{data:marker?{voted:true,...patch}:{...after,...patch}}},resource:{data:marker?{voted:true}:before},functionMocks:[mock('get',root+'/people/'+actor,{data:{uid:bound?uid:'other'}}),mock('exists',root+'/admins/'+uid,admin),mock('exists',receipt,voted),mock('getAfter',receipt,{data:{voted:pair}}),mock('exists',tally,before.voters>0),mock('get',tally,{data:before}),mock('getAfter',tally,{data:pair?after:before})],expressionReportLevel:'FULL'};
 }
 function add(name,opts={},allow=true){names.push(name);tests.push({...sample(opts),expectation:allow?'ALLOW':'DENY'});}
 for(let i=0;i<=5;i++)add('primeira nota '+i,{after:{voters:1,ratings:Object.fromEntries(keys.map(k=>[k,16**i])),suggestions:[]}});
 const before={voters:2,ratings:Object.fromEntries(keys.map(k=>[k,17])),suggestions:[suggestion]};
 add('atualiza preservando sugestao',{method:'update',before});
 add('acrescenta sugestao',{after:{voters:1,ratings:Object.fromEntries(keys.map(k=>[k,1])),suggestions:[suggestion]}});
 add('textos iguais preservados com ids diferentes',{method:'update',before,after:{voters:3,ratings:Object.fromEntries(keys.map(k=>[k,18])),suggestions:[suggestion,{...suggestion,id:'abcdef0123456789abcdef0123456789'}]}});
 add('recibo com agregado',{marker:true});add('recibo na atualizacao',{marker:true,before});
 for(const opt of [{guest:true},{bound:false},{voted:true},{pair:false},{method:'delete'},{method:'update',before,patch:{voters:5}},{patch:{uid}},{patch:{createdAt:'2026-11-22'}},{ref:'congressReviews/outra'}])add('recusa '+JSON.stringify(opt),opt,false);
 for(const val of [-1,0,2,15,17,16**6,1.5])add('delta invalido '+val,{patch:{ratings:{...empty.ratings,...Object.fromEntries(keys.map(k=>[k,val]))}}},false);
 for(const k of keys){const t=sample();delete t.request.resource.data.ratings[k];names.push('falta '+k);tests.push({...t,expectation:'DENY'});}
 add('nota extra',{patch:{ratings:{...Object.fromEntries(keys.map(k=>[k,1])),autor:1}}},false);
 const full={...before,voters:13};add('limite13',{method:'update',before:full},false);
 for(const s of [[{...suggestion,text:'x'.repeat(1501)}],[{...suggestion,by:'ob'}],[{...suggestion,id:'ob'}],[{...suggestion,text:''}],[suggestion,suggestion]])add('sugestao invalida',{patch:{suggestions:s}},false);
 add('nao remove sugestao',{method:'update',before,patch:{suggestions:[]}},false);
 add('nao altera sugestao',{method:'update',before,patch:{suggestions:[{...suggestion,text:'Alterada'}]}},false);
 add('admin le agregado',{method:'get',admin:true});add('membro nao le agregado',{method:'get'},false);add('admin nao lista',{method:'list',admin:true},false);add('admin nao apaga',{method:'delete',admin:true},false);add('admin nao edita sem recibo',{method:'update',admin:true,voted:true},false);
 for(const opt of [{pair:false},{guest:true},{bound:false},{patch:{voted:false}},{patch:{ratings:{}}},{method:'update'},{method:'delete'},{method:'list'}])add('recibo recusa '+JSON.stringify(opt),{marker:true,...opt},false);
 add('proprio recibo',{marker:true,method:'get'});
 const foreign=sample({marker:true,method:'get'});foreign.request.path=root+'/congressReviewVoters/other';tests.push({...foreign,expectation:'DENY'});names.push('recibo alheio negado');
 const {Client}=require(path.join(c.root,'lib/apiv2.js')),api=require(path.join(c.root,'lib/api.js'));
 const client=new Client({urlPrefix:api.rulesOrigin(),apiVersion:'v1',auth:true});
 const result=await client.post('/projects/congresso-monogamico:test',{source:{files:[{name:'firestore.rules',content:fs.readFileSync('firestore.rules','utf8')}]},testSuite:{testCases:tests}},{skipLog:{body:true}});
 fs.writeFileSync('.private/review-rules-report.json',JSON.stringify(result.body,null,2));
 const rows=result.body.testResults||[],failed=rows.flatMap((r,i)=>r.state==='SUCCESS'?[]:[{name:names[i],...r}]);
 console.log(JSON.stringify({total:rows.length,issues:result.body.issues,failed},null,2));assert.equal(rows.length,tests.length);assert.equal(failed.length,0);
}finally{await c.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
