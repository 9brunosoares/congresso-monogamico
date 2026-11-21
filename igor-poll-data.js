import {getApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore,doc,onSnapshot,getDocFromServer,runTransaction,writeBatch,increment,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import {IGOR_HOST,IGOR_VOTERS,igorQuestion,igorEmptyRound,igorPayload} from './igor-poll-model.js?v=20261121p';

export function createIgorPollData(){
 const app=getApp(),auth=getAuth(app),user=auth.currentUser;
 if(!user)throw Error('Entre novamente para participar.');
 const who=user.email?.split('@')[0],uid=user.uid,db=getFirestore(app),sessionRef=doc(db,'igorLive','main');
 const round=q=>doc(db,'igorLive','main','rounds',String(q));
 const mine=q=>doc(db,'igorLive','main','rounds',String(q),'answers',who);
 function requireSession(){if(auth.currentUser?.uid!==uid)throw Error('A conta mudou. Abra a enquete novamente.');}
 function host(){requireSession();if(who!==IGOR_HOST)throw Error('O Igor controla a apresentação.');}
 return {
  who,
  watchSession(fn,fail){requireSession();return onSnapshot(sessionRef,s=>fn(s.exists()?s.data():null),fail);},
  watchRound(q,fn,fail){requireSession();return onSnapshot(round(q),s=>fn(s.exists()?s.data():null),fail);},
  watchMine(q,fn,fail){requireSession();return onSnapshot(mine(q),{includeMetadataChanges:true},s=>fn(s.exists()?s.data():null,!s.metadata?.hasPendingWrites),fail);},
  async start(){
   host();return runTransaction(db,async tx=>{
    const current=await tx.get(sessionRef);if(current.exists())return current.data();
    const stamp=serverTimestamp();tx.set(sessionRef,{question:1,startedAt:stamp,updatedAt:stamp});tx.set(round(1),igorEmptyRound(1));return {question:1};
   });
  },
  async next(expected){
   host();return runTransaction(db,async tx=>{
    const current=await tx.get(sessionRef);if(!current.exists())throw Error('Libere a primeira pergunta.');
    const q=current.data().question;if(q!==expected||q===10)return current.data();
    // A próxima rodada ainda não pode ser lida. As regras validam sua criação atômica.
    tx.update(sessionRef,{question:q+1,updatedAt:serverTimestamp()});tx.set(round(q+1),igorEmptyRound(q+1));return {question:q+1};
   });
  },
  async answer(q,choice){
   requireSession();if(!IGOR_VOTERS.includes(who)||!igorQuestion(q))throw Error('Esta conta não participa da votação.');
   const payload=igorPayload(q,choice);if(!payload)throw Error('Confira sua resposta.');
   const ref=mine(q),existing=await getDocFromServer(ref);if(existing.exists())return {already:true,data:existing.data()};
   const batch=writeBatch(db);batch.set(ref,{...payload,createdAt:serverTimestamp()});
   batch.update(round(q),{total:increment(1),['counts.'+choice]:increment(1)});
   try{await batch.commit();}
   catch(error){const saved=await getDocFromServer(ref).catch(()=>null);if(saved?.exists())return {already:true,data:saved.data()};throw error;}
   return {already:false,data:payload};
  }
 };
}
