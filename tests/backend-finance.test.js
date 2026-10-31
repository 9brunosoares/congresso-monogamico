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
 const snap=ref=>{const captured=records.get(ref.path);return ref.collection?{docs:[...records].filter(([key])=>key.startsWith(ref.path+'/')&&key.split('/').length===ref.path.split('/').length+1).map(([key,data])=>({id:key.split('/').at(-1),data:()=>({...data})})),size:[...records.keys()].filter(key=>key.startsWith(ref.path+'/')).length,empty:false}:{id:ref.path.split('/').at(-1),exists:()=>captured!==undefined,data:()=>captured?{...captured}:undefined}};
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
  const revision=epoch,writes=[];await fn({get:async ref=>snap(ref),set:(ref,value)=>writes.push([ref.path,value]),delete:ref=>writes.push([ref.path,null]),update:(ref,value)=>writes.push([ref.path,{...records.get(ref.path),...value}])});
  if(epoch!==revision)continue;for(const [key,value] of writes){if(value===null)records.delete(key);else records.set(key,value);}epoch++;emit();return;
 }throw Error('Conflito persistente')},
 addDoc(){assert.fail('Financeiro deve usar transação')},setDoc(){},updateDoc(){},deleteDoc(){},writeBatch(){const writes=[];return {set:(ref,data)=>writes.push([ref.path,data]),commit:async()=>{for(const [key,value] of writes)records.set(key,value);epoch++;emit();}}},increment(){},signOut(){},signInWithEmailAndPassword(){},createUserWithEmailAndPassword(){}
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
  const task=await api.submitTask({why:'Lavar a louça',d:5});
  assert.equal(records.get(task.path).status,'ok');assert.equal(records.get('points/task_'+task.id).d,5);
  await assert.rejects(api.submitTask({why:'Lavar a louça',d:20}),/tabela/);
  await assert.rejects(api.deleteTask(task.id),/ADMs/);
  await auth('bruno');await api.deleteTask(task.id);assert(!records.has(task.path));assert(!records.has('points/task_'+task.id));
  await api.deleteTask(task.id);
  await assert.rejects(api.closeFinance(),/22\/11/);
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
  records.set('cases/case-after',{who:'ob',by:'bruno',what:'Teste',status:'pend'});
  const late=await api.submitTask({why:'Tirar o lixo',d:5});await assert.rejects(api.deleteTask(late.id),/encerrado/);await api.judgeCase('case-after',true);
  assert.equal(records.get(late.path).status,'ok');assert(!records.has('points/task_'+late.id));assert.equal(records.get('cases/case-after').status,'ok');
  assert.equal([...records.keys()].filter(k=>k.startsWith('points/')).length,pointsBefore);
  // Reações não dependem do placar nem das contas abertas e não geram pontos.
  await api.setCaseReaction('case-after','😂');assert.deepEqual(records.get('caseReactions/case-after').votes,{bruno:'😂'});
  await api.setCaseReaction('case-after','😱');assert.deepEqual(records.get('caseReactions/case-after').votes,{bruno:'😱'});
  await auth('ob');await api.setCaseReaction('case-after','❤️');
  assert.deepEqual(records.get('caseReactions/case-after').votes,{bruno:'😱',ob:'❤️'});
  await api.setCaseReaction('case-after','❤️');assert.deepEqual(records.get('caseReactions/case-after').votes,{bruno:'😱',ob:'❤️'});
  await api.setCaseReaction('case-after',null);assert.deepEqual(records.get('caseReactions/case-after').votes,{bruno:'😱'});
  records.set('cases/pending-reaction',{status:'pend'});
  await assert.rejects(api.setCaseReaction('pending-reaction','😂'),/não está no mural/);
  await assert.rejects(api.setCaseReaction('missing','😂'),/não está no mural/);
  await assert.rejects(api.setCaseReaction('case-after','💔'),/válida/);
  const transact=sdk.runTransaction;let reactionRace=true;
  sdk.runTransaction=(db,fn)=>transact(db,tx=>fn({...tx,get:async ref=>{
   const result=await tx.get(ref);
   if(reactionRace&&ref.path==='caseReactions/case-after'){
    reactionRace=false;records.set(ref.path,{votes:{...records.get(ref.path).votes,pig:'❤️'}});epoch++;
   }
   return result;
  }}));
  await api.setCaseReaction('case-after','👏');
  assert.deepEqual(records.get('caseReactions/case-after').votes,{bruno:'😱',pig:'❤️',ob:'👏'});
  sdk.runTransaction=async()=>{throw Error('Sem conexão.');};
  await assert.rejects(api.setCaseReaction('case-after','😱'),/conexão/);assert.equal(state.reactionPending['case-after'],false);
  sdk.runTransaction=transact;await api.setCaseReaction('case-after','👏');
  assert.equal(records.get('caseReactions/case-after').votes.ob,'👏');
  const message=await api.sendChat('Teste anônimo');
  assert.deepEqual(Object.keys(records.get(message.path)).sort(),['createdAt','struck','text']);
  assert(records.has('chatAuthors/uid-ob/messages/'+message.id));
  const postedAt=records.get(message.path).createdAt;api.setView('fofoca');await flush();await flush();assert.equal(state.chat.find(m=>m.id===message.id).mine,true);
  await auth('bruno');assert.equal(state.chat.find(m=>m.id===message.id).mine,false);await assert.rejects(api.deleteChat(message.id),/Só o autor/);
  await auth('ob');await api.deleteChat(message.id);await api.deleteChat(message.id);
  assert.equal(records.get(message.path).struck,true);assert.equal(records.get(message.path).text,'Teste anônimo');assert.equal(records.get(message.path).createdAt,postedAt);
  records.set('chat/legacy',{text:'Antiga',createdAt:postedAt});await assert.rejects(api.deleteChat('legacy'),/Só o autor/);

  assert.equal([...records.keys()].filter(k=>k.startsWith('points/')).length,pointsBefore);
 }finally{
  Date.now=saved.DateNow;for(const key of ['setInterval','window','document','sessionStorage']){if(saved[key]===undefined)delete globalThis[key];else globalThis[key]=saved[key]}if(online)Object.defineProperty(navigator,'onLine',online);else delete navigator.onLine;delete globalThis.__financeSDK;await Promise.all(files.map(f=>fs.rm(f,{force:true})));
 }
});
