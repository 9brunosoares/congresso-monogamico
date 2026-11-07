import {votePeople} from './travel.js?v=20261106a';
import { ALL, EMOJIS } from './roster.js?v=20261106a';
export function validatePin(pin){if(!/^[0-9]{6}$/.test(pin))throw Error('Use um PIN de exatamente 6 dígitos.');}
export function dayKey(at=Date.now()){return String(Math.floor((at-3*60*60*1000)/(24*60*60*1000)));}
// Cada dígito hexadecimal guarda o total de um dos oito emojis, na ordem de EMOJIS.
// No máximo 13 recebidos por alvo: não há transporte entre dígitos (base 16).
// O número guarda somente totais; não preserva ordem nem autor de cada voto.
export function decodeTally(value=0){
 return Object.fromEntries(EMOJIS.map((emoji,i)=>[emoji,Math.floor(value/(16**i))%16]));
}
export function applyBallot(previous,ballot,voter,at=Date.now()){
 const eligible=votePeople(ALL,Number(new Date(at-10800000).getUTCDate()));
 const others=eligible.filter(id=>id!==voter);
 if(!eligible.includes(voter)||Object.keys(ballot).length!==others.length||others.some(id=>!EMOJIS.includes(ballot[id])))throw Error('Escolha um emoji para cada um dos outros congressistas.');
 const counts=Object.fromEntries(ALL.map(id=>{
  const before=previous?.counts?.[id]||0;
  return [id,!others.includes(id)?before:before+16**EMOJIS.indexOf(ballot[id])];
 }));
 return {counts,voters:(previous?.voters||0)+1};
}

// Quatro manhãs oficiais, no horário de São Paulo; demonstração não altera prazos.
export const VOTE_DAYS=[19,20,21,22].map(d=>{
 const start=Date.parse(`2026-11-${d}T00:00:00-03:00`);
 return {key:dayKey(start),day:d,start,deadline:start+12*3600000};
});
export const TEST_VOTE={key:'20764',day:7,start:1793934000000,deadline:1794063600000};
export function votingKey(at=Date.now()){return at>=TEST_VOTE.start&&at<VOTE_DAYS[0].start?TEST_VOTE.key:dayKey(at);}
export function votingOpen(at=Date.now()){return (at>=TEST_VOTE.start&&at<TEST_VOTE.deadline)||VOTE_DAYS.some(d=>at>=d.start+6*3600000&&at<d.deadline);}
export function resultDay(at=Date.now()){
 if(at>=TEST_VOTE.deadline&&at<VOTE_DAYS[0].start)return TEST_VOTE;
 const today=VOTE_DAYS.find(d=>d.key===dayKey(at));
 return today?(at>=today.deadline?today:null):at>=VOTE_DAYS.at(-1).deadline?VOTE_DAYS.at(-1):null;
}
export function alreadyVotedMessage(at=Date.now()){
 return dayKey(at)===VOTE_DAYS.at(-1).key||at>=VOTE_DAYS.at(-1).deadline?'Esta foi a última votação do congresso.':'Você já votou hoje. Amanhã abre de novo.';
}
export function scoringPoints(points=[],attendance={},ready,closure,at=Date.now()){
 const cutoff=closure?.closedAt?.toMillis?.()??at;
 return [...points.filter(p=>!closure||(p.createdAt?.toMillis?.()||0)<=cutoff),...missedVotePoints(attendance,cutoff).filter(p=>!ready||ready[p.id.split('_')[1]])];
}
export function notice(text){const value=String(text).trim().replace(/…$/,'');return /[.!?]$/.test(value)?value:value+'.';}
export function missedVotePoints(attendance={},at=Date.now()){
 return VOTE_DAYS.filter(d=>at>=d.deadline).flatMap(d=>votePeople(ALL,d.day).filter(id=>!attendance[d.key]?.[id]).map(who=>({id:`missed_${d.key}_${who}`,who,d:-5,kind:'inf',why:'Queridômetro não preenchido até meio-dia',at:`${d.day}/11/2026, 12:00`,createdAt:{toMillis:()=>d.deadline}})));
}
