import {getFirestore,doc,getDoc} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import {VOTE_DAYS} from './shared.js?v=20261122e';
import {emojiStory} from './wrapped-model.js?v=20261123d';

export async function loadWrappedEmoji(id){
 const db=getFirestore();
 const rounds=await Promise.all(VOTE_DAYS.map(async ({key,day})=>{
  const snap=await getDoc(doc(db,'querido',key));
  return snap.exists()?{day,counts:snap.data().counts}:null;
 }));
 return emojiStory(rounds.filter(Boolean),id);
}

