import {getApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore,doc,getDocFromServer,writeBatch,increment,serverTimestamp,runTransaction} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import {ALL} from './roster.js?v=20261120j';
import {RANKING_DAY,RANKING_END,rankingOpen,rankingDelta,presentationResults,PRESENTATION_REASON} from './presentation-ranking-model.js?v=20261122a';

export function createPresentationRankingData(){
 const app=getApp(),auth=getAuth(app),user=auth.currentUser,who=user?.email?.split('@')[0];
 if(!user||!ALL.includes(who))throw Error('Entre no aplicativo para votar.');
 const db=getFirestore(app),mine=doc(db,'presentationBallots',who),total=doc(db,'presentationTallies','main');
 function session(){if(auth.currentUser?.uid!==user.uid)throw Error('A conta mudou. Reabra a votação.');}
 return {who,
  async load(){session();const [saved,participation]=await Promise.all([getDocFromServer(mine),getDocFromServer(doc(db,'querido',RANKING_DAY,'voters',user.uid))]);return {saved:saved.exists()?saved.data():null,eligible:participation.exists()};},
  async results(){session();if(Date.now()<RANKING_END)return null;const snap=await getDocFromServer(total);return snap.exists()?{voters:snap.data().voters,rows:presentationResults(snap.data())}:null;},
  async send(order){
   session();if(!rankingOpen())throw Error('A votação encerrou ao meio-dia de 22/11 (São Paulo).');
   const delta=rankingDelta(who,order),batch=writeBatch(db);
   batch.set(mine,{order:[...order],scores:delta.sums,createdAt:serverTimestamp()});
   batch.set(total,{voters:increment(1),sums:Object.fromEntries(Object.entries(delta.sums).map(([id,n])=>[id,increment(n)])),samples:Object.fromEntries(Object.entries(delta.samples).map(([id,n])=>[id,increment(n)]))},{merge:true});
   try{await batch.commit();}catch(e){const saved=await getDocFromServer(mine).catch(()=>null);if(saved?.exists())return saved.data();throw e;}
   return {order:[...order]};
  },
  async finalize(){
   session();if(Date.now()<RANKING_END)return [];
   return runTransaction(db,async tx=>{
    const closed=await tx.get(doc(db,'scoreClosures','main'));if(closed.exists())return [];
    const tally=await tx.get(total);if(!tally.exists()||!tally.data().voters)return [];
    const winners=presentationResults(tally.data()).filter(row=>row.prize);
    const records=[];for(const row of winners)records.push(await tx.get(doc(db,'points','presentation_'+row.id)));
    const at=new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    winners.forEach((row,i)=>{if(!records[i].exists())tx.set(doc(db,'points','presentation_'+row.id),{who:row.id,d:row.prize,kind:'jogo',why:PRESENTATION_REASON,at,createdAt:serverTimestamp()});});
    return winners;
   });
  }
 };
}
