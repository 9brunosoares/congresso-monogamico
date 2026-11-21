import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {NANU_HOST,NANU_VOTERS,NANU_ROOM,NANU_TEST_MODE,NANU_ACTIVE_VOTERS,NANU_QUESTIONS,nanuQuestion,nanuChoiceValid,nanuAgendaAccess,cleanNanuText,nanuCloudWords,layoutNanuCloud} from '../nanu-poll-model.js';

test('Nanu: onze perguntas, alternativas exatas e link restrito antes da liberação',()=>{
 assert.equal(NANU_HOST,'nanu');assert.equal(NANU_VOTERS.length,12);assert(!NANU_VOTERS.includes('nanu'));
 assert.equal(NANU_QUESTIONS.length,11);assert.equal(nanuQuestion(11).options,null);
 assert.deepEqual(nanuQuestion(1).options,['25%','50%','20%']);assert.deepEqual(nanuQuestion(8).options,['Verdadeiro','Falso']);
 for(let q=1;q<=10;q++){assert(nanuChoiceValid(q,'a'));assert(nanuChoiceValid(q,'b'));assert.equal(nanuChoiceValid(q,'c'),![8,9].includes(q));}
 for(const invalid of ['',null,'ab','A',0])assert(!nanuChoiceValid(1,invalid));assert(!nanuChoiceValid(11,'a'));
 const activity={title:'Restrospectiva do meu an*'};
 assert(nanuAgendaAccess(activity,'nanu',null));assert(!nanuAgendaAccess(activity,'bruno',null));assert(!nanuAgendaAccess(activity,'igor',null));
 for(const id of NANU_VOTERS)assert(nanuAgendaAccess(activity,id,{question:1},{testMode:false}));
 assert.equal(NANU_TEST_MODE,false);assert.equal(NANU_ROOM,'main');assert.deepEqual(NANU_ACTIVE_VOTERS,NANU_VOTERS);
 for(const id of NANU_VOTERS)assert.equal(nanuAgendaAccess(activity,id,{question:1},{testMode:true}),id==='bruno');
 assert(!nanuAgendaAccess(activity,'kirk',{question:1}));assert(!nanuAgendaAccess({title:'Almoço'},'nanu',{question:1}));
 assert(NANU_QUESTIONS.every(q=>Object.keys(q).sort().join(',')==='options,text'));
});

test('Nanu: nuvem agrupa caixa/acentos, limita repetição por pessoa e preserva negações',()=>{
 assert.equal(cleanNanuText('  Muito\n exigente  '),'Muito exigente');
 const words=nanuCloudWords(['Exigente exigente','EXIGENTE','Não quer namorar','não se permite','Ele é muito nanu']);
 assert.equal(words.find(w=>w.key==='exigente').count,2);
 assert(words.some(w=>w.key==='nao quer'));assert(words.some(w=>w.key==='nao permite'));
 assert(!words.some(w=>w.key==='quer'));assert(!words.some(w=>w.key==='nanu'));
 assert(nanuCloudWords(['!!!']).some(w=>w.label==='!!!'));
 for(const width of [260,326,640]){
  const placed=layoutNanuCloud(words,width,340);assert(placed.length>=3);
  for(const p of placed)assert(p.x>=0&&p.y>=0&&p.x+p.w<=width&&p.y+p.h<=340);
  for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++){
   const a=placed[i],b=placed[j];assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y));
  }
 }
});

test('Nanu: SDK real com doze clientes, voto atômico, reentrada, avanço e nuvem',async()=>{
 const records=new Map(),watchers=new Set(),auths=new Map(),files=[];let selected='nanu',revision=0,failCommit=false;
 const clone=v=>v===undefined?undefined:structuredClone(v);
 const snapshot=ref=>({exists:()=>records.has(ref.path),data:()=>clone(records.get(ref.path)),metadata:{hasPendingWrites:false}});
 const collectionSnapshot=ref=>({docs:[...records].filter(([p])=>p.startsWith(ref.path+'/')&&p.split('/').length===ref.path.split('/').length+1).map(([p,d])=>({id:p.split('/').at(-1),data:()=>clone(d)}))});
 const readableSnapshot=ref=>{const parts=ref.path.split("/");if(parts[0]==="nanuLive"&&parts[2]==="rounds"&&parts.length===4&&Number(parts[3])>records.get(parts.slice(0,2).join("/"))?.question)throw Object.assign(Error("Pergunta futura sem acesso"),{code:"permission-denied"});return snapshot(ref);};
 const emit=()=>queueMicrotask(()=>{for(const w of watchers)w.fn(w.ref.collection?collectionSnapshot(w.ref):snapshot(w.ref));});
 function commit(writes){
  if(failCommit)throw Error('Sem conexão');
  for(const [p] of writes)if(p.includes('/answers/')&&records.has(p))throw Object.assign(Error('Voto já registrado'),{code:'permission-denied'});
  const next=new Map(records);
  for(const [p,patch,update] of writes){
   const current=clone(update?next.get(p):{})||{};
   for(const [k,v] of Object.entries(patch))current[k]=v?._increment!==undefined?(current[k]||0)+v._increment:clone(v);
   next.set(p,current);
  }
  records.clear();for(const [p,d]of next)records.set(p,d);if(writes.length){revision++;emit();}
 }
 const sdk={
  getApp:()=>({id:selected}),getAuth:app=>auths.get(app.id),getFirestore:()=>({}),
  doc:(db,...parts)=>({path:parts.join('/')}),collection:(db,...parts)=>({path:parts.join('/'),collection:true}),
  onSnapshot:(ref,options,fn)=>{if(typeof options==='function')fn=options;const w={ref,fn};watchers.add(w);queueMicrotask(()=>{if(watchers.has(w))fn(ref.collection?collectionSnapshot(ref):snapshot(ref));});return()=>watchers.delete(w);},
  getDocFromServer:async ref=>snapshot(ref),serverTimestamp:()=>Date.now(),increment:n=>({_increment:n}),
  writeBatch:()=>{const writes=[];return {set:(r,d)=>writes.push([r.path,d,false]),update:(r,d)=>writes.push([r.path,d,true]),commit:async()=>commit(writes)};},
  runTransaction:async(db,fn)=>{for(let tries=0;tries<20;tries++){const version=revision,writes=[];const result=await fn({get:async r=>readableSnapshot(r),set:(r,d)=>writes.push([r.path,d,false]),update:(r,d)=>writes.push([r.path,d,true])});if(version!==revision)continue;commit(writes);return result;}throw Error('Conflito');}
 };
 for(const who of [NANU_HOST,...NANU_VOTERS])auths.set(who,{currentUser:{uid:'uid-'+who,email:who+'@congresso.app'}});
 globalThis.__nanuSdk=sdk;
 try{
  await fs.mkdir('.private',{recursive:true});const suffix=crypto.randomUUID(),sdkPath=path.resolve('.private/nanu-sdk-'+suffix+'.mjs'),dataPath=path.resolve('.private/nanu-data-'+suffix+'.mjs');files.push(sdkPath,dataPath);
  await fs.writeFile(sdkPath,Object.keys(sdk).map(n=>`export const ${n}=(...args)=>globalThis.__nanuSdk.${n}(...args);`).join('\n'));
  const source=(await fs.readFile('nanu-poll-data.js','utf8')).replace(/from 'https:\/\/www.gstatic.com\/firebasejs\/13.1.0\/firebase-(app|auth|firestore).js'/g,`from '${pathToFileURL(sdkPath).href}'`).replace(/from '\.\//g,"from '../");
  await fs.writeFile(dataPath,source);const {createNanuPollData}=await import(pathToFileURL(dataPath).href);
  const official=()=>createNanuPollData({room:'main',voters:NANU_VOTERS});
  const host=official(),clients=NANU_VOTERS.map(who=>{selected=who;return official();});
  await assert.rejects(clients[0].start(),/Nanu/);
  await host.start();await host.start();assert.equal(records.get('nanuLive/main').question,1);
  await assert.rejects(host.next(1),/todos/);
  const roundPath=q=>'nanuLive/main/rounds/'+q;
  let hostSession,clientCount;const stops=[host.watchSession(s=>hostSession=s),clients[0].watchRound(1,r=>clientCount=r.total)];
  failCommit=true;await assert.rejects(clients[0].answer(1,'a'),/conexão/);failCommit=false;
  assert.equal(records.get(roundPath(1)).total,0);assert(!records.has(roundPath(1)+'/answers/'+clients[0].who));
  await Promise.all(clients.map((c,i)=>c.answer(1,'abc'[i%3])));
  assert.deepEqual(records.get(roundPath(1)),{a:4,b:4,c:4,total:12});
  await clients[0].answer(1,'c');assert.equal(records.get(roundPath(1)).total,12);assert.equal(records.get(roundPath(1)+'/answers/'+clients[0].who).choice,'a');
  await Promise.all([host.next(1),host.next(1)]);assert.equal(records.get('nanuLive/main').question,2);
  await new Promise(r=>setImmediate(r));assert.equal(hostSession.question,2);assert.equal(clientCount,12);
  for(let q=2;q<=10;q++){
   if([8,9].includes(q))await assert.rejects(clients[0].answer(q,'c'),/resposta/);
   await Promise.all(clients.map(c=>c.answer(q,'a')));await host.next(q);
  }
  assert.equal(records.get('nanuLive/main').question,11);
  await assert.rejects(clients[0].answer(11,'  '),/resposta/);await assert.rejects(clients[0].answer(11,'a'.repeat(141)),/resposta/);
  let cloud;stops.push(host.watchCloud(r=>cloud=r));
  await Promise.all(clients.map((c,i)=>c.answer(11,i%2?'Exigente':'Não quer namorar')));
  await new Promise(r=>setImmediate(r));assert.equal(cloud.length,12);assert.deepEqual(records.get(roundPath(11)),{a:0,b:0,c:0,total:12});
  assert.equal(nanuCloudWords(cloud).find(w=>w.key==='exigente').count,6);
  await host.next(11);assert.equal(records.get('nanuLive/main').question,11);
  selected='igor';assert.throws(()=>createNanuPollData({room:'teste',voters:['bruno']}),/exclusivo/);
  selected='nanu';const testHost=createNanuPollData({room:'teste',voters:['bruno']});selected='bruno';const testVoter=createNanuPollData({room:'teste',voters:['bruno']});
  await testHost.start();await assert.rejects(testHost.answer(1,'a'),/não participa/);
  for(let q=1;q<=10;q++){
   await assert.rejects(testHost.next(q),/todos/);await testVoter.answer(q,'a');
   assert.equal(records.get('nanuLive/teste/rounds/'+q).total,1);await testHost.next(q);
  }
  let testCloud;stops.push(testHost.watchCloud(value=>testCloud=value));
  await testVoter.answer(11,'Só um ensaio');await new Promise(r=>setImmediate(r));
  assert.equal(testCloud.length,1);assert.equal(testCloud[0].text,'Só um ensaio');
  assert.equal(records.get('nanuLive/main/rounds/11').total,12);
  assert(![...records.keys()].some(k=>k.startsWith('points/')));
  auths.get(clients[0].who).currentUser=null;await assert.rejects(clients[0].answer(11,'Outra resposta'),/conta mudou/);
  for(const stop of stops)stop();assert.equal(watchers.size,0);
 }finally{delete globalThis.__nanuSdk;await Promise.all(files.map(f=>fs.rm(f,{force:true})));}
});
