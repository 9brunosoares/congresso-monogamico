// Leitura administrativa, somente a pedido. Nunca escreve no Firebase.
const fs=require('node:fs'),path=require('node:path');
const {context}=require('./firebase-context.cjs');
(async()=>{
 const index=process.argv.indexOf('--out');
 const out=path.resolve(index<0?'.private/exports/igor-'+Date.now():process.argv[index+1]||'');
 const project=path.resolve(__dirname,'..'),relative=path.relative(project,out);
 if(!relative.startsWith('..')&&!path.isAbsolute(relative)&&!relative.startsWith('.private'+path.sep))throw Error('Escolha uma pasta privada, fora da raiz pública do app.');
 const {buildIgorExport}=await import('../igor-poll-export.js');
 const c=await context();try{
  const session=await c.db.doc('igorLive/main').get();if(!session.exists)throw Error('Igor ainda não iniciou a enquete.');
  const rounds=[];
  for(let q=1;q<=session.data().question;q++){
   const result=await c.db.collection('igorLive/main/rounds/'+q+'/answers').get();
   const answers=Object.fromEntries(result.docs.map(d=>{const value=d.data();return [d.id,{...value,createdAt:value.createdAt?.toDate().toISOString()||null}];}));
   rounds.push({question:q,answers});
  }
  const saved=session.data(),exported=buildIgorExport({...saved,startedAt:saved.startedAt?.toDate().toISOString(),updatedAt:saved.updatedAt?.toDate().toISOString()},rounds);
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'resultados-igor.json'),JSON.stringify(exported.snapshot,null,2));
  fs.writeFileSync(path.join(out,'resultados-igor.txt'),exported.text,'utf8');
  fs.writeFileSync(path.join(out,'votos-igor.csv'),'\uFEFF'+exported.csv,'utf8');
  console.log(JSON.stringify({out,questions:rounds.length,votes:exported.snapshot.questions.reduce((n,q)=>n+q.total,0)}));
 }finally{await c.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
