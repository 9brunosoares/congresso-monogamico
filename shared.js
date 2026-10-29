import { ALL, EMOJIS } from './roster.js';
export function validatePin(pin){if(!/^[0-9]{6}$/.test(pin))throw Error('Use um PIN de exatamente 6 dígitos.');}
export function dayKey(at=Date.now()){return String(Math.floor((at-3*60*60*1000)/(24*60*60*1000)));}
// Cada dígito hexadecimal guarda o total de um dos oito emojis, na ordem de EMOJIS.
// No máximo 13 recebidos por alvo: não há transporte entre dígitos (base 16).
// O número guarda somente totais; não preserva ordem nem autor de cada voto.
export function decodeTally(value=0){
 return Object.fromEntries(EMOJIS.map((emoji,i)=>[emoji,Math.floor(value/(16**i))%16]));
}
export function applyBallot(previous,ballot,voter){
 const others=ALL.filter(id=>id!==voter);
 if(!ALL.includes(voter)||Object.keys(ballot).length!==others.length||others.some(id=>!EMOJIS.includes(ballot[id])))throw Error('Escolha um emoji para cada um dos outros congressistas.');
 const counts=Object.fromEntries(ALL.map(id=>{
  const before=previous?.counts?.[id]||0;
  return [id,id===voter?before:before+16**EMOJIS.indexOf(ballot[id])];
 }));
 return {counts,voters:(previous?.voters||0)+1};
}
