import {ALL} from './roster.js?v=20261120j';

export const NANU_HOST='nanu';
export const NANU_VOTERS=ALL.filter(id=>id!==NANU_HOST);
// Ensaio em dois aparelhos: Nanu apresenta, Bru responde. A sala oficial fica preservada.
export const NANU_TEST_MODE=true;
export const NANU_ROOM=NANU_TEST_MODE?'teste':'main';
export const NANU_ACTIVE_VOTERS=NANU_TEST_MODE?['bruno']:NANU_VOTERS;
export const NANU_QUESTIONS=[
 {text:'Qual percentual dos candidatos recebeu a tag "Porta aberta"?',options:['25%','50%','20%']},
 {text:'Qual percentual dos candidatos recebeu a tag "Maluco"?',options:['37%','7%','12%']},
 {text:'Qual estado de origem tem a maior proporção de candidatos com alta compatibilidade sexual (nota 4 ou 5)?',options:['BA','SP','PR']},
 {text:'Quantos dates foram com DJs? (em % dos candidatos)',options:['12%','37%','7%']},
 {text:'Qual é o score médio de quem deu ghosting?',options:['59','84','54']},
 {text:'Qual percentual dos candidatos tem a tag ">1.85m" (igual ou mais alto que o Nanu)?',options:['62%','32%','37%']},
 {text:'O Nanu se interessa mais por quem não se interessa por ele.',options:['Sim','Não','Não dá pra saber']},
 {text:'Quem é compatível politicamente não combina sexualmente.',options:['Verdadeiro','Falso']},
 {text:'Quem tem tag XL ou XXL teve score final superior aos que não têm.',options:['Verdadeiro','Falso']},
 {text:'Os nordestinos pontuam mais que os sudestinos.',options:['Sim','Não','Não dá pra saber']},
 {text:'Por que o Nanu não namora?',options:null}
];
export const EMPTY_NANU_ROUND={a:0,b:0,c:0,total:0};
export const nanuQuestion=q=>Number.isInteger(q)?NANU_QUESTIONS[q-1]||null:null;
export const nanuChoiceValid=(q,choice)=>typeof choice==='string'&&choice.length===1&&!!nanuQuestion(q)?.options?.['abc'.indexOf(choice)];
export const cleanNanuText=value=>String(value??'').replace(/\s+/g,' ').trim();
const fold=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
export function isNanuActivity(activity){return /(?:retrospectiva|restrospectiva).*meu an/.test(fold(String(activity?.title||'')));}
export function nanuAgendaAccess(activity,who,session,{testMode=NANU_TEST_MODE}={}){
 return isNanuActivity(activity)&&(testMode?['nanu','bruno']:ALL).includes(who)&&(who===NANU_HOST||!!nanuQuestion(session?.question));
}

const STOP=new Set('a as o os um uma uns umas de da das do dos e em no na nos nas por porque pq que pra pro para com ele ela dele dela nanu ser estar esta esse essa isso isso eh muito mais menos tem ta seu sua seus suas so se namora namorar'.split(' '));
// Uma pessoa não aumenta o peso de uma palavra repetindo-a na mesma resposta.
// Negações permanecem junto do termo seguinte para não inverter o sentido.
export function nanuCloudWords(responses){
 const counts=new Map();
 for(const response of responses){
  const text=cleanNanuText(typeof response==='string'?response:response.text);
  const tokens=(text.toLocaleLowerCase('pt-BR').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)||[]);
  const terms=new Map();
  for(let i=0;i<tokens.length;i++){
   const key=fold(tokens[i]);
   if(key==='nao'){
    let j=i+1;while(j<tokens.length&&STOP.has(fold(tokens[j])))j++;
    const label=j<tokens.length?'não '+tokens[j]:'não';terms.set(fold(label),label);if(j<tokens.length)i=j;
   }else if(!STOP.has(key)&&key.length>1)terms.set(key,tokens[i]);
  }
  if(!terms.size&&text)terms.set(fold(text),text.toLocaleLowerCase('pt-BR'));
  for(const [key,label] of terms){const old=counts.get(key);counts.set(key,{key,label:old?.label||label,count:(old?.count||0)+1});}
 }
 return [...counts.values()].sort((a,b)=>b.count-a.count||a.key.localeCompare(b.key,'pt-BR')).slice(0,40);
}

export function layoutNanuCloud(words,width=640,height=400){
 const placed=[],max=Math.max(1,...words.map(w=>w.count)),mobile=width<450;
 const overlap=(a,b)=>a.x<b.x+b.w+5&&a.x+a.w+5>b.x&&a.y<b.y+b.h+4&&a.y+a.h+4>b.y;
 for(let i=0;i<words.length;i++){
  const word=words[i],label=word.label.length>30?word.label.slice(0,28)+'…':word.label;
  let size=Math.round((mobile?16:19)+(mobile?25:38)*Math.sqrt(word.count/max));
  size=Math.min(size,Math.floor((width-24)/(Math.max(1,label.length)*.61)));
  for(let attemptSize=size;attemptSize>=13;attemptSize-=3){
   const w=label.length*attemptSize*.61+8,h=attemptSize*1.2+4;let found=null;
   for(let step=0;step<1000;step++){
    const theta=step*.43+i*.31,r=2.6*Math.sqrt(step);
    const x=width/2+Math.cos(theta)*r*2.6-w/2,y=height/2+Math.sin(theta)*r*1.8-h/2;
    const box={x,y,w,h};if(x<8||y<8||x+w>width-8||y+h>height-8||placed.some(p=>overlap(box,p)))continue;
    found={...word,...box,label,size:attemptSize};break;
   }
   if(found){placed.push(found);break;}
  }
 }
 return placed;
}
