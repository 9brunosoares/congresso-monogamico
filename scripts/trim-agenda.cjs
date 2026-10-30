// Remove somente refeições sem encontro coletivo aprovadas pelo responsável.
const fs=require('node:fs');
const {context}=require('./firebase-context.cjs');
const remove=a=>(a.d===18&&['Café da manhã','Almoço'].includes(a.title)&&a.place==='Antes da viagem')||(a.d===22&&a.title==='Janta'&&a.place==='São Paulo');
(async()=>{const c=await context();try{
 const snap=await c.db.collection('agenda').get(),removed=snap.docs.filter(d=>remove(d.data()));
 console.log(JSON.stringify({existing:snap.size,remove:removed.map(d=>({id:d.id,d:d.data().d,title:d.data().title})),apply:process.argv.includes('--apply')}));
 if(!process.argv.includes('--apply')||!removed.length)return;
 fs.mkdirSync('.private',{recursive:true});fs.writeFileSync('.private/agenda-trim-before-'+Date.now()+'.json',JSON.stringify(snap.docs.map(d=>({id:d.id,...d.data()})),null,2));
 const batch=c.db.batch();removed.forEach(d=>batch.delete(d.ref));await batch.commit();
 const after=await c.db.collection('agenda').get();if(after.docs.some(d=>remove(d.data())))throw Error('Ainda há refeições a remover.');
 console.log('Agenda limpa; almoço de domingo na casa e demais atividades preservados.');
}finally{await c.close();}})().catch(e=>{console.error(e.message);process.exitCode=1});
