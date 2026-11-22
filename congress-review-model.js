export const REVIEW_TOPICS=[
 {id:'geral',title:'Experiência geral',detail:'Quanto você gostou do congresso?'},
 {id:'chacara',title:'Chácara',detail:'Conforto e estrutura.'},
 {id:'comida',title:'Comidas e bebidas',detail:'Qualidade e variedade.'},
 {id:'programacao',title:'Programação',detail:'Dinâmicas, apresentações e equilíbrio com tempo livre.'},
 {id:'organizacao',title:'Organização',detail:'Comunicação, logística e divisão dos gastos.'},
 {id:'app',title:'Aplicativo',detail:'Quanto ajudou e divertiu durante a viagem?'}
];
export const REVIEW_KEYS=REVIEW_TOPICS.map(t=>t.id);
export const REVIEW_SUGGESTION='O que a COMORG deve manter, mudar ou inventar para o próximo congresso?';
export function validReview(ratings,text=''){
 return ratings&&Object.keys(ratings).length===6&&REVIEW_KEYS.every(k=>Number.isInteger(ratings[k])&&ratings[k]>=0&&ratings[k]<=5)&&typeof text==='string'&&text.trim().length<=1500;
}
export function reviewDistribution(packed=0){return Array.from({length:6},(_,i)=>Math.floor(packed/16**i)%16);}
export function reviewSummary(data){
 return REVIEW_TOPICS.map(t=>{const counts=reviewDistribution(data?.ratings?.[t.id]),rated=counts.slice(1).reduce((a,b)=>a+b,0);return {...t,counts,rated,average:rated?counts.reduce((a,n,i)=>a+n*i,0)/rated:null};});
}
