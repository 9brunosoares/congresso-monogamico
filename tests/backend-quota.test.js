import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

// Exercita o backend real com o SDK substituído por um contador de chamadas.
// Não usa Firebase, não cria contas e não altera registros de produção.
test('backend: carregamento por tela, cache de fotos, paginação, pausa e limite de cota',async()=>{
 const saved={DateNow:Date.now,setInterval:globalThis.setInterval,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,window:globalThis.window,document:globalThis.document,indexedDB:globalThis.indexedDB,sessionStorage:globalThis.sessionStorage};
 const onlineDescriptor=Object.getOwnPropertyDescriptor(navigator,'onLine');
 const files=[],listeners=[],gets=[],handlers={},timers=new Map();let id=0,state,cacheSettings;
 const user={uid:'quota-test-uid',email:'bruno@congresso.app'},stamp=n=>({toMillis:()=>n});
 const row=(name,i)=>({id:name+i,createdAt:stamp(i),text:'Mensagem '+i,who:'ob',what:'Denúncia '+i,status:'ok',hasPhoto:true});
 const documents=Array.from({length:50},(_,i)=>row('chat',i)),cases=Array.from({length:12},(_,i)=>row('case',i));
 const snap=items=>({docs:items.map(data=>({id:data.id,data:()=>data})),size:items.length,empty:!items.length,exists:()=>false,data:()=>undefined});
 const fixture={
  initializeApp:()=>({}),getAuth:()=>({currentUser:user}),initializeFirestore:(app,settings)=>{cacheSettings=settings;return {}},getFirestore:()=>({}),
  persistentLocalCache:settings=>({kind:'persistent',...settings}),persistentMultipleTabManager:()=>({multi:true}),memoryLocalCache:()=>({kind:'memory'}),
  collection:(db,...parts)=>({path:parts.join('/')}),doc:(db,...parts)=>({path:parts.join('/')}),query:(ref,...filters)=>({...ref,filters}),where:(...args)=>({where:args}),orderBy:(...args)=>({orderBy:args}),limit:n=>({limit:n}),startAfter:cursor=>({after:cursor.id}),
  setPersistence:async()=>{},browserLocalPersistence:{},onAuthStateChanged:(auth,fn)=>{queueMicrotask(()=>fn(user))},
  getDocFromCache:async ref=>{if(ref.path==='people/bruno')return {data:()=>({uid:user.uid})};throw Error('Cache vazio')},
  getDoc:async ref=>{gets.push(ref.path);return ref.path==='admins/'+user.uid?{exists:()=>false}:{exists:()=>true,data:()=>({dataUrl:'data:image/jpeg;base64,AAAA'})}},
  getDocs:async ref=>{gets.push(ref);return snap([])},getDocsFromServer:async()=>snap([]),
  onSnapshot:(ref,accept,fail)=>{
   const item={ref,accept,fail,active:true};listeners.push(item);
   queueMicrotask(()=>{if(!item.active)return;
    if(ref.path==='settings/main')accept({data:()=>({budget:12000})});
    else if(ref.path==='chat')accept(snap(documents));
    else if(ref.path==='cases'&&ref.filters?.some(f=>f.limit===12))accept(snap(cases));
    else accept(snap([]));
   });return ()=>{item.active=false};
  },
  runTransaction:()=>assert.fail('Perfil já vinculado não deve abrir transação'),
  addDoc:()=>assert.fail('Teste não pode escrever'),setDoc:()=>assert.fail('Teste não pode escrever'),updateDoc(){},deleteDoc(){},serverTimestamp(){},writeBatch(){},increment(){},getDocFromServer(){},signOut(){},signInWithEmailAndPassword(){},createUserWithEmailAndPassword(){}
 };
 const active=()=>listeners.filter(x=>x.active),flush=()=>new Promise(resolve=>setImmediate(resolve));
 try{
  Date.now=()=>Date.parse('2026-10-29T22:00:00-03:00');
  Object.defineProperty(navigator,'onLine',{value:true,configurable:true});
  globalThis.indexedDB={};globalThis.sessionStorage={getItem(){return null},setItem(){}};
  globalThis.window={addEventListener(name,fn){handlers[name]=fn}};
  globalThis.document={hidden:false,addEventListener(name,fn){handlers[name]=fn}};
  globalThis.setInterval=()=>0;
  globalThis.setTimeout=(fn,ms)=>{const key=++id;timers.set(key,{fn,ms});return key};globalThis.clearTimeout=key=>timers.delete(key);
  globalThis.__quotaFixture=fixture;
  await fs.mkdir('.private',{recursive:true});
  const suffix=crypto.randomUUID(),sdkPath=path.resolve(`.private/quota-sdk-${suffix}.mjs`),backendPath=path.resolve(`.private/quota-backend-${suffix}.mjs`);
  files.push(sdkPath,backendPath);
  const names=Object.keys(fixture);
  await fs.writeFile(sdkPath,names.map(name=>`export const ${name}=(...args)=>globalThis.__quotaFixture.${name}(...args);`).join('\n').replace('export const browserLocalPersistence=(...args)=>globalThis.__quotaFixture.browserLocalPersistence(...args);','export const browserLocalPersistence={};'));
  let source=await fs.readFile('backend.js','utf8');
  source=source.replace(/from "https:\/\/www.gstatic.com\/firebasejs\/13.1.0\/firebase-(app|auth|firestore).js"/g,`from '${pathToFileURL(sdkPath).href}'`).replace(/from '\.\//g,"from '../");
  await fs.writeFile(backendPath,source);
  const api=await import(pathToFileURL(backendPath).href);await api.start(next=>{state=next});await flush();await flush();
  assert(state.ready);assert.equal(cacheSettings.localCache.kind,'persistent');assert(cacheSettings.localCache.tabManager.multi);
  assert.deepEqual(active().map(x=>x.ref.path).sort(),['agenda','cases','expenses','financeClosings/main','payments','points','scoreClosures/main','settings/main']);
  assert.equal(gets.filter(x=>typeof x==='string'&&x.startsWith('casePhotos/')).length,0);
  const coreCount=listeners.length;api.setView('fofoca');await flush();assert.equal(listeners.length,coreCount+1);
  const chatQuery=active().find(x=>x.ref.path==='chat').ref;assert(chatQuery.filters.some(f=>f.limit===50));assert.equal(state.chat.length,50);assert(state.chatHasMore);
  await api.loadOlderChat();assert(gets.some(ref=>ref.path==='chat'&&ref.filters.some(f=>f.after)));assert(!state.chatHasMore);
  for(let i=0;i<20;i++)api.setView('fofoca');assert.equal(listeners.length,coreCount+1);
  api.setView('contas');await flush();assert(active().some(x=>x.ref.path==='pixKeys'));assert(state.loaded.pix);
  api.setView('inicio');await flush();assert(!active().some(x=>x.ref.path==='pixKeys'));
  api.setView('mural');await flush();assert(!active().some(x=>x.ref.path==='chat'));assert.equal(state.shame.length,12);
  assert.equal(gets.filter(x=>typeof x==='string'&&x.startsWith('casePhotos/')).length,0);
  await Promise.all([api.loadCasePhoto('case1'),api.loadCasePhoto('case1')]);await api.loadCasePhoto('case1');
  assert.equal(gets.filter(x=>x==='casePhotos/case1').length,1);
  await api.loadOlderMural();assert(gets.some(ref=>ref.path==='cases'&&ref.filters.some(f=>f.after)));
  api.setView('placar');await flush();const taskQuery=active().find(x=>x.ref.path==='tasks').ref;assert(taskQuery.filters.some(f=>f.where?.[0]==='who'&&f.where[2]==='bruno'));
  Date.now=()=>Date.parse('2026-11-19T11:00:00-03:00');api.setView('querido');await flush();
  assert(active().some(x=>x.ref.path.startsWith('querido/')));assert(!active().some(x=>x.ref.path.startsWith('participation/')));
  assert(!active().some(x=>/^querido\/[^/]+$/.test(x.ref.path)));
  Date.now=()=>Date.parse('2026-11-19T12:00:01-03:00');api.setView('inicio');await flush();
  assert.equal(active().filter(x=>x.ref.path.startsWith('participation/')).length,1);assert.equal(Object.keys(state.attendanceReady).length,1);
  api.setView('querido');await flush();assert(active().some(x=>/^querido\/[^/]+$/.test(x.ref.path)));
  globalThis.document.hidden=true;handlers.visibilitychange();const pause=[...timers.values()].find(t=>t.ms===60000);assert(pause);pause.fn();assert.equal(active().length,0);
  globalThis.document.hidden=false;handlers.visibilitychange();await flush();assert(active().length>0);
  active()[0].fail({code:'resource-exhausted'});assert.equal(active().length,0);assert(state.error.includes('limite'));
  const afterQuota=listeners.length;api.setView('fofoca');assert.equal(listeners.length,afterQuota);
  api.retrySync();await flush();assert(active().length>0);assert.equal(state.error,'');
 }finally{
  Date.now=saved.DateNow;for(const key of ['setInterval','setTimeout','clearTimeout','window','document','indexedDB','sessionStorage']){if(saved[key]===undefined)delete globalThis[key];else globalThis[key]=saved[key]}
  delete globalThis.__quotaFixture;await Promise.all(files.map(file=>fs.rm(file,{force:true})));
  if(onlineDescriptor)Object.defineProperty(navigator,'onLine',onlineDescriptor);else delete navigator.onLine;
 }
});
