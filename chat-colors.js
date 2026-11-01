const PALETTE=[
 ['#a33c51','#f18ba0'],['#8d4b18','#e8ad75'],['#75600d','#d8c365'],
 ['#53701c','#aecb74'],['#277144','#76c49a'],['#08756c','#6bc7bc'],
 ['#176e89','#7dc5df'],['#345cad','#9eb8f4'],['#6346ac','#b7a2ed'],
 ['#8c419b','#d6a0df'],['#a23c7b','#e895c7'],['#776044','#cfb48f'],
 ['#3d6d69','#91bdb5'],['#6d587d','#baa9cf'],
].map(([light,dark])=>({light,dark}));
const randomUnit=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;

// Associação só em memória: nunca salvar cor no Firestore, URL ou storage.
export function createChatColors(random=randomUnit){
 let colors,assigned;
 function reset(){
  colors=[...PALETTE];assigned=new Map();
  for(let i=colors.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[colors[i],colors[j]]=[colors[j],colors[i]];}
 }
 reset();
 return {reset,forKey(key){
  if(typeof key!=='string'||!/^[a-f0-9]{32}$/.test(key))return null;
  if(!assigned.has(key))assigned.set(key,colors[assigned.size%colors.length]);
  return assigned.get(key);
 }};
}
