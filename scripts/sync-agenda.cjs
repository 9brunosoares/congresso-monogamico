// Substitui apenas a programação, com cópia de segurança. Não altera contas nem registros de uso.
const fs=require('node:fs');
const {context}=require('./firebase-context.cjs');
(async()=>{
 const c=await context();try{
  const {INITIAL_AGENDA}=await import('../agenda-data.js');
  const list=INITIAL_AGENDA.map(a=>({...a,start:Date.parse(`2026-11-${String(a.d).padStart(2,'0')}T${a.t}:00-03:00`)})).sort((a,b)=>a.start-b.start);
  for(const d of [18,19,20,21,22]){
   const meals=list.filter(a=>a.d===d&&/^(Café da manhã|Almoço|Janta)/.test(a.title));
   const expected=d===18?1:d===22?2:3;
   if(meals.length!==expected)throw Error(`Esperadas ${expected} refeições no dia ${d}.`);
  }
  const previous=await c.db.collection('agenda').get();
  console.log(`Agenda atual: ${previous.size} sessões. Nova agenda: ${list.length} sessões.`);
  if(!process.argv.includes('--apply')){console.log('Use --apply para publicar a programação.');return;}
  fs.mkdirSync('.private',{recursive:true});
  const backup='.private/agenda-before-'+Date.now()+'.json';
  fs.writeFileSync(backup,JSON.stringify(previous.docs.map(d=>({id:d.id,...d.data()})),null,2));
  const batch=c.db.batch();previous.docs.forEach(d=>batch.delete(d.ref));
  list.forEach((a,i)=>{
   const end=list[i+1]?.d===a.d?list[i+1].start:a.start+120*60000;
   batch.set(c.db.doc(`agenda/p-${a.d}-${a.t.replace(':','')}`),{place:'',pts:0,prep:'',note:'',...a,end});
  });
  await batch.commit();
  const saved=await c.db.collection('agenda').get();
  if(saved.size!==list.length)throw Error('Quantidade publicada diferente da esperada.');
  console.log(JSON.stringify({published:saved.size,days:[18,19,20,21,22],backup,otherCollectionsChanged:false},null,2));
 }finally{await c.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
