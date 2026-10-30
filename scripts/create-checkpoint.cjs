// SOMENTE LEITURA no Firebase. Snapshot consistente e relatório privados locais.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {context}=require('./firebase-context.cjs'),{encode,decode}=require('./checkpoint-codec.cjs');
const ROOTS=['people','admins','settings','agenda','points','expenses','tasks','cases','casePhotos','chat','querido','participation','payments','pixKeys','financeHistory','financeControl','financeClosings','scoreClosures'];
async function discover(db){
 const paths=new Set(ROOTS),visited=new Set();
 async function visit(ref){
  if(visited.has(ref.path))return;visited.add(ref.path);paths.add(ref.path);
  // listDocuments inclui pais ausentes com subcoleções existentes.
  for(const doc of await ref.listDocuments())for(const child of await doc.listCollections())await visit(child);
 }
 for(const ref of await db.listCollections())await visit(ref);
 const {VOTE_DAYS}=await import('../shared.js');
 for(const d of VOTE_DAYS){paths.add('querido/'+d.key+'/voters');paths.add('participation/'+d.key+'/people');}
 return [...paths].sort();
}
(async()=>{const c=await context();try{
 const collections=await discover(c.db);
 const snapshot=await c.db.runTransaction(async tx=>{
  const documents=[],counts={},readTimes=new Set();
  for(const name of collections){const query=await tx.get(c.db.collection(name));counts[name]=query.size;if(query.readTime)readTimes.add(query.readTime.toDate().toISOString());
   for(const doc of query.docs)documents.push({path:doc.ref.path,data:encode(doc.data())});
  }
  if(readTimes.size!==1)throw Error('Não foi possível confirmar uma única data de leitura.');
  return {format:'congresso-firestore-checkpoint',version:1,project:'congresso-monogamico',database:'(default)',readTime:[...readTimes][0],capturedAt:new Date().toISOString(),collections:counts,documents};
 },{readOnly:true});
 const metadata=[];let nextPage;
 do{const page=await c.auth.listUsers(1000,nextPage);for(const user of page.users){metadata.push({id:user.email?.endsWith('@congresso.app')?user.email.split('@')[0]:null,uid:user.uid,disabled:user.disabled,createdAt:user.metadata.creationTime,lastSignInAt:user.metadata.lastSignInTime})}nextPage=page.pageToken}while(nextPage);
 snapshot.authMetadata=metadata;snapshot.authNotice='Metadados para conferência; senhas/PINs/hashes/tokens não são exportados. Restauração pressupõe contas Auth preservadas.';
 const dir=path.resolve('.private/checkpoints/'+snapshot.capturedAt.replace(/[:.]/g,'-'));fs.mkdirSync(dir,{recursive:true});
 const payload=JSON.stringify(snapshot,null,2),digest=crypto.createHash('sha256').update(payload).digest('hex');
 fs.writeFileSync(path.join(dir,'firestore.json'),payload,{flag:'wx'});fs.writeFileSync(path.join(dir,'sha256.txt'),digest+'  firestore.json\n',{flag:'wx'});
 const reloaded=JSON.parse(fs.readFileSync(path.join(dir,'firestore.json'),'utf8'));
 if(crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,'firestore.json'))).digest('hex')!==digest)throw Error('Checksum divergente.');
 const seen=new Set();for(const record of reloaded.documents){if(seen.has(record.path))throw Error('Documento duplicado.');seen.add(record.path);if(JSON.stringify(encode(decode(record.data,c.db)))!==JSON.stringify(record.data))throw Error('Falha no round-trip de tipos.');}
 const docs=snapshot.documents.map(d=>({path:d.path,...decode(d.data,c.db)}));
 const list=name=>docs.filter(d=>d.path.split('/').length===2&&d.path.startsWith(name+'/'));
 const author=id=>id||null;
 const report={checkpoint:dir,readTime:snapshot.readTime,verified:true,documents:docs.length,counts:snapshot.collections,
  accounts:metadata.map(({id,disabled,createdAt,lastSignInAt})=>({id,disabled,createdAt,lastSignInAt})),
  expenses:list('expenses').map(d=>({id:d.path.split('/')[1],title:d.title,amount:d.amount,payer:d.payer,split:d.split,by:author(d.by),updatedBy:author(d.updatedBy),status:d.status,version:d.version,createdAt:d.createdAt?.toDate?.().toISOString()})),
  payments:list('payments').map(d=>({id:d.path.split('/')[1],from:d.from,to:d.to,amountCents:d.amountCents,by:author(d.by),updatedBy:author(d.updatedBy),status:d.status,kind:d.kind})),
  points:list('points').map(d=>({id:d.path.split('/')[1],who:d.who,d:d.d,why:d.why,kind:d.kind,creator:author(d.by)})),
  tasks:list('tasks').map(d=>({id:d.path.split('/')[1],who:d.who,d:d.d,why:d.why,status:d.status})),
  cases:list('cases').map(d=>({id:d.path.split('/')[1],who:d.who,by:author(d.by),what:d.what,status:d.status,hasPhoto:d.hasPhoto})),
  pixOwners:list('pixKeys').map(d=>({id:d.path.split('/')[1],type:d.type})),
  agenda:list('agenda').map(d=>({id:d.path.split('/')[1],day:d.d,time:d.t,title:d.title,place:d.place})),
  settings:list('settings').map(d=>({id:d.path.split('/')[1],budget:d.budget,updatedBy:d.updatedBy})),
  scoreClosed:list('scoreClosures').length>0,financeClosed:list('financeControl').some(d=>d.closed),
  financialHistory:list('financeHistory').map(d=>({id:d.path.split('/')[1],type:d.type,action:d.action,by:d.by,recordId:d.recordId,version:d.version})),
  notice:'Autoria representa o perfil utilizado. Pagador, alvo da denúncia e recebedor de pontos não são necessariamente quem lançou. updatedBy de baseline é quem fez a migração, não o autor original. Chat só é contado neste relatório.'};
 fs.writeFileSync(path.join(dir,'analise.json'),JSON.stringify(report,null,2),{flag:'wx'});
 console.log(JSON.stringify(report,null,2));
}finally{await c.close();}})().catch(e=>{console.error(e.message);process.exitCode=1});
