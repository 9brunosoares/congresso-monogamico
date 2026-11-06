const fs=require('node:fs');
const {context}=require('./firebase-context.cjs');
(async()=>{const c=await context();try{
 const snap=await c.db.collection('agenda').get();
 const changes=[];
 for(const d of snap.docs){const a=d.data();let patch;
  if(a.d===21&&/Retrospectiva|Restrospectiva/i.test(a.title))patch={title:'Restrospectiva do meu an*',prep:'levar material da apresentação'};
  if(a.d===20&&/^Circuito/.test(a.title))patch={prep:'roupas leves e pênis'};
  if(patch&&Object.entries(patch).some(([k,v])=>a[k]!==v))changes.push({d,patch});
 }
 if(!changes.length){console.log('Textos já atualizados.');return;}
 fs.mkdirSync('.private',{recursive:true});fs.writeFileSync('.private/agenda-texts-'+Date.now()+'.json',JSON.stringify(changes.map(({d,patch})=>({id:d.id,before:d.data(),patch})),null,2));
 const batch=c.db.batch();for(const {d,patch} of changes)batch.update(d.ref,patch,{lastUpdateTime:d.updateTime});await batch.commit();
 const after=await c.db.collection('agenda').get();
 for(const {d,patch} of changes){const saved=after.docs.find(a=>a.id===d.id).data();if(Object.entries(patch).some(([k,v])=>saved[k]!==v))throw Error('Texto divergente.');}
 console.log('Atualizadas e verificadas '+changes.length+' atividades, sem alterar dias ou horários.');
 }finally{await c.close()}})().catch(e=>{console.error(e.message);process.exitCode=1});
