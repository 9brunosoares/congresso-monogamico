import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ledgerBalances} from '../finance.js';
test('backend financeiro completo: histórico, fechamento, trava concorrente e confirmações únicas',async()=>{
 const saved={DateNow:Date.now,setInterval:globalThis.setInterval,window:globalThis.window,document:globalThis.document,sessionStorage:globalThis.sessionStorage};
 const online=Object.getOwnPropertyDescriptor(navigator,'onLine');
 let user={uid:'uid-bruno',email:'bruno@congresso.app'},state,authCallback,serial=0,epoch=0,time=Date.parse('2026-10-30T12:00:00Z');
 const records=new Map([['settings/main',{budget:14000,version:1,updatedBy:'bruno',updatedAt:'baseline'}],['financeControl/main',{revision:0,closed:false,lastEvent:''}]]),listeners=[],files=[];
 const snap=ref=>{const captured=records.get(ref.path);return ref.collection?{docs:[...records].filter(([key])=>key.startsWith(ref.path+'/')&&key.split('/').length===2).map(([key,data])=>({id:key.split('/')[1],data:()=>({...data})})),size:[...records.keys()].filter(key=>key.startsWith(ref.path+'/')).length,empty:false}:{id:ref.path.split('/').at(-1),exists:()=>captured!==undefined,data:()=>captured?{...captured}:undefined}};
 const emit=()=>listeners.filter(l=>l.active).forEach(l=>l.fn(snap(l.ref)));
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 const sdk={
 initializeApp:()=>({}),getAuth:()=>({get currentUser(){return user}}),initializeFirestore:()=>({}),getFirestore:()=>({}),
 persistentLocalCache:()=>({}),persistentMultipleTabManager:()=>({}),memoryLocalCache:()=>({}),browserLocalPersistence:{},setPersistence:async()=>{},
 collection:(db,...parts)=>({path:parts.join('/'),collection:true}),doc:(db,...parts)=>{const p=db.collection?db.path+'/auto'+(++serial):parts.join('/');return {path:p,id:p.split('/').at(-1)}},query:ref=>ref,where(){},orderBy(){},limit(){},startAfter(){},
 onAuthStateChanged:(auth,fn)=>{authCallback=fn;queueMicrotask(()=>fn(user))},
 getDocFromCache:async()=>({data:()=>({uid:user.uid})}),
 getDoc:async ref=>ref.path.startsWith('admins/')?{exists:()=>['bruno','igor','pig'].includes(user.email.split('@')[0])}:snap(ref),
 getDocFromServer:async ref=>snap(ref),getDocs:async ref=>snap(ref),getDocsFromServer:async ref=>snap(ref),
 onSnapshot:(ref,fn)=>{const l={ref,fn,active:true};listeners.push(l);queueMicrotask(()=>{if(l.active)fn(snap(ref))});return()=>l.active=false},
 serverTimestamp:()=>new Date(time).toISOString(),
 runTransaction:async(db,fn)=>{for(let attempt=0;attempt<5;attempt++){
  const revision=epoch,writes=[];await fn({get:async ref=>snap(ref),set:(ref,value)=>writes.push([ref.path,value]),update:(ref,value)=>writes.push([ref.path,{...records.get(ref.path),...value}])});
  if(epoch!==revision)continue;for(const [key,value] of writes)records.set(key,value);epoch++;emit();return;
 }throw Error('Conflito persistente')},
 addDoc(){assert.fail('Financeiro deve usar transação')},setDoc(){},updateDoc(){},deleteDoc(){},writeBatch(){},increment(){},signOut(){},signInWithEmailAndPassword(){},createUserWithEmailAndPassword(){}
 };
 try{
  Date.now=()=>time;globalThis.setInterval=()=>0;globalThis.window={addEventListener(){}};globalThis.document={addEventListener(){}};globalThis.sessionStorage={getItem(){return null}};Object.defineProperty(navigator,'onLine',{configurable:true,value:true});
  globalThis.__financeSDK=sdk;
  await fs.mkdir('.private',{recursive:true});const suffix=crypto.randomUUID(),sdkFile=path.resolve('.private/finance-sdk-'+suffix+'.mjs'),backendFile=path.resolve('.private/finance-backend-'+suffix+'.mjs');files.push(sdkFile,backendFile);
  await fs.writeFile(sdkFile,Object.keys(sdk).map(name=>name==='browserLocalPersistence'?'export const browserLocalPersistence={};':`export const ${name}=(...args)=>globalThis.__financeSDK.${name}(...args);`).join('\n'));
  const source=(await fs.readFile('backend.js','utf8')).replace(/from "https:\/\/www.gstatic.com\/firebasejs\/13.1.0\/firebase-(app|auth|firestore).js"/g,`from '${pathToFileURL(sdkFile).href}'`).replace(/from '\.\//g,"from '../");await fs.writeFile(backendFile,source);
  const api=await import(pathToFileURL(backendFile).href);await api.start(s=>state=s);await flush();await flush();assert(state.ready&&state.admin);
  const resources={albumUrl:'',playlistUrl:'https://example.com/playlist',mapUrl:'https://example.com/map',airbnbUrl:'https://example.com/house',address:'',wifiName:'',wifiPassword:''};
  await api.saveOfficialLinks(resources,0);assert.equal(records.get('officialLinks/main').version,1);
  await assert.rejects(api.saveOfficialLinks(resources,0),/alterados/);
  const auth=async id=>{user={uid:'uid-'+id,email:id+'@congresso.app'};await authCallback(user);await flush();await flush()};
  const expense=await api.addExpense({title:'Casa',cat:'casa',amount:'14.01',payer:'pig',split:['ob','bruno','pig']});
  assert(records.has('financeHistory/expense_'+expense.path.split('/')[1]+'_1'));
  const id=expense.path.split('/')[1];await api.updateExpense(id,{title:'Casa corrigida',cat:'casa',amount:'30',payer:'pig',split:['ob','bruno','pig']},1);
  assert.equal(records.get(expense.path).version,2);assert.equal(records.get('financeHistory/expense_'+id+'_2').before.amountCents,1401);
  await assert.rejects(api.updateExpense(id,{title:'Sobrescrita',cat:'casa',amount:'1',payer:'pig',split:['ob']},1),/alterado/);
  await api.setBudget(14000);assert(records.has('financeHistory/budget_main_2'));
  await auth('ob');assert(!state.admin);
  await assert.rejects(api.saveOfficialLinks(resources,1),/ADMs/);
  await assert.rejects(api.savePayment({from:'pig',to:'luan',amount:'1',kind:'payment',settlementId:'',note:'',paidOn:'2026-10-29'}),/envolvido/);
  const payment=await api.savePayment({from:'ob',to:'pig',amount:'3',kind:'payment',settlementId:'',note:'Parcial',paidOn:'2026-10-29'});
  assert.equal(ledgerBalances(state.exps,state.payments).ob,-700);
  await api.cancelPayment(payment.path.split('/')[1],1);assert.equal(ledgerBalances(state.exps,state.payments).ob,-1000);
  await auth('bruno');await assert.rejects(api.closeFinance(),/22\/11/);
  time=Date.parse('2026-11-22T03:00:00Z');await auth('ob');await assert.rejects(api.closeFinance(),/ADMs/);await auth('bruno');
  const original=sdk.getDocsFromServer;let race=true;sdk.getDocsFromServer=async ref=>{const result=snap(ref);if(race){race=false;const ctrl=records.get('financeControl/main');records.set('financeControl/main',{...ctrl,revision:ctrl.revision+1});epoch++;}return result};
  await assert.rejects(api.closeFinance(),/lançamento durante/);assert(!records.has('financeClosings/main'));sdk.getDocsFromServer=original;
  await api.closeFinance();assert(state.closing);assert(records.get('financeControl/main').closed);
  await assert.rejects(api.addExpense({title:'Tarde',cat:'casa',amount:'1',payer:'pig',split:['pig']}),/encerradas/);
  await assert.rejects(api.savePayment({from:'ob',to:'pig',amount:'1',kind:'payment',settlementId:'',note:'',paidOn:'2026-10-29'}),/encerradas/);
  const transfer=state.closing.transfers[0],countBefore=state.payments.length;
  const results=await Promise.allSettled([api.confirmSettlement(transfer.id),api.confirmSettlement(transfer.id)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(state.payments.length,countBefore+1);
  for(const t of state.closing.transfers.slice(1))await api.confirmSettlement(t.id);
  assert(Object.values(ledgerBalances(state.exps,state.payments)).every(n=>n===0));
  const final=state.payments.find(p=>p.id==='final_'+transfer.id);await api.cancelPayment(final.id,final.version);assert(Object.values(ledgerBalances(state.exps,state.payments)).some(n=>n!==0));await api.confirmSettlement(transfer.id);
  assert(Object.values(ledgerBalances(state.exps,state.payments)).every(n=>n===0));assert.equal(records.get('payments/'+final.id).version,3);
  await api.addPoints({who:'ob',d:5,why:'Tarefa',kind:'aux'});await api.closeScores();assert(state.scoreClosing);
  await assert.rejects(api.addPoints({who:'ob',d:5,why:'Depois',kind:'aux'}),/encerrado/);
  await assert.rejects(api.closeScores(),/encerrado/);
  const pointsBefore=[...records.keys()].filter(k=>k.startsWith('points/')).length;
  records.set('tasks/task-after',{who:'ob',d:5,why:'Louça',status:'pend'});records.set('cases/case-after',{who:'ob',by:'bruno',what:'Teste',status:'pend'});
  await api.reviewTask('task-after',true);await api.judgeCase('case-after',true);
  assert.equal(records.get('tasks/task-after').status,'ok');assert.equal(records.get('cases/case-after').status,'ok');
  assert.equal([...records.keys()].filter(k=>k.startsWith('points/')).length,pointsBefore);
  // Reações não dependem do placar nem das contas abertas e não geram pontos.
  await api.reactToCase('case-after','😂');assert.deepEqual(records.get('caseReactions/case-after').votes,{bruno:'😂'});
  await api.reactToCase('case-after','😱');assert.deepEqual(records.get('caseReactions/case-after').votes,{bruno:'😱'});
  await auth('ob');await api.reactToCase('case-after','❤️');
  assert.deepEqual(records.get('caseReactions/case-after').votes,{bruno:'😱',ob:'❤️'});
  await api.reactToCase('case-after','❤️');assert.deepEqual(records.get('caseReactions/case-after').votes,{bruno:'😱'});
  records.set('cases/pending-reaction',{status:'pend'});
  await assert.rejects(api.reactToCase('pending-reaction','😂'),/não está no mural/);
  await assert.rejects(api.reactToCase('missing','😂'),/não está no mural/);
  await assert.rejects(api.reactToCase('case-after','💔'),/válida/);
  assert.equal([...records.keys()].filter(k=>k.startsWith('points/')).length,pointsBefore);
 }finally{
  Date.now=saved.DateNow;for(const key of ['setInterval','window','document','sessionStorage']){if(saved[key]===undefined)delete globalThis[key];else globalThis[key]=saved[key]}if(online)Object.defineProperty(navigator,'onLine',online);else delete navigator.onLine;delete globalThis.__financeSDK;await Promise.all(files.map(f=>fs.rm(f,{force:true})));
 }
});
