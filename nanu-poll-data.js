import {getApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore,doc,collection,onSnapshot,getDocFromServer,runTransaction,writeBatch,increment,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import {NANU_HOST,NANU_ROOM,NANU_ACTIVE_VOTERS,EMPTY_NANU_ROUND,nanuQuestion,nanuChoiceValid,cleanNanuText} from './nanu-poll-model.js?v=20261121r';

export function createNanuPollData({room=NANU_ROOM,voters=NANU_ACTIVE_VOTERS}={}){
 const app=getApp(),auth=getAuth(app),user=auth.currentUser;
 if(!user)throw Error('Entre novamente para participar.');
 const who=user.email?.split('@')[0],uid=user.uid,db=getFirestore(app),sessionRef=doc(db,'nanuLive',room);
 if(room==='teste'&&!['nanu','bruno'].includes(who))throw Error('Este ensaio é exclusivo de Nanu e Bru.');
 const round=q=>doc(db,'nanuLive',room,'rounds',String(q));
 const mine=q=>doc(db,'nanuLive',room,'rounds',String(q),'answers',who);
 function requireSession(){if(auth.currentUser?.uid!==uid)throw Error('A conta mudou. Abra a enquete novamente.');}
 function host(){requireSession();if(who!==NANU_HOST)throw Error('O Nanu controla a apresentação.');}
 return {
  who,
  watchSession(fn,fail){requireSession();return onSnapshot(sessionRef,s=>fn(s.exists()?s.data():null),fail);},
  watchRound(q,fn,fail){requireSession();return onSnapshot(round(q),s=>fn(s.exists()?s.data():null),fail);},
  watchMine(q,fn,fail){requireSession();return onSnapshot(mine(q),{includeMetadataChanges:true},s=>fn(s.exists()?s.data():null,!s.metadata?.hasPendingWrites),fail);},
  watchCloud(fn,fail){requireSession();return onSnapshot(collection(db,'nanuLive',room,'rounds','11','answers'),s=>fn(s.docs.map(d=>({id:d.id,text:d.data().text}))),fail);},
  async start(){
   host();return runTransaction(db,async tx=>{
    const current=await tx.get(sessionRef);if(current.exists())return current.data();
    const stamp=serverTimestamp();tx.set(sessionRef,{question:1,startedAt:stamp,updatedAt:stamp});tx.set(round(1),{...EMPTY_NANU_ROUND});return {question:1};
   });
  },
  async next(expected){
   host();return runTransaction(db,async tx=>{
    const current=await tx.get(sessionRef);if(!current.exists())throw Error('Libere a primeira pergunta.');
    const q=current.data().question;if(q!==expected||q===11)return current.data();
    const previous=await tx.get(round(q)),next=await tx.get(round(q+1));
    if(previous.data()?.total!==voters.length)throw Error('Aguarde todos responderem para avançar.');
    if(next.exists())throw Error('A próxima pergunta já foi preparada. Reabra a enquete.');
    tx.update(sessionRef,{question:q+1,updatedAt:serverTimestamp()});tx.set(round(q+1),{...EMPTY_NANU_ROUND});return {question:q+1};
   });
  },
  async answer(q,value){
   requireSession();if(!voters.includes(who)||!nanuQuestion(q))throw Error('Esta conta não participa da votação.');
   const payload=q===11?{text:cleanNanuText(value)}:{choice:value};
   if(q===11?(!payload.text||payload.text.length>140):!nanuChoiceValid(q,value))throw Error('Confira sua resposta.');
   const ref=mine(q),existing=await getDocFromServer(ref);if(existing.exists())return {already:true,data:existing.data()};
   const batch=writeBatch(db);batch.set(ref,{...payload,createdAt:serverTimestamp()});
   batch.update(round(q),{total:increment(1),...(q<11?{[value]:increment(1)}:{})});
   try{await batch.commit();}
   catch(error){const saved=await getDocFromServer(ref).catch(()=>null);if(saved?.exists())return {already:true,data:saved.data()};throw error;}
   return {already:false,data:payload};
  }
 };
}
