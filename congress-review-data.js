import {getApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore,doc,getDocFromServer,writeBatch,increment,arrayUnion} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import {REVIEW_KEYS,validReview} from './congress-review-model.js?v=20261122n';

export function createCongressReviewData(){
 const app=getApp(),auth=getAuth(app),user=auth.currentUser,db=getFirestore(app);
 if(!user)throw Error('Entre no aplicativo para avaliar.');
 const marker=doc(db,'congressReviewVoters',user.uid),total=doc(db,'congressReviews','xvi');
 function session(){if(auth.currentUser?.uid!==user.uid)throw Error('A conta mudou. Reabra a pesquisa.');}
 return {
  async load(){session();const snap=await getDocFromServer(marker);session();return snap.exists();},
  async results(){session();const snap=await getDocFromServer(total);session();return snap.exists()?snap.data():{voters:0,ratings:{},suggestions:[]};},
  async send(ratings,text){
   session();text=text.trim();if(!validReview(ratings,text))throw Error('Avalie os seis temas ou marque Não se aplica.');
   const suggestions=text?[{id:crypto.randomUUID().replaceAll('-',''),text}]:[];
   const batch=writeBatch(db),data={voters:increment(1),ratings:Object.fromEntries(REVIEW_KEYS.map(k=>[k,increment(16**ratings[k])])),suggestions:arrayUnion(...suggestions)};
   batch.set(total,data,{merge:true});batch.set(marker,{voted:true});
   try{await batch.commit();session();}
   catch(e){if(auth.currentUser?.uid===user.uid){const saved=await getDocFromServer(marker).catch(()=>null);if(saved?.exists())return;}throw e;}
  }
 };
}
