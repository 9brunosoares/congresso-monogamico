import {P} from './roster.js?v=20261120j';
import {IGOR_VOTERS,igorQuestion,igorOptions,igorPayload,igorOptionLabel} from './igor-poll-model.js?v=20261121p';

export function buildIgorExport(session,rounds,capturedAt=new Date().toISOString()){
 const questions=rounds.map(({question:q,answers})=>{
  const question=igorQuestion(q);if(!question)throw Error('Pergunta inválida na exportação.');
  const options=igorOptions(q),counts=Object.fromEntries(options.map(o=>[o.id,0]));
  const votes=Object.entries(answers).map(([who,data])=>{
   if(!IGOR_VOTERS.includes(who)||!igorPayload(q,data.choice))throw Error('Resposta inválida na exportação.');
   counts[data.choice]++;
   const chosen=options.find(o=>o.id===data.choice);
   return {who,name:P[who]?.nick||who,choice:data.choice,answer:igorOptionLabel(chosen),createdAt:data.createdAt};
  });
  return {question:q,text:question.text,total:votes.length,options:options.map(o=>({id:o.id,label:igorOptionLabel(o),votes:counts[o.id]})),votes};
 });
 const snapshot={version:1,presentation:'Igor',capturedAt,session,questions};
 const text=['APRESENTAÇÃO DO IGOR — PALPITES',`Exportado em ${capturedAt}`,...questions.flatMap(q=>['',`${q.question}. ${q.text}`,`${q.total} de ${IGOR_VOTERS.length} respostas`,...q.options.map(o=>`${o.label}: ${o.votes}`)])].join('\n');
 const cell=v=>{let text=String(v??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
 const csv=[['Pergunta','Texto','Congressista','Resposta','Registrado em'],...questions.flatMap(q=>q.votes.map(v=>[q.question,q.text,v.name,v.answer,v.createdAt]))].map(row=>row.map(cell).join(',')).join('\r\n');
 return {snapshot,text,csv};
}
