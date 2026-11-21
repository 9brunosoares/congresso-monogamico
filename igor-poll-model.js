import {ALL} from './roster.js?v=20261120j';
import {isNanuActivity} from './nanu-poll-model.js?v=20261121b';

export const IGOR_HOST='igor';
export const IGOR_VOTERS=ALL.filter(id=>id!==IGOR_HOST);
const binary=[{id:'a',label:'Sim'},{id:'b',label:'Não'}];
const option=(id,label)=>({id,label});
export const IGOR_QUESTIONS=[
 {text:'Lula vai sofrer impeachment?',options:binary,colors:true},
 {text:'Kirk e Pelado vão terminar em 2027?',options:binary},
 {text:'A guerra entre Palestina e Israel vai acabar em quantos anos?',min:1,max:30,step:1,special:option('never','Nunca vai acabar')},
 {text:'Haverá revolução das máquinas/IAs? Daqui a quantos anos?',min:5,max:100,step:5,special:option('over','+100 anos')},
 {text:'Nós vamos adotar uma vira-lata ou comprar um chihuahua?',options:[option('a','Adotar uma vira-lata'),option('b','Comprar um chihuahua')]},
 {text:'Teremos um super El Niño?',options:binary},
 {text:'O Grammy de Album of the Year vai para…',options:[
  {id:'a',artist:'Phoebe Bridgers',label:'Lost Weekend',image:'album-1.jpg'},
  {id:'b',artist:'Olivia Dean',label:'The Art of Loving',image:'album-2.jpg'},
  {id:'c',artist:'Ella Langley',label:'Dandelion',image:'album-3.jpg'},
  {id:'d',artist:'Bruno Mars',label:'The Romantic',image:'album-4.jpg'},
  {id:'e',artist:'RAYE',label:'This Music May Contain Hope.',image:'album-5.jpg'},
  {id:'f',artist:'Olivia Rodrigo',label:'You Seem Pretty Sad for a Girl So in Love',image:'album-6.jpg'},
  {id:'g',artist:'Rosalía',label:'Lux',image:'album-7.jpg'},
  {id:'h',artist:'Taylor Swift',label:'The Life of a Showgirl',image:'album-8.jpg'}
 ]},
 {text:'A esquerda vai vencer em 2030?',options:binary},
 {text:'Quem vem no Todo Mundo no Rio?',options:['Adele','Katy Perry','Rihanna','Beyoncé','Dua Lipa','Justin Bieber','U2','Não vai ter','Outro'].map((label,i)=>option('abcdefghi'[i],label))},
 {text:'Você está confirmado no XVII Congresso Monogâmico em 2027?',options:binary}
];
export const igorQuestion=q=>Number.isInteger(q)?IGOR_QUESTIONS[q-1]||null:null;
export function igorOptions(q){
 const question=igorQuestion(q);if(!question)return [];
 if(question.options)return question.options;
 return [...Array.from({length:(question.max-question.min)/question.step+1},(_,i)=>{
  const n=question.min+i*question.step;return option('y'+n,n+' '+(n===1?'ano':'anos'));
 }),question.special];
}
export const igorEmptyRound=q=>({counts:Object.fromEntries(igorOptions(q).map(o=>[o.id,0])),total:0});
export function igorPayload(q,choice){
 const question=igorQuestion(q);
 if(!question||!igorOptions(q).some(o=>o.id===choice))return null;
 return {choice};
}
export function igorAgendaAccess(activity,who,session){
 return isNanuActivity(activity)&&ALL.includes(who)&&(who===IGOR_HOST||!!igorQuestion(session?.question));
}
export const igorOptionLabel=o=>o.artist?o.artist+' — '+o.label:o.label;
