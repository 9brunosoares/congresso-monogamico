import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ALL} from '../roster.js';
import {PRESENTERS,rankingCandidates,validRanking,rankingDelta,presentationResults,rankingOpen,RANKING_START,RANKING_END,presentationPhoto} from '../presentation-ranking-model.js';

test('apresentações: 12 fotos, sem auto voto, Diogo ordena 12 e os demais11',async()=>{
 assert.equal(PRESENTERS.length,12);assert(!PRESENTERS.includes('diogo'));
 for(const who of ALL){const order=rankingCandidates(who);assert(validRanking(who,order));assert(!order.includes(who));assert.equal(order.length,who==='diogo'?12:11);const d=rankingDelta(who,order);assert.equal(d.sums[order[0]],110);assert.equal(d.sums[order.at(-1)],0);assert.equal(d.samples[order.at(-1)],1);assert.equal(d.sums[who]||0,0);assert(!validRanking(who,[...order,order[0]]));}
 assert(!validRanking('estranho',PRESENTERS));assert(!rankingOpen(RANKING_START-1));assert(rankingOpen(RANKING_START));assert(rankingOpen(RANKING_END-1));assert(!rankingOpen(RANKING_END));
 for(const who of PRESENTERS)assert((await fs.stat(presentationPhoto(who))).size>1000);
});
test('apuração: média normalizada, empates exatos, pódio 1/1/3 e ausência de votos',()=>{
 const t={sums:{bruno:220,ob:110,luan:99,igor:88},samples:{bruno:2,ob:1,luan:1,igor:1}};
 const rows=presentationResults(t),b=rows.find(r=>r.id==='bruno'),ob=rows.find(r=>r.id==='ob'),l=rows.find(r=>r.id==='luan');
 assert.equal(b.rank,1);assert.equal(ob.rank,1);assert.equal(b.prize,20);assert.equal(ob.prize,20);assert.equal(l.rank,3);assert.equal(l.prize,5);assert.equal(b.score,100);assert.equal(rows.find(r=>r.id==='igor').prize,0);
 assert(presentationResults(null).every(r=>r.rank===null&&r.prize===0));
 const unique=presentationResults({sums:{bruno:110,ob:99,luan:88},samples:{bruno:1,ob:1,luan:1}});assert.deepEqual(unique.slice(0,3).map(r=>r.prize),[20,10,5]);
});
test('SDK:13 rankings simultâneos, recuperação, premiação concorrente e fechamento',async t=>{
 t.mock.method(Date,'now',()=>RANKING_START+3600000);
 const records=new Map(),auths=new Map(),files=[];let selected='bruno',revision=0,fail=false;
 const clone=x=>x===undefined?undefined:structuredClone(x),snapshot=r=>({exists:()=>records.has(r.path),data:()=>clone(records.get(r.path))});
 for(const who of ALL){auths.set(who,{currentUser:{uid:'uid-'+who,email:who+'@congresso.app'}});records.set('querido/20779/voters/uid-'+who,{voted:true});}
 function merge(before,patch){const out=clone(before)||{};for(const [key,v]of Object.entries(patch)){if(v?._increment!==undefined)out[key]=(out[key]||0)+v._increment;else if(v&&typeof v==='object'&&!Array.isArray(v))out[key]=merge(out[key],v);else out[key]=clone(v);}return out;}
 function commit(writes){if(fail)throw Error('Sem conexão');for(const w of writes)if(w.ref.path.startsWith('presentationBallots/')&&records.has(w.ref.path))throw Object.assign(Error('Já votou'),{code:'permission-denied'});for(const w of writes)records.set(w.ref.path,merge(w.merge?records.get(w.ref.path):{},w.data));revision++;}
 const sdk={getApp:()=>({id:selected}),getAuth:a=>auths.get(a.id),getFirestore:()=>({}),doc:(db,...parts)=>({path:parts.join('/')}),getDocFromServer:async r=>snapshot(r),increment:n=>({_increment:n}),serverTimestamp:()=>Date.now(),writeBatch:()=>{const writes=[];return {set:(ref,data,opt)=>writes.push({ref,data,merge:opt?.merge}),commit:async()=>commit(writes)};},runTransaction:async(db,fn)=>{for(let i=0;i<30;i++){const start=revision,writes=[];const value=await fn({get:async r=>snapshot(r),set:(ref,data)=>writes.push({ref,data})});if(start!==revision)continue;if(writes.length)commit(writes);return value;}throw Error('Concorrência');}};
 globalThis.__presentationSdk=sdk;
 try{
  const suffix=crypto.randomUUID(),sdkFile=path.resolve('.private/rank-sdk-'+suffix+'.mjs'),apiFile=path.resolve('.private/rank-api-'+suffix+'.mjs');files.push(sdkFile,apiFile);
  await fs.writeFile(sdkFile,Object.keys(sdk).map(k=>`export const ${k}=(...args)=>globalThis.__presentationSdk.${k}(...args);`).join('\n'));
  const source=(await fs.readFile('presentation-ranking-data.js','utf8')).replace(/from 'https:\/\/www.gstatic.com\/firebasejs\/13.1.0\/firebase-(app|auth|firestore).js'/g,`from '${pathToFileURL(sdkFile).href}'`).replace(/from '\.\//g,"from '../");
  await fs.writeFile(apiFile,source);const {createPresentationRankingData}=await import(pathToFileURL(apiFile).href),clients=ALL.map(who=>{selected=who;return createPresentationRankingData();});
  assert.equal((await clients[0].load()).eligible,true);fail=true;await assert.rejects(clients[0].send(rankingCandidates('bruno')),/conexão/);fail=false;
  await Promise.all(clients.map(client=>client.send(rankingCandidates(client.who))));
  const tally=records.get('presentationTallies/main');assert.equal(tally.voters,13);for(const id of PRESENTERS)assert.equal(tally.samples[id],12);
  const expected={sums:{},samples:{}};for(const who of ALL){const delta=rankingDelta(who,rankingCandidates(who));for(const id of PRESENTERS){expected.sums[id]=(expected.sums[id]||0)+delta.sums[id];expected.samples[id]=(expected.samples[id]||0)+delta.samples[id];}}
  assert.deepEqual(tally.sums,expected.sums);await clients[0].send(rankingCandidates('bruno').reverse());assert.equal(records.get('presentationTallies/main').voters,13);
  assert.deepEqual((await clients[0].load()).saved.order,rankingCandidates('bruno'));assert.equal(await clients[0].results(),null);assert.deepEqual(await clients[0].finalize(),[]);
  t.mock.method(Date,'now',()=>RANKING_END);const prizes=presentationResults(tally).filter(r=>r.prize);
  await Promise.all(clients.map(client=>client.finalize()));assert.equal([...records.keys()].filter(k=>k.startsWith('points/')).length,prizes.length);
  for(const row of prizes)assert.equal(records.get('points/presentation_'+row.id).d,row.prize);
  await assert.rejects(clients[0].send(rankingCandidates('bruno')),/encerr/);
  records.set('scoreClosures/main',{closedAt:RANKING_END});assert.deepEqual(await clients[0].finalize(),[]);
  auths.get('bruno').currentUser=null;await assert.rejects(clients[0].load(),/conta mudou/);
 }finally{delete globalThis.__presentationSdk;await Promise.all(files.map(f=>fs.rm(f,{force:true})));}
});
