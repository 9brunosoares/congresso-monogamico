// Exportação somente de leitura. Dados/imagens ficam fora do conteúdo público do app.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {context}=require('./firebase-context.cjs');
(async()=>{const c=await context();try{
 const {ALL,P,EMOJIS}=await import('../roster.js');
 const {scoringPoints,decodeTally,VOTE_DAYS}=await import('../shared.js');
 const {votePeople}=await import('../travel.js');
 const snapshot=await c.db.runTransaction(async tx=>{
  const closed=await tx.get(c.db.doc('scoreClosures/main'));
  const points=await tx.get(c.db.collection('points'));
  const cases=await tx.get(c.db.collection('cases').where('status','==','ok'));
  const asOf=points.readTime.toMillis(),closure=closed.exists?closed.data():null;
  const revealed=VOTE_DAYS.filter(day=>day.deadline<=asOf).at(-1),cutoff=closure?.closedAt?.toMillis?.()??asOf;
  let vote=null;
  if(revealed){const total=await tx.get(c.db.doc('querido/'+revealed.key));vote=total.exists?total.data():null;}
  const attendance={},attendanceReady={};
  for(const day of VOTE_DAYS.filter(day=>day.deadline<=cutoff)){
   const participation=await tx.get(c.db.collection('participation/'+day.key+'/people'));
   attendance[day.key]=Object.fromEntries(participation.docs.filter(doc=>doc.data().voted===true).map(doc=>[doc.id,true]));
   attendanceReady[day.key]=true;
  }
  return {asOf,closure,revealed,vote,attendance,attendanceReady,
   points:points.docs.map(doc=>({id:doc.id,...doc.data()})),cases:cases.docs.map(doc=>({id:doc.id,...doc.data()}))};
 },{readOnly:true});
 const stamp=new Date(snapshot.asOf).toISOString();
 const outIndex=process.argv.indexOf('--out');
 const out=outIndex>=0?path.resolve(process.argv[outIndex+1]):path.resolve('.private/tv/'+stamp.replace(/[:.]/g,'-'));
 fs.mkdirSync(path.join(out,'retratos'),{recursive:true});fs.mkdirSync(path.join(out,'mural'),{recursive:true});
 const participants=ALL.map(id=>{
  const file='retratos/'+id+'.jpg';fs.copyFileSync(path.join('img',id+'.jpg'),path.join(out,file));
  return {id,nick:P[id].nick,photo:file,...(P[id].frame?{frame:P[id].frame}:{})};
 });
 const scored=scoringPoints(snapshot.points,snapshot.attendance,snapshot.attendanceReady,snapshot.closure,snapshot.asOf).filter(point=>ALL.includes(point.who));
 const ranking=ALL.map(id=>({id,nick:P[id].nick,points:scored.filter(p=>p.who===id).reduce((sum,p)=>sum+p.d,0),entries:scored.filter(p=>p.who===id).length}))
  .sort((a,b)=>b.points-a.points||a.nick.localeCompare(b.nick,'pt-BR')).map((row,index)=>({position:index+1,...row}));
 let querido=null;
 if(snapshot.revealed&&snapshot.vote){
  const eligible=votePeople(ALL,snapshot.revealed.day),voters=snapshot.vote.voters;
  assert(Number.isInteger(voters)&&voters>=0&&voters<=eligible.length,'Votantes inválidos.');
  const rows=eligible.map(id=>({id,nick:P[id].nick,counts:decodeTally(snapshot.vote.counts?.[id]||0)}));
  assert.equal(rows.reduce((sum,row)=>sum+Object.values(row.counts).reduce((a,b)=>a+b,0),0),voters*(eligible.length-1),'Soma dos emojis inconsistente.');
  querido={date:`2026-11-${snapshot.revealed.day}`,dayKey:snapshot.revealed.key,voters,eligible:eligible.length,closed:true,emojis:EMOJIS,rows};
 }
 const approved=snapshot.cases.filter(item=>ALL.includes(item.who)).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0));
 const images=approved.length?await c.db.getAll(...approved.map(item=>c.db.doc('casePhotos/'+item.id))):[];
 const cases=approved.map((item,index)=>{
  const image=images[index]?.data()?.dataUrl;let photo=null;
  if(image){
   const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(image);
   assert(match,'Imagem inválida no caso '+item.id);
   photo='mural/caso-'+item.id.replace(/[^A-Za-z0-9_-]/g,'_')+'.'+(match[1]==='jpeg'?'jpg':match[1]);
   fs.writeFileSync(path.join(out,photo),Buffer.from(match[2],'base64'));
  }
  const point=snapshot.points.find(p=>p.id==='case_'+item.id);
  return {id:item.id,who:item.who,nick:P[item.who].nick,description:item.what,status:'ok',
   createdAt:item.createdAt?.toDate?.().toISOString()||null,penalty:point?.d??null,photo,needsIllustration:!photo};
 });
 const data={version:1,capturedAt:stamp,timezone:'America/Sao_Paulo',
  note:'Retrato dos dados na data de captura. O vídeo só se atualiza com uma nova exportação e renderização.',
  participants,queridometro:querido,scoreboard:{closedAt:snapshot.closure?.closedAt?.toDate?.().toISOString()||null,rows:ranking},mural:{cases}};
 const json=path.join(out,'dados-tv.json');fs.writeFileSync(json,JSON.stringify(data,null,2),'utf8');
 console.log(JSON.stringify({out,json,capturedAt:stamp,queridometro:querido?{date:querido.date,voters:querido.voters,eligible:querido.eligible}:null,
  ranking,cases:cases.map(({id,nick,description,photo,needsIllustration})=>({id,nick,description,photo,needsIllustration}))},null,2));
}finally{await c.close();}})().catch(error=>{console.error(error.message);process.exitCode=1;});
