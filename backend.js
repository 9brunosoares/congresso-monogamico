import {moneyToCents} from './finance.js';
import {normalizePix} from './pix.js';
import {subscriptionPool,lazyCollections,mergeRows,photoLoader} from './data-sync.js';
import {validReportPhoto} from './report-photo.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, browserLocalPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, collection, doc, getDoc, getDocFromCache, getDocs, startAfter, setDoc, onSnapshot, query, orderBy, limit, where, addDoc, updateDoc, deleteDoc, runTransaction, serverTimestamp, writeBatch, increment, getDocFromServer } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';
import { ALL, P, EMOJIS } from './roster.js';
import { dayKey, applyBallot, validatePin, decodeTally, VOTE_DAYS, votingOpen } from './shared.js?v=20261029b';

const app=initializeApp(firebaseConfig), auth=getAuth(app);
// O SDK recua para memória se IndexedDB não estiver disponível no navegador.
const db=initializeFirestore(app,{localCache:typeof indexedDB==='undefined'?memoryLocalCache():persistentLocalCache({tabManager:persistentMultipleTabManager(),cacheSizeBytes:40*1024*1024})});
const emptyState=()=>({me:null,admin:false,ready:false,budget:0,points:[],exps:[],shame:[],hasMural:false,casePhotos:{},photoErrors:{},chat:[],chatHasMore:false,chatLoadingOlder:false,muralHasMore:false,muralLoadingOlder:false,pixKeys:{},tasks:[],querido:{},qvoted:{},voterCount:0,attendance:{},attendanceReady:{},loaded:{},agenda:[],error:''});
let state=emptyState(), notify=()=>{}, generation=0,currentDay=dayKey(),currentView='inicio',sessionReady=false,paused=false,quotaBlocked=false;
let firstSnapshots=new Set(),required=new Set(),chatHead=[],chatOlder=[],chatCursor=null,muralHead=[],muralOlder=[],muralCursor=null,backgroundTimer;
const PAGE_SIZE=50;
let mine=new Set();
try{mine=new Set(JSON.parse(sessionStorage.getItem('xvi-mine')||'[]'));}catch{}
const emit=()=>notify({...state});
const errorText=e=>({
 'auth/invalid-credential':'Apelido ou PIN incorreto.',
 'auth/wrong-password':'PIN incorreto.',
 'auth/user-not-found':'Este apelido ainda não tem PIN. Use Primeiro acesso.',
 'auth/email-already-in-use':'Este apelido já tem PIN. Escolha Entrar.',
 'auth/too-many-requests':'Muitas tentativas. Aguarde um pouco e tente novamente.',
 'auth/network-request-failed':'Sem conexão. Confira sua internet.',
 'permission-denied':'Você não tem permissão para esta ação.',
 'unavailable':'Sem conexão com o congresso. Tente novamente.',
 'resource-exhausted':'O serviço atingiu um limite temporário. Tente mais tarde. Os registros já salvos estão preservados.',
}[e.code] || e.message || 'Não foi possível concluir. Tente novamente.');
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
function stopData(){pool.stop();photos.clear();firstSnapshots=new Set();required=new Set();sessionReady=false;chatHead=[];chatOlder=[];chatCursor=null;muralHead=[];muralOlder=[];muralCursor=null;}
function failed(e){if(e.code==='resource-exhausted'){quotaBlocked=true;pool.stop();}state.error=errorText(e);emit();}
function rows(snapshot){return snapshot.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>(a.createdAt?.toMillis?.()||0)-(b.createdAt?.toMillis?.()||0));}
function publishChat(){state.chat=mergeRows(chatOlder,chatHead).map(m=>({...m,at:formatStamp(m.createdAt),mine:mine.has(m.id)}));}
function syncData(){
 if(!sessionReady||paused||quotaBlocked)return;
 const version=generation,lazy=lazyCollections(currentView,state.admin),specs=[];
 required=new Set();
 const listen=(key,ref,accept,essential=false)=>{specs.push({key,ref,accept,version});if(essential)required.add(key);};
 for(const [name,key] of [['points','points'],['expenses','exps']])listen(key,collection(db,name),snapshot=>{state[key]=rows(snapshot)},true);
 listen('settings',doc(db,'settings','main'),snap=>{state.budget=snap.data()?.budget||0},true);
 listen('agenda',collection(db,'agenda'),snapshot=>{state.agenda=rows(snapshot).sort((a,b)=>a.start-b.start)},true);
 listen('hasMural',query(collection(db,'cases'),where('status','==','ok'),limit(1)),snap=>{state.hasMural=!snap.empty},true);
 const key=dayKey(),votingDay=VOTE_DAYS.find(d=>d.key===key);
 if(key!==currentDay){currentDay=key;state.qvoted={};state.querido={};state.voterCount=0;}
 if(votingDay){
  listen('voted-'+key,doc(db,'querido',key,'voters',auth.currentUser.uid),snap=>{state.qvoted={[key]:snap.exists()?[state.me]:[]}},true);
  if(currentView==='querido')listen('votes-'+key,doc(db,'querido',key),snap=>{
   const data=snap.data();state.voterCount=data?.voters||0;state.querido={[key]:Object.fromEntries(ALL.map(id=>[id,decodeTally(data?.counts?.[id]||0)]))};
  });
 }
 // Não consulta dias futuros nem presume ausência de voto antes de carregar o dia.
 for(const day of VOTE_DAYS.filter(d=>Date.now()>=d.deadline))listen('participation-'+day.key,collection(db,'participation',day.key,'people'),snap=>{
  state.attendance={...state.attendance,[day.key]:Object.fromEntries(snap.docs.map(d=>[d.id,true]))};state.attendanceReady={...state.attendanceReady,[day.key]:true};
 },true);
 if(lazy.chat)listen('chat',query(collection(db,'chat'),orderBy('createdAt','desc'),limit(PAGE_SIZE)),snapshot=>{
  if(chatOlder.length)chatOlder=mergeRows(chatOlder,chatHead);
  chatHead=rows(snapshot);
  if(!chatOlder.length){chatCursor=snapshot.docs.at(-1)||null;state.chatHasMore=snapshot.size===PAGE_SIZE;}
  publishChat();
 });
 if(currentView==='contas')listen('pix',collection(db,'pixKeys'),snap=>{state.pixKeys=Object.fromEntries(snap.docs.map(d=>[d.id,d.data()]))});
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
export async function addPoints(data){admin();return addDoc(collection(db,'points'),created(data));}
export async function addExpense(data){member();const amountCents=moneyToCents(data.amount);return addDoc(collection(db,'expenses'),created({...data,amount:amountCents/100,amountCents,by:state.me}));}
export async function savePix(type,value){member();await setDoc(doc(db,'pixKeys',state.me),normalizePix(type,value));}
export async function removePix(){member();await deleteDoc(doc(db,'pixKeys',state.me));}
export async function submitTask(data){member();return addDoc(collection(db,'tasks'),created({...data,who:state.me,status:'pend'}));}
export async function reviewTask(id,approve){
 admin();await runTransaction(db,async tx=>{
  const ref=doc(db,'tasks',id),snap=await tx.get(ref);if(!snap.exists()||snap.data().status!=='pend')throw Error('Esta tarefa já foi julgada.');
  const task=snap.data();tx.update(ref,{status:approve?'ok':'no'});
  if(approve)tx.set(doc(db,'points',`task_${id}`),created({who:task.who,d:task.d,why:task.why,kind:'aux'}));
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
  const ref=doc(db,'cases',id),snap=await tx.get(ref);if(!snap.exists()||snap.data().status!=='pend')throw Error('Esta denúncia já foi julgada.');
  if(condemn){tx.update(ref,{status:'ok'});tx.set(doc(db,'points',`case_${id}`),created({who:snap.data().who,d:-15,why:'Infração da monogamia (Mural)',kind:'inf'}));}
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
export async function setBudget(budget){admin();await updateDoc(doc(db,'settings','main'),{budget});}
export async function addSession(data){admin();return addDoc(collection(db,'agenda'),data);}
export async function vote(ballot){
 member();if(!votingOpen())throw Error("A votação abre de quinta a domingo da viagem, até meio-dia (São Paulo).");
 const key=dayKey(),uid=auth.currentUser.uid,id=state.me;
 const total=doc(db,'querido',key),marker=doc(db,'querido',key,'voters',uid);
 const delta=applyBallot(undefined,ballot,id);
 if((state.qvoted[key]||[]).includes(id))throw Error('Você já votou hoje. Amanhã abre de novo.');
 // Os incrementos são calculados no servidor: votos simultâneos não partem de
 // uma contagem antiga. O marcador e todos os incrementos são uma única escrita atômica.
 const batch=writeBatch(db);
 batch.set(total,{voters:increment(1),counts:Object.fromEntries(ALL.map(target=>[target,increment(delta.counts[target])]))},{merge:true});
 batch.set(marker,{voted:true});
 batch.set(doc(db,"participation",key,"people",id),{voted:true});
 try{await batch.commit();}
 catch(e){
  if(e.code==='permission-denied' && (await getDocFromServer(marker)).exists())throw Error('Você já votou hoje. Amanhã abre de novo.');
  throw e;
 }
}
