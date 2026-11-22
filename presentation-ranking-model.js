import {ALL,P} from './roster.js?v=20261120j';

export const PRESENTERS=ALL.filter(id=>id!=='diogo');
export const RANKING_START=Date.parse('2026-11-22T00:00:00-03:00');
export const RANKING_END=Date.parse('2026-11-22T10:40:00-03:00');
export const RANKING_DAY='20779';
export const PRESENTATION_REASON='Retrospectiva do Meu An* · Top 3';
export const rankingOpen=(at=Date.now())=>at>=RANKING_START&&at<RANKING_END;
export const rankingCandidates=who=>PRESENTERS.filter(id=>id!==who);
export function validRanking(who,order){const allowed=rankingCandidates(who);return ALL.includes(who)&&Array.isArray(order)&&order.length===allowed.length&&new Set(order).size===order.length&&order.every(id=>allowed.includes(id));}
export function rankingDelta(who,order){
 if(!validRanking(who,order))throw Error('Ordene todas as apresentações, sem incluir a sua.');
 const step=order.length===11?11:10;
 return {voters:1,sums:Object.fromEntries(PRESENTERS.map(id=>[id,order.includes(id)?(order.length-1-order.indexOf(id))*step:0])),samples:Object.fromEntries(PRESENTERS.map(id=>[id,order.includes(id)?1:0]))};
}
export function presentationResults(tally){
 const rows=PRESENTERS.map(id=>({id,name:P[id].nick,sum:tally?.sums?.[id]||0,samples:tally?.samples?.[id]||0}));
 const compare=(a,b)=>a.samples&&b.samples?b.sum*a.samples-a.sum*b.samples:b.samples-a.samples;
 return rows.sort((a,b)=>compare(a,b)||a.name.localeCompare(b.name,'pt-BR')).map(row=>{
  const rank=row.samples?1+rows.filter(other=>other.samples&&other.sum*row.samples>row.sum*other.samples).length:null;
  return {...row,rank,score:row.samples?100*row.sum/(110*row.samples):0,prize:({1:20,2:10,3:5})[rank]||0};
 });
}
export const presentationPhoto=id=>'assets/presentations/'+id+'.webp';
