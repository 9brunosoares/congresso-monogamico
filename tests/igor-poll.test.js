import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {IGOR_HOST,IGOR_VOTERS,IGOR_QUESTIONS,igorQuestion,igorOptions,igorPayload,igorEmptyRound,igorAgendaAccess} from '../igor-poll-model.js';
import {buildIgorExport} from '../igor-poll-export.js';

test('Igor: dez perguntas, intervalos exatos, opções especiais e oito capas locais',async()=>{
 assert.equal(IGOR_HOST,'igor');assert.equal(IGOR_VOTERS.length,12);assert(!IGOR_VOTERS.includes('igor'));
 assert.equal(IGOR_QUESTIONS.length,10);assert.equal(igorQuestion(1).colors,true);
 assert.deepEqual(igorOptions(3).map(o=>o.id),[...Array.from({length:30},(_,i)=>'y'+(i+1)),'never']);
 assert.deepEqual(igorOptions(4).map(o=>o.id),[...Array.from({length:20},(_,i)=>'y'+(i+1)*5),'over']);
 for(const [q,choice] of [[3,'y0'],[3,'y31'],[3,'over'],[4,'y1'],[4,'y7'],[4,'y105'],[4,'never'],[7,'i'],[8,'c']])assert.equal(igorPayload(q,choice),null);
 assert.deepEqual(igorPayload(3,'never'),{choice:'never'});assert.deepEqual(igorPayload(4,'over'),{choice:'over'});
 assert.equal(igorOptions(7).length,8);assert.equal(igorOptions(9).length,9);
 for(const o of igorOptions(7))assert((await fs.stat('assets/igor-poll/'+o.image)).size>1000);
 assert.deepEqual(igorPayload(9,'i'),{choice:'i'});assert.equal(igorQuestion(9).other,undefined);
 const activity={title:'Restrospectiva do meu an*'};
 assert(igorAgendaAccess(activity,'igor',null));assert(!igorAgendaAccess(activity,'nanu',null));
 for(const id of IGOR_VOTERS)assert(igorAgendaAccess(activity,id,{question:1}));
 assert(!igorAgendaAccess(activity,'kirk',{question:1}));assert(!igorAgendaAccess({title:'Almoço'},'igor',{question:1}));
});

test('Igor: exportação preserva alternativas, respostas individuais e contagem de Outro',()=>{
 const result=buildIgorExport({question:9},[{question:3,answers:{bruno:{choice:'never',createdAt:'2026-11-21T20:00:00Z'}}},{question:9,answers:{nanu:{choice:'i',createdAt:'2026-11-21T20:00:00Z'}}}],'2026-11-21T21:00:00Z');
 assert.equal(result.snapshot.questions[0].options.find(x=>x.id==='never').votes,1);
 assert(result.text.includes('Nunca vai acabar: 1'));assert(result.text.includes('Outro: 1'));
 assert(result.csv.includes('"Outro"'));assert.equal(result.snapshot.questions[1].votes[0].who,'nanu');
 assert.throws(()=>buildIgorExport({},[{question:1,answers:{igor:{choice:'a'}}}]),/inválida/);
});

test('Igor: doze clientes, envios simultâneos, barras, reentrada e persistência sem pontos',async()=>{
 const records=new Map(),watchers=new Set(),auths=new Map(),files=[];let selected='igor',revision=0,failCommit=false;
 const clone=v=>v===undefined?undefined:structuredClone(v);
 const snapshot=ref=>({exists:()=>records.has(ref.path),data:()=>clone(records.get(ref.path)),metadata:{hasPendingWrites:false}});
 const emit=()=>queueMicrotask(()=>{for(const w of watchers)w.fn(snapshot(w.ref));});
 function commit(writes){
  if(failCommit)throw Error('Sem conexão');
  for(const [p]of writes)if(p.includes('/answers/')&&records.has(p))throw Object.assign(Error('Duplicado'),{code:'permission-denied'});
  const next=new Map(records);
  for(const [p,patch,update]of writes){
   const current=clone(update?next.get(p):{})||{};
   for(const [k,v]of Object.entries(patch)){
    const keys=k.split('.'),last=keys.pop();let target=current;for(const key of keys)target=target[key]??={};
    target[last]=v?._increment!==undefined?(target[last]||0)+v._increment:clone(v);
   }
   next.set(p,current);
  }
  records.clear();for(const [p,d]of next)records.set(p,d);if(writes.length){revision++;emit();}
 }
 const sdk={getApp:()=>({id:selected}),getAuth:app=>auths.get(app.id),getFirestore:()=>({}),doc:(db,...parts)=>({path:parts.join('/')}),
  onSnapshot:(ref,options,fn)=>{if(typeof options==='function')fn=options;const w={ref,fn};watchers.add(w);queueMicrotask(()=>{if(watchers.has(w))fn(snapshot(ref));});return()=>watchers.delete(w);},
  getDocFromServer:async ref=>snapshot(ref),serverTimestamp:()=>Date.now(),increment:n=>({_increment:n}),
  writeBatch:()=>{const writes=[];return {set:(r,d)=>writes.push([r.path,d,false]),update:(r,d)=>writes.push([r.path,d,true]),commit:async()=>commit(writes)};},
  runTransaction:async(db,fn)=>{for(let tries=0;tries<20;tries++){const version=revision,writes=[];const result=await fn({get:async r=>snapshot(r),set:(r,d)=>writes.push([r.path,d,false]),update:(r,d)=>writes.push([r.path,d,true])});if(version!==revision)continue;commit(writes);return result;}throw Error('Conflito');}
 };
 for(const who of [IGOR_HOST,...IGOR_VOTERS])auths.set(who,{currentUser:{uid:'uid-'+who,email:who+'@congresso.app'}});
 globalThis.__igorSdk=sdk;
 try{
  await fs.mkdir('.private',{recursive:true});const suffix=crypto.randomUUID(),sdkPath=path.resolve('.private/igor-sdk-'+suffix+'.mjs'),dataPath=path.resolve('.private/igor-data-'+suffix+'.mjs');files.push(sdkPath,dataPath);
  await fs.writeFile(sdkPath,Object.keys(sdk).map(n=>`export const ${n}=(...args)=>globalThis.__igorSdk.${n}(...args);`).join('\n'));
  const source=(await fs.readFile('igor-poll-data.js','utf8')).replace(/from 'https:\/\/www.gstatic.com\/firebasejs\/13.1.0\/firebase-(app|auth|firestore).js'/g,`from '${pathToFileURL(sdkPath).href}'`).replace(/from '\.\//g,"from '../");
  await fs.writeFile(dataPath,source);const {createIgorPollData}=await import(pathToFileURL(dataPath).href);
  const host=createIgorPollData(),clients=IGOR_VOTERS.map(who=>{selected=who;return createIgorPollData();});
  await assert.rejects(clients[0].start(),/Igor/);await host.start();await host.start();
  const round=q=>'igorLive/main/rounds/'+q;let count,session;
  const stops=[host.watchSession(s=>session=s),clients[0].watchRound(1,r=>count=r.total)];
  await assert.rejects(host.next(1),/todos/);
  failCommit=true;await assert.rejects(clients[0].answer(1,'a'),/conexão/);failCommit=false;assert.equal(records.get(round(1)).total,0);
  const answers=[];
  for(let q=1;q<=10;q++){
   if(q===3)await assert.rejects(clients[0].answer(q,'y31'),/resposta/);
   if(q===4)await assert.rejects(clients[0].answer(q,'y6'),/resposta/);
   const opts=igorOptions(q);await Promise.all(clients.map((c,i)=>c.answer(q,opts[i%opts.length].id)));
   assert.equal(records.get(round(q)).total,12);assert.equal(Object.values(records.get(round(q)).counts).reduce((a,b)=>a+b,0),12);
   await clients[0].answer(q,opts.at(-1).id,'Outro');assert.equal(records.get(round(q)).total,12);
   answers.push({question:q,answers:Object.fromEntries(clients.map(c=>[c.who,records.get(round(q)+'/answers/'+c.who)]))});
   if(q<10)await Promise.all([host.next(q),host.next(q)]);
  }
  await host.next(10);await new Promise(r=>setImmediate(r));assert.equal(session.question,10);assert.equal(count,12);
  const exported=buildIgorExport(session,answers);assert.equal(exported.snapshot.questions.reduce((n,q)=>n+q.total,0),120);
  selected=clients[0].who;const reopened=createIgorPollData();await reopened.answer(10,'b');assert.equal(records.get(round(10)).total,12);
  assert(![...records.keys()].some(k=>k.startsWith('points/')||k.startsWith('nanuLive/')));
  auths.get(clients[0].who).currentUser=null;await assert.rejects(reopened.answer(10,'a'),/conta mudou/);
  for(const stop of stops)stop();assert.equal(watchers.size,0);
 }finally{delete globalThis.__igorSdk;await Promise.all(files.map(f=>fs.rm(f,{force:true})));}
});
