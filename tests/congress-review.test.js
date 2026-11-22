import test from 'node:test';
import assert from 'node:assert/strict';
import {REVIEW_KEYS,validReview,reviewDistribution,reviewSummary} from '../congress-review-model.js';
test('avaliação exige seis escolhas válidas e limita texto',()=>{
 const r=Object.fromEntries(REVIEW_KEYS.map(k=>[k,5]));assert(validReview(r));assert(validReview({...r,geral:0},'Sugestão'));assert(!validReview({...r,geral:6}));assert(!validReview({...r,geral:1.5}));assert(!validReview({...r,extra:1}));delete r.app;assert(!validReview(r));assert(!validReview(Object.fromEntries(REVIEW_KEYS.map(k=>[k,1])),'x'.repeat(1501)));
});
test('avaliação mantém seis contadores sem carry e não inclui N/A na média',()=>{
 for(let n=0;n<=5;n++){const packed=13*16**n;const counts=reviewDistribution(packed);assert.equal(counts[n],13);assert.equal(counts.reduce((a,b)=>a+b,0),13);}
 const data={ratings:{geral:2+16+16**3+2*16**5}};const r=reviewSummary(data)[0];assert.deepEqual(r.counts,[2,1,0,1,0,2]);assert.equal(r.rated,4);assert.equal(r.average,3.5);assert.equal(reviewSummary({})[0].average,null);
});
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
test('SDK da avaliação:13 envios, concorrência, sugestão repetida, recibo e reentrada',async()=>{
 const records=new Map(),auths=new Map();let selected=0,fail=false;
 const keys=REVIEW_KEYS;
 for(let i=0;i<13;i++)auths.set(i,{currentUser:{uid:'user-'+i}});
 const snap=r=>({exists:()=>records.has(r.path),data:()=>structuredClone(records.get(r.path))});
 const merge=(old={},value)=>{const next=structuredClone(old);for(const [k,v] of Object.entries(value)){if(v&&typeof v==='object'&&'_inc'in v)next[k]=(next[k]||0)+v._inc;else if(v&&typeof v==='object'&&'_union'in v){next[k]=next[k]||[];for(const item of v._union)if(!next[k].some(x=>JSON.stringify(x)===JSON.stringify(item)))next[k].push(item);}else if(v&&typeof v==='object'&&!Array.isArray(v))next[k]=merge(next[k],v);else next[k]=v;}return next;};
 const sdk={getApp:()=>({id:selected}),getAuth:a=>auths.get(a.id),getFirestore:()=>({}),doc:(db,...p)=>({path:p.join('/')}),getDocFromServer:async r=>snap(r),increment:n=>({_inc:n}),arrayUnion:(...items)=>({_union:items}),writeBatch:()=>{const writes=[];return {set:(ref,data)=>writes.push({ref,data}),commit:async()=>{if(fail)throw Error('sem rede');if(writes.some(w=>w.ref.path.startsWith('congressReviewVoters/')&&records.has(w.ref.path)))throw Error('repetido');for(const w of writes)records.set(w.ref.path,merge(records.get(w.ref.path),w.data));}};}};
 globalThis.__reviewSdk=sdk;const suffix=crypto.randomUUID(),sdkFile=path.resolve('.private/review-sdk-'+suffix+'.mjs'),apiFile=path.resolve('.private/review-api-'+suffix+'.mjs');
 try{
 await fs.writeFile(sdkFile,Object.keys(sdk).map(k=>`export const ${k}=(...args)=>globalThis.__reviewSdk.${k}(...args);`).join('\n'));
 const source=(await fs.readFile('congress-review-data.js','utf8')).replace(/from 'https:\/\/www.gstatic.com\/firebasejs\/13.1.0\/firebase-(app|auth|firestore).js'/g,`from '${pathToFileURL(sdkFile).href}'`).replace(/from '\.\//g,"from '../");
 await fs.writeFile(apiFile,source);const {createCongressReviewData}=await import(pathToFileURL(apiFile).href),clients=[];for(let i=0;i<13;i++){selected=i;clients.push(createCongressReviewData());}
 assert.equal(await clients[0].load(),false);fail=true;await assert.rejects(clients[0].send(Object.fromEntries(keys.map(k=>[k,1])),''),/rede/);fail=false;
 await Promise.all(clients.map((c,i)=>c.send(Object.fromEntries(keys.map(k=>[k,i%6])),i%2?'Mesmo texto':'')));
 const total=records.get('congressReviews/xvi');assert.equal(total.voters,13);assert.equal(total.suggestions.length,6);assert.equal(new Set(total.suggestions.map(s=>s.id)).size,6);assert.equal(reviewSummary(total)[0].rated,10);
 assert.deepEqual(Object.keys(total).sort(),['ratings','suggestions','voters']);assert.deepEqual(records.get('congressReviewVoters/user-0'),{voted:true});assert.equal(await clients[0].load(),true);
 await clients[0].send(Object.fromEntries(keys.map(k=>[k,5])),'Segunda');assert.equal(records.get('congressReviews/xvi').voters,13);
 auths.get(0).currentUser={uid:'another'};await assert.rejects(clients[0].send(Object.fromEntries(keys.map(k=>[k,5])),''),/conta mudou/);
 }finally{delete globalThis.__reviewSdk;await Promise.all([sdkFile,apiFile].map(f=>fs.rm(f,{force:true})));}
});
