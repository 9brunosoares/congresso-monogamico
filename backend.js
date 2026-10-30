import {moneyToCents,settlementsOpen,canManagePayment,closingSnapshot,storedClosing,transferRows} from './finance.js?v=20261030c';
import {normalizePix} from './pix.js?v=20261030c';
import {normalizeOfficialLinks} from './official-links.js?v=20261030c';
import {subscriptionPool,lazyCollections,mergeRows,photoLoader} from './data-sync.js';
import {validReportPhoto} from './report-photo.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, browserLocalPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, collection, doc, getDoc, getDocFromCache, getDocs, getDocsFromServer, startAfter, setDoc, onSnapshot, query, orderBy, limit, where, addDoc, updateDoc, deleteDoc, runTransaction, serverTimestamp, writeBatch, increment, getDocFromServer } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';
import { ALL, P, EMOJIS } from './roster.js';
import { dayKey, applyBallot, validatePin, decodeTally, VOTE_DAYS, votingOpen, resultDay, alreadyVotedMessage, notice } from './shared.js?v=20261030c';

const app=initializeApp(firebaseConfig), auth=getAuth(app);
// O SDK recua para memória se IndexedDB não estiver disponível no navegador.
const db=initializeFirestore(app,{localCache:typeof indexedDB==='undefined'?memoryLocalCache():persistentLocalCache({tabManager:persistentMultipleTabManager(),cacheSizeBytes:40*1024*1024})});
const emptyState=()=>({me:null,admin:false,ready:false,budget:0,points:[],exps:[],payments:[],financeHistory:[],historyHasMore:false,historyLoading:false,shame:[],hasMural:false,casePhotos:{},photoErrors:{},chat:[],chatHasMore:false,chatLoadingOlder:false,muralHasMore:false,muralLoadingOlder:false,pixKeys:{},tasks:[],querido:{},qvoted:{},voterCount:0,attendance:{},attendanceReady:{},loaded:{},agenda:[],error:''});
let state=emptyState(), notify=()=>{}, generation=0,currentDay=dayKey(),currentView='inicio',sessionReady=false,paused=false,quotaBlocked=false;
let firstSnapshots=new Set(),required=new Set(),chatHead=[],chatOlder=[],chatCursor=null,muralHead=[],muralOlder=[],muralCursor=null,backgroundTimer;
let historyHead=[],historyOlder=[],historyCursor=null;
const PAGE_SIZE=50;
let mine=new Set();
try{mine=new Set(JSON.parse(sessionStorage.getItem('xvi-mine')||'[]'));}catch{}
const emit=()=>notify({...state});
const errorText=e=>notice(({
 'auth/invalid-credential':'Apelido ou PIN incorreto.',
 'auth/wrong-password':'PIN incorreto.',
 'auth/user-not-found':'Este apelido ainda não tem PIN. Use Primeiro acesso.',
 'auth/email-already-in-use':'Este apelido já tem PIN. Escolha Entrar.',
 'auth/too-many-requests':'Muitas tentativas. Aguarde um pouco e tente novamente.',
 'auth/network-request-failed':'Sem conexão. Confira sua internet.',
 'permission-denied':'Você não tem permissão para esta ação.',
 'unavailable':'Sem conexão com o congresso. Tente novamente.',
 'resource-exhausted':'O serviço atingiu um limite temporário. Tente mais tarde. Os registros já salvos estão preservados.',
}[e.code] || e.message || 'Não foi possível concluir. Tente novamente.'));
export {errorText};
const pool=subscriptionPool(spec=>{
 let active=true;
 const stop=onSnapshot(spec.ref,snapshot=>{
  if(!active||spec.version!==generation)return;
  spec.accept(snapshot);firstSnapshots.add(spec.key);state.loaded={...state.loaded,[spec.key]:true};
  if([...required].every(key=>firstSnapshots.has(key)))state.ready=true;
  emit();
 },error=>{if(active&&spec.version===generation)failed(error)});
 return ()=>{active=false;stop()};
});
const photos=photoLoader(async id=>{
 const ref=doc(db,'casePhotos',id);
 try{const cached=await getDocFromCache(ref);if(cached.exists())return cached.data().dataUrl;}catch{}
 return (await getDoc(ref)).data()?.dataUrl;
},{valid:validReportPhoto,allowed:id=>sessionReady&&!paused&&!quotaBlocked&&['mural','tribunal'].includes(currentView)&&state.shame.some(x=>x.id===id&&x.hasPhoto&&(x.status==='ok'||state.admin)),
 onValue(id,value){const next={...state.casePhotos};delete next[id];next[id]=value;state.casePhotos=Object.fromEntries(Object.entries(next).slice(-24));delete state.photoErrors[id];emit();},
 onError(id,error){state.photoErrors={...state.photoErrors,[id]:errorText(error)};if(error.code==='resource-exhausted')failed(error);else emit();}});
function stopData(){pool.stop();photos.clear();firstSnapshots=new Set();required=new Set();sessionReady=false;chatHead=[];chatOlder=[];chatCursor=null;muralHead=[];muralOlder=[];muralCursor=null;historyHead=[];historyOlder=[];historyCursor=null;}
function failed(e){if(e.code==='resource-exhausted'){quotaBlocked=true;pool.stop();}state.error=errorText(e);emit();}
function rows(snapshot){return snapshot.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>(a.createdAt?.toMillis?.()||0)-(b.createdAt?.toMillis?.()||0));}
function publishChat(){state.chat=mergeRows(chatOlder,chatHead).map(m=>({...m,at:formatStamp(m.createdAt),mine:mine.has(m.id)}));}
function syncData(){
 if(!sessionReady||paused||quotaBlocked)return;
 const version=generation,lazy=lazyCollections(currentView,state.admin),specs=[];
 required=new Set();
 const listen=(key,ref,accept,essential=false)=>{specs.push({key,ref,accept,version});if(essential)required.add(key);};
 for(const [name,key] of [['points','points'],['expenses','exps']])listen(key,collection(db,name),snapshot=>{state[key]=rows(snapshot)},true);
 listen('payments',collection(db,'payments'),snapshot=>{state.payments=rows(snapshot)},true);
 listen('closing',doc(db,'financeClosings','main'),snapshot=>{state.closing=snapshot.exists()?{...snapshot.data(),transfers:transferRows(snapshot.data())}:null},true);
 listen('scoreClosing',doc(db,'scoreClosures','main'),snapshot=>{state.scoreClosing=snapshot.exists()?snapshot.data():null},true);
 listen('settings',doc(db,'settings','main'),snap=>{state.budget=snap.data()?.budget||0},true);
 listen('agenda',collection(db,'agenda'),snapshot=>{state.agenda=rows(snapshot).sort((a,b)=>a.start-b.start)},true);
 listen('hasMural',query(collection(db,'cases'),where('status','==','ok'),limit(1)),snap=>{state.hasMural=!snap.empty},true);
 if(currentView==='inicio')listen('officialLinks',doc(db,'officialLinks','main'),snap=>{state.officialLinks=snap.exists()?snap.data():null});
 const key=dayKey(),votingDay=VOTE_DAYS.find(d=>d.key===key);
 if(key!==currentDay){currentDay=key;state.qvoted={};state.querido={};state.voterCount=0;}
 if(votingDay){
  listen('voted-'+key,doc(db,'querido',key,'voters',auth.currentUser.uid),snap=>{state.qvoted={[key]:snap.exists()?[state.me]:[]}},true);
 }
 const revealed=resultDay();
 if(currentView==='querido'&&revealed)listen('votes-'+revealed.key,doc(db,'querido',revealed.key),snap=>{
  const data=snap.data();state.voterCount=data?.voters||0;state.querido={[revealed.key]:Object.fromEntries(ALL.map(id=>[id,decodeTally(data?.counts?.[id]||0)]))};
 });
 // Não consulta dias futuros nem presume ausência de voto antes de carregar o dia.
 for(const day of VOTE_DAYS.filter(d=>(state.scoreClosing?.closedAt?.toMillis?.()??Date.now())>=d.deadline))listen('participation-'+day.key,collection(db,'participation',day.key,'people'),snap=>{
  state.attendance={...state.attendance,[day.key]:Object.fromEntries(snap.docs.map(d=>[d.id,true]))};state.attendanceReady={...state.attendanceReady,[day.key]:true};
 },true);
 if(lazy.chat)listen('chat',query(collection(db,'chat'),orderBy('createdAt','desc'),limit(PAGE_SIZE)),snapshot=>{
  if(chatOlder.length)chatOlder=mergeRows(chatOlder,chatHead);
  chatHead=rows(snapshot);
  if(!chatOlder.length){chatCursor=snapshot.docs.at(-1)||null;state.chatHasMore=snapshot.size===PAGE_SIZE;}
  publishChat();
 });
 if(['contas','pagamentos','fechamento'].includes(currentView))listen('pix',collection(db,'pixKeys'),snap=>{state.pixKeys=Object.fromEntries(snap.docs.map(d=>[d.id,d.data()]))});
 if(currentView==='historico')listen('financeHistory',query(collection(db,'financeHistory'),orderBy('createdAt','desc'),limit(50)),snapshot=>{
  if(historyOlder.length)historyOlder=mergeRows(historyOlder,historyHead);
  historyHead=rows(snapshot);if(!historyOlder.length){historyCursor=snapshot.docs.at(-1)||null;state.historyHasMore=snapshot.size===50;}
  state.financeHistory=mergeRows(historyOlder,historyHead);
 });
 if(lazy.tasks)listen('tasks',query(collection(db,'tasks'),where(state.admin?'status':'who','==',state.admin?'pend':state.me)),snap=>{state.tasks=rows(snap)});
 if(lazy.cases){
  const ref=currentView==='mural'?query(collection(db,'cases'),where('status','==','ok'),orderBy('createdAt','desc'),limit(12)):query(collection(db,'cases'),where('status','==','pend'));
  listen('cases-'+currentView,ref,snapshot=>{
   if(currentView==='mural'){
    if(muralOlder.length)muralOlder=mergeRows(muralOlder,muralHead);
    muralHead=rows(snapshot);state.shame=mergeRows(muralOlder,muralHead);
    if(!muralOlder.length){muralCursor=snapshot.docs.at(-1)||null;state.muralHasMore=snapshot.size===12;}
   }else state.shame=rows(snapshot);
   const ids=new Set(state.shame.map(x=>x.id));state.casePhotos=Object.fromEntries(Object.entries(state.casePhotos).filter(([id])=>ids.has(id)));
  });
 }

 pool.sync(specs);
}
export function setView(view){if(currentView===view)return;currentView=view;syncData();}
export function refreshTime(){syncData();}
export function loadCasePhoto(id,retry=false){if(retry)delete state.photoErrors[id];if(state.photoErrors[id]&&!retry)return Promise.resolve();return photos.load(id);}
export function retrySync(){pool.stop();quotaBlocked=false;state.error='';syncData();emit();}
export function reportError(error){if(error.code==='resource-exhausted')failed(error);}
export async function loadOlderChat(){
 member();if(currentView!=='fofoca'||!chatCursor||!state.chatHasMore||state.chatLoadingOlder)return;
 state.chatLoadingOlder=true;emit();const version=generation;
 try{
  const snapshot=await getDocs(query(collection(db,'chat'),orderBy('createdAt','desc'),startAfter(chatCursor),limit(PAGE_SIZE)));
  if(version!==generation)return;
  chatOlder=mergeRows(chatOlder,rows(snapshot));chatCursor=snapshot.docs.at(-1)||chatCursor;state.chatHasMore=snapshot.size===PAGE_SIZE;publishChat();
 }catch(error){if(version===generation)failed(error);throw error;}
 finally{if(version===generation){state.chatLoadingOlder=false;emit();}}
}
async function claimProfile(user,id){
 try{const cached=await getDocFromCache(doc(db,'people',id));if(cached.data()?.uid===user.uid)return;}catch{}
 await runTransaction(db,async tx=>{
  const ref=doc(db,'people',id), snap=await tx.get(ref);
  if(!snap.exists())throw Error('Congressista não cadastrado na lista oficial.');
  const person=snap.data();
  if(person.uid && person.uid!==user.uid)throw Error('Este apelido já está vinculado a outra conta. Fale com um ADM.');
  if(!person.uid){
   tx.update(ref,{uid:user.uid});
   if(person.admin)tx.set(doc(db,'admins',user.uid),{id});
  }
 });
}
export async function loadOlderMural(){
 member();if(currentView!=='mural'||!muralCursor||!state.muralHasMore||state.muralLoadingOlder)return;
 state.muralLoadingOlder=true;emit();const version=generation;
 try{
  const snapshot=await getDocs(query(collection(db,'cases'),where('status','==','ok'),orderBy('createdAt','desc'),startAfter(muralCursor),limit(12)));
  if(version!==generation)return;
  muralOlder=mergeRows(muralOlder,rows(snapshot));muralCursor=snapshot.docs.at(-1)||muralCursor;state.muralHasMore=snapshot.size===12;state.shame=mergeRows(muralOlder,muralHead);
 }catch(error){if(version===generation)failed(error);throw error;}
 finally{if(version===generation){state.muralLoadingOlder=false;emit();}}
}
export async function start(onUpdate){
 notify=onUpdate;
 await setPersistence(auth,browserLocalPersistence);
 onAuthStateChanged(auth,async user=>{
  const version=++generation;stopData();state=emptyState();quotaBlocked=false;emit();
  if(!user){state.ready=true;emit();return;}
  const id=user.email?.split('@')[0];
  if(!P[id] || user.email!==`${id}@congresso.app`){await signOut(auth);return;}
  try{
   await claimProfile(user,id);if(version!==generation)return;
   const access=await getDoc(doc(db,'admins',user.uid));if(version!==generation)return;
   state.me=id;state.admin=access.exists();sessionReady=true;syncData();emit();
  }catch(e){if(version!==generation)return;failed(e);}
 });
 // Só compara datas localmente. A pool não recria consultas que continuam iguais.
 setInterval(()=>{if(sessionReady&&!paused)syncData()},15000);
 if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{
  clearTimeout(backgroundTimer);
  if(document.hidden)backgroundTimer=setTimeout(()=>{paused=true;pool.stop()},60000);
  else {paused=false;syncData();}
 });
 window.addEventListener('online',()=>{if(!quotaBlocked){state.error='';emit();}});
 window.addEventListener('offline',()=>{state.error='Sem conexão. Você pode consultar o que já foi carregado.';emit();});
}
export async function login(id,pin,create=false){
 if(!P[id])throw Error('Escolha sua foto primeiro.');validatePin(pin);
 const method=create?createUserWithEmailAndPassword:signInWithEmailAndPassword;
 await method(auth,`${id}@congresso.app`,pin);
}
export const logout=()=>signOut(auth);
function member(){if(quotaBlocked)throw Object.assign(Error(errorText({code:'resource-exhausted'})),{code:'resource-exhausted'});if(!state.me||!state.ready||!navigator.onLine)throw Error('Conecte-se à internet antes de enviar.');}
function admin(){member();if(!state.admin)throw Error('Esta ação é exclusiva dos ADMs.');}
export function formatStamp(timestamp){return timestamp?.toDate?timestamp.toDate().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'Agora';}
const stamp=()=>new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const created=data=>({...data,at:stamp(),createdAt:serverTimestamp()});
export async function addPoints(data){admin();const ref=doc(collection(db,'points'));await runTransaction(db,async tx=>{const closed=await tx.get(doc(db,'scoreClosures','main'));if(closed.exists())throw Error('O placar já foi encerrado.');tx.set(ref,created(data));});return ref;}
export async function saveOfficialLinks(data,expectedVersion){
 admin();const values=normalizeOfficialLinks(data);
 await runTransaction(db,async tx=>{
  const ref=doc(db,'officialLinks','main'),snap=await tx.get(ref),version=snap.exists()?snap.data().version:0;
  if(version!==expectedVersion)throw Error('Os links foram alterados. Feche e abra novamente antes de salvar.');
  tx.set(ref,{...values,version:version+1,updatedBy:state.me,updatedAt:serverTimestamp()});
 });
}
export async function closeScores(){admin();await runTransaction(db,async tx=>{const ref=doc(db,'scoreClosures','main'),closed=await tx.get(ref);if(closed.exists())throw Error('O placar já foi encerrado.');tx.set(ref,{closedBy:state.me,closedAt:serverTimestamp()});});}
const financeCollection=type=>({expense:'expenses',payment:'payments',budget:'settings'})[type];
async function financeWrite(type,id,changes,expectedVersion){
 member();const ref=id?doc(db,financeCollection(type),id):doc(collection(db,financeCollection(type)));
 await runTransaction(db,async tx=>{
  const controlRef=doc(db,'financeControl','main'),control=await tx.get(controlRef);
  if(!control.exists())throw Error('Atualização das contas em andamento. Tente novamente.');
  if(control.data().closed&&!(type==='payment'&&changes.kind==='settlement'))throw Error('As contas já foram encerradas.');
  const snap=await tx.get(ref),before=snap.exists()?snap.data():{};
  if(id&&!snap.exists()&&!(type==='payment'&&changes.kind==='settlement'))throw Error('Registro não encontrado. Atualize a tela.');
  if(snap.exists()&&expectedVersion!==before.version)throw Error('Este registro foi alterado. Feche e abra novamente antes de salvar.');
  if(type==='budget')admin();
  if(type==='expense'&&snap.exists()&&!state.admin&&before.by!==state.me)throw Error('Você não pode alterar este gasto.');
  if(type==='payment'&&(!canManagePayment(snap.exists()?before:changes,state.me,state.admin)||!canManagePayment({...before,...changes},state.me,state.admin)))throw Error('Você não está envolvido neste pagamento.');
  if(type==='payment'&&(changes.kind||before.kind)==='settlement'){
   if(!settlementsOpen()||!control.data().closed)throw Error('As contas ainda não foram encerradas.');
   if(before.status==='active'&&changes.status!=='cancelled')throw Error('Esta quitação já foi confirmada.');
  }
  if(before.status==='cancelled'&&!(type==='payment'&&changes.kind==='settlement'&&changes.status==='active'))throw Error('Este registro já foi cancelado.');
  const version=(before.version||0)+1,time=serverTimestamp();
  const after={...(snap.exists()?before:created({by:state.me,status:'active'})),...changes,version,updatedAt:time,updatedBy:state.me};
  const action=!snap.exists()?'create':after.status==='cancelled'?'cancel':'update';
  tx.set(ref,after);
  tx.set(doc(db,'financeHistory',`${type}_${ref.id}_${version}`),{type,recordId:ref.id,version,action,by:state.me,before,after,createdAt:time});
  tx.update(controlRef,{revision:control.data().revision+1,lastEvent:`${type}_${ref.id}_${version}`});
 });return ref;
}
export async function addExpense(data){const amountCents=moneyToCents(data.amount);return financeWrite('expense',null,{...data,amount:amountCents/100,amountCents});}
export async function updateExpense(id,data,version){const amountCents=moneyToCents(data.amount);return financeWrite('expense',id,{...data,amount:amountCents/100,amountCents},version);}
export const cancelExpense=(id,version)=>financeWrite('expense',id,{status:'cancelled'},version);
export async function savePayment(data,id=null,version){
 const amountCents=moneyToCents(data.amount);const {amount,...fields}=data;
 if(fields.from===fields.to)throw Error('Escolha duas pessoas diferentes.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(fields.paidOn)||!Number.isFinite(Date.parse(fields.paidOn+'T12:00:00-03:00'))||new Date(fields.paidOn+'T12:00:00-03:00').toISOString().slice(0,10)!==fields.paidOn||fields.paidOn>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}))throw Error('Use uma data válida até hoje.');
 return financeWrite('payment',id,{...fields,amountCents},version);
}
export const cancelPayment=(id,version)=>{const p=state.payments.find(p=>p.id===id);return financeWrite('payment',id,{status:'cancelled',kind:p?.kind||'payment'},version);};
export async function closeFinance(){
 admin();if(!settlementsOpen())throw Error('O encerramento abre em 22/11.');
 const controlRef=doc(db,'financeControl','main'),control=await getDocFromServer(controlRef);
 if(control.data().closed)throw Error('As contas já foram encerradas.');
 const [expenses,payments,settings]=await Promise.all([getDocsFromServer(collection(db,'expenses')),getDocsFromServer(collection(db,'payments')),getDocFromServer(doc(db,'settings','main'))]);
 const snapshot=storedClosing(closingSnapshot(rows(expenses),rows(payments),settings.data().budget));
 await runTransaction(db,async tx=>{
  const latest=await tx.get(controlRef);
  if(latest.data().closed)throw Error('As contas já foram encerradas.');
  if(latest.data().revision!==control.data().revision)throw Error('Houve um lançamento durante o fechamento. Confira e tente novamente.');
  const time=serverTimestamp(),after={...snapshot,version:1,updatedAt:time,updatedBy:state.me,closedAt:time,closedBy:state.me};
  tx.set(doc(db,'financeClosings','main'),after);
  tx.set(doc(db,'financeHistory','closing_main_1'),{type:'closing',recordId:'main',version:1,action:'create',by:state.me,before:{},after,createdAt:time});
  tx.update(controlRef,{revision:latest.data().revision+1,closed:true,lastEvent:'closing_main_1'});
 });
}
export async function confirmSettlement(transferId){
 member();const closing=await getDocFromServer(doc(db,'financeClosings','main'));
 const transfer=closing.exists()?transferRows(closing.data()).find(t=>t.id===transferId):null;if(!transfer)throw Error('Quitação não encontrada.');
 const id='final_'+transfer.id,existing=await getDocFromServer(doc(db,'payments',id));
 return savePayment({from:transfer.from,to:transfer.to,amount:(transfer.amountCents/100).toFixed(2),note:'',paidOn:new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}),kind:'settlement',settlementId:transfer.id,status:'active'},id,existing.data()?.version);
}
export async function loadOlderFinanceHistory(){
 member();if(currentView!=='historico'||!historyCursor||!state.historyHasMore||state.historyLoading)return;
 state.historyLoading=true;emit();const version=generation;
 try{const snap=await getDocs(query(collection(db,'financeHistory'),orderBy('createdAt','desc'),startAfter(historyCursor),limit(50)));
  if(version!==generation)return;historyOlder=mergeRows(historyOlder,rows(snap));historyCursor=snap.docs.at(-1)||historyCursor;state.historyHasMore=snap.size===50;state.financeHistory=mergeRows(historyOlder,historyHead);
 }finally{if(version===generation){state.historyLoading=false;emit();}}
}
export async function savePix(type,value){member();await setDoc(doc(db,'pixKeys',state.me),normalizePix(type,value));}
export async function removePix(){member();await deleteDoc(doc(db,'pixKeys',state.me));}
export async function submitTask(data){member();return addDoc(collection(db,'tasks'),created({...data,who:state.me,status:'pend'}));}
export async function reviewTask(id,approve){
 admin();await runTransaction(db,async tx=>{
  const closed=await tx.get(doc(db,'scoreClosures','main'));
  const ref=doc(db,'tasks',id),snap=await tx.get(ref);if(!snap.exists()||snap.data().status!=='pend')throw Error('Esta tarefa já foi julgada.');
  const task=snap.data();tx.update(ref,{status:approve?'ok':'no'});
  if(approve&&!closed.exists())tx.set(doc(db,'points',`task_${id}`),created({who:task.who,d:task.d,why:task.why,kind:'aux'}));
 });
}
export async function addCase(data,photo=''){
 member();if(photo&&!validReportPhoto(photo))throw Error('A foto anexada não é válida. Escolha outra.');
 const ref=doc(collection(db,'cases')),batch=writeBatch(db);
 batch.set(ref,created({...data,by:state.me,status:'pend',hasPhoto:!!photo}));
 if(photo)batch.set(doc(db,'casePhotos',ref.id),{dataUrl:photo});
 await batch.commit();return ref;
}
export async function judgeCase(id,condemn){
 admin();await runTransaction(db,async tx=>{
  const closed=await tx.get(doc(db,'scoreClosures','main'));
  const ref=doc(db,'cases',id),snap=await tx.get(ref);if(!snap.exists()||snap.data().status!=='pend')throw Error('Esta denúncia já foi julgada.');
  if(condemn){tx.update(ref,{status:'ok'});if(!closed.exists())tx.set(doc(db,'points',`case_${id}`),created({who:snap.data().who,d:-15,why:'Infração da monogamia (Mural)',kind:'inf'}));}
  else {tx.delete(ref);if(snap.data().hasPhoto)tx.delete(doc(db,'casePhotos',id));}
 });
}
export async function sendChat(text){
 member();const ref=doc(collection(db,'chat'));mine.add(ref.id);
 try{
  await setDoc(ref,{text,createdAt:serverTimestamp()});
  try{sessionStorage.setItem('xvi-mine',JSON.stringify([...mine].slice(-100)));}catch{}
 }catch(e){mine.delete(ref.id);throw e;}
}
export async function deleteChat(id){admin();await deleteDoc(doc(db,'chat',id));chatHead=chatHead.filter(m=>m.id!==id);chatOlder=chatOlder.filter(m=>m.id!==id);publishChat();emit();}
export async function setBudget(budget){admin();const snap=await getDocFromServer(doc(db,'settings','main'));return financeWrite('budget','main',{budget},snap.data().version);}
export async function addSession(data){admin();return addDoc(collection(db,'agenda'),data);}
export async function vote(ballot){
 member();if(!votingOpen())throw Error(Date.now()>=VOTE_DAYS.at(-1).deadline?'Esta foi a última votação do congresso.':"A votação abre de quinta a domingo da viagem, até meio-dia (São Paulo).");
 const key=dayKey(),uid=auth.currentUser.uid,id=state.me;
 const total=doc(db,'querido',key),marker=doc(db,'querido',key,'voters',uid);
 const delta=applyBallot(undefined,ballot,id);
 if((state.qvoted[key]||[]).includes(id))throw Error(alreadyVotedMessage());
 // Os incrementos são calculados no servidor: votos simultâneos não partem de
 // uma contagem antiga. O marcador e todos os incrementos são uma única escrita atômica.
 const batch=writeBatch(db);
 batch.set(total,{voters:increment(1),counts:Object.fromEntries(ALL.map(target=>[target,increment(delta.counts[target])]))},{merge:true});
 batch.set(marker,{voted:true});
 batch.set(doc(db,"participation",key,"people",id),{voted:true});
 try{await batch.commit();}
 catch(e){
  if(e.code==='permission-denied' && (await getDocFromServer(marker)).exists())throw Error(alreadyVotedMessage());
  throw e;
 }
}
