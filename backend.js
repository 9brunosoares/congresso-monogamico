import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, browserLocalPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, onSnapshot, query, orderBy, limit, addDoc, updateDoc, deleteDoc, runTransaction, serverTimestamp, writeBatch, increment, getDocFromServer } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';
import { ALL, P, EMOJIS } from './roster.js';
import { dayKey, applyBallot, validatePin, decodeTally } from './shared.js';

const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
const emptyState=()=>({me:null,admin:false,ready:false,budget:0,points:[],exps:[],shame:[],chat:[],tasks:[],querido:{},qvoted:{},voterCount:0,agenda:[],error:''});
let state=emptyState(), notify=()=>{}, generation=0, stops=[], voteStops=[], currentDay=dayKey();
let firstSnapshots=new Set(), connected=false;
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
}[e.code] || e.message || 'Não foi possível concluir. Tente novamente.');
export {errorText};
function stopData(){stops.forEach(f=>f());stops=[];voteStops.forEach(f=>f());voteStops=[];firstSnapshots=new Set();connected=false;}
function failed(e){state.error=errorText(e);emit();}
function ready(key){firstSnapshots.add(key);if(firstSnapshots.size>=10){state.ready=true;connected=true;}emit();}
function rows(snapshot){return snapshot.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>(a.createdAt?.toMillis?.()||0)-(b.createdAt?.toMillis?.()||0));}
async function claimProfile(user,id){
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
function subscribeVoting(){
 voteStops.forEach(f=>f());voteStops=[];currentDay=dayKey();
 const version=generation, key=currentDay;
 state.querido={[key]:Object.fromEntries(ALL.map(id=>[id,{}]))};state.qvoted={};state.voterCount=0;
 voteStops.push(onSnapshot(doc(db,'querido',key),snap=>{
  if(version!==generation)return;
  const data=snap.data();state.voterCount=data?.voters||0;
  state.querido={[key]:Object.fromEntries(ALL.map(id=>[id,decodeTally(data?.counts?.[id]||0)]))};ready('votes');
 },failed));
 voteStops.push(onSnapshot(doc(db,'querido',key,'voters',auth.currentUser.uid),snap=>{
  if(version!==generation)return;
  state.qvoted={[key]:snap.exists()?[state.me]:[]};ready('voted');
 },failed));
}
export async function start(onUpdate){
 notify=onUpdate;
 await setPersistence(auth,browserLocalPersistence);
 onAuthStateChanged(auth,async user=>{
  const version=++generation;stopData();state=emptyState();emit();
  if(!user){state.ready=true;emit();return;}
  const id=user.email?.split('@')[0];
  if(!P[id] || user.email!==`${id}@congresso.app`){await signOut(auth);return;}
  try {
   await claimProfile(user,id);
   if(version!==generation)return;
   state.me=id;emit();
   for(const [name,key] of [['points','points'],['expenses','exps'],['cases','shame'],['tasks','tasks']]){
    stops.push(onSnapshot(collection(db,name),snapshot=>{if(version!==generation)return;state[key]=rows(snapshot);ready(key);},failed));
   }
   stops.push(onSnapshot(query(collection(db,'chat'),orderBy('createdAt','desc'),limit(100)),snapshot=>{
    if(version!==generation)return;
    state.chat=rows(snapshot).map(m=>({...m,at:formatStamp(m.createdAt),mine:mine.has(m.id)}));ready('chat');
   },failed));
   stops.push(onSnapshot(doc(db,'settings','main'),snap=>{if(version!==generation)return;state.budget=snap.data()?.budget||0;ready('settings');},failed));
   stops.push(onSnapshot(collection(db,'agenda'),snapshot=>{if(version!==generation)return;state.agenda=rows(snapshot).sort((a,b)=>a.start-b.start);ready('agenda');},failed));
   stops.push(onSnapshot(doc(db,'admins',user.uid),snap=>{if(version!==generation)return;state.admin=snap.exists();ready('admin');},failed));
   subscribeVoting();
  }catch(e){if(version!==generation)return;await signOut(auth);failed(e);}
 });
 setInterval(()=>{if(connected && currentDay!==dayKey())subscribeVoting();},15000);
 window.addEventListener('online',()=>{state.error='';emit();});
 window.addEventListener('offline',()=>{state.error='Sem conexão. Os envios voltam quando a internet retornar.';emit();});
}
export async function login(id,pin,create=false){
 if(!P[id])throw Error('Escolha sua foto primeiro.');validatePin(pin);
 const method=create?createUserWithEmailAndPassword:signInWithEmailAndPassword;
 await method(auth,`${id}@congresso.app`,pin);
}
export const logout=()=>signOut(auth);
function member(){if(!state.me||!state.ready||!navigator.onLine)throw Error('Conecte-se à internet antes de enviar.');}
function admin(){member();if(!state.admin)throw Error('Esta ação é exclusiva dos ADMs.');}
export function formatStamp(timestamp){return timestamp?.toDate?timestamp.toDate().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'Agora';}
const stamp=()=>new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const created=data=>({...data,at:stamp(),createdAt:serverTimestamp()});
export async function addPoints(data){admin();return addDoc(collection(db,'points'),created(data));}
export async function addExpense(data){member();return addDoc(collection(db,'expenses'),created({...data,amount:Math.round(data.amount*100)/100}));}
export async function submitTask(data){member();return addDoc(collection(db,'tasks'),created({...data,who:state.me,status:'pend'}));}
export async function reviewTask(id,approve){
 admin();await runTransaction(db,async tx=>{
  const ref=doc(db,'tasks',id),snap=await tx.get(ref);if(!snap.exists()||snap.data().status!=='pend')throw Error('Esta tarefa já foi julgada.');
  const task=snap.data();tx.update(ref,{status:approve?'ok':'no'});
  if(approve)tx.set(doc(db,'points',`task_${id}`),created({who:task.who,d:task.d,why:task.why,kind:'aux'}));
 });
}
export async function addCase(data){member();return addDoc(collection(db,'cases'),created({...data,by:state.me,status:'pend'}));}
export async function judgeCase(id,condemn){
 admin();await runTransaction(db,async tx=>{
  const ref=doc(db,'cases',id),snap=await tx.get(ref);if(!snap.exists()||snap.data().status!=='pend')throw Error('Esta denúncia já foi julgada.');
  if(condemn){tx.update(ref,{status:'ok'});tx.set(doc(db,'points',`case_${id}`),created({who:snap.data().who,d:-15,why:'Infração da monogamia (Mural)',kind:'inf'}));}
  else tx.delete(ref);
 });
}
export async function sendChat(text){
 member();const ref=doc(collection(db,'chat'));mine.add(ref.id);
 try{
  await runTransaction(db,async tx=>{tx.set(ref,{text,createdAt:serverTimestamp()});});
  try{sessionStorage.setItem('xvi-mine',JSON.stringify([...mine].slice(-100)));}catch{}
 }catch(e){mine.delete(ref.id);throw e;}
}
export async function deleteChat(id){admin();await deleteDoc(doc(db,'chat',id));}
export async function setBudget(budget){admin();await updateDoc(doc(db,'settings','main'),{budget});}
export async function addSession(data){admin();return addDoc(collection(db,'agenda'),data);}
export async function vote(ballot){
 member();const key=dayKey(),uid=auth.currentUser.uid,id=state.me;
 const total=doc(db,'querido',key),marker=doc(db,'querido',key,'voters',uid);
 const delta=applyBallot(undefined,ballot,id);
 if((await getDocFromServer(marker)).exists())throw Error('Você já votou hoje. Amanhã abre de novo.');
 // Os incrementos são calculados no servidor: votos simultâneos não partem de
 // uma contagem antiga. O marcador e todos os incrementos são uma única escrita atômica.
 const batch=writeBatch(db);
 batch.set(total,{voters:increment(1),counts:Object.fromEntries(ALL.map(target=>[target,increment(delta.counts[target])]))},{merge:true});
 batch.set(marker,{voted:true});
 try{await batch.commit();}
 catch(e){
  if(e.code==='permission-denied' && (await getDocFromServer(marker)).exists())throw Error('Você já votou hoje. Amanhã abre de novo.');
  throw e;
 }
}
