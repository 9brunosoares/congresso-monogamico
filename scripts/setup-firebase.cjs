const fs=require('node:fs'),path=require('node:path');
const {context}=require('./firebase-context.cjs');
(async()=>{
 const c=await context();try{
  const currentRules=await require(path.join(c.root,'lib/mcp/tools/core/get_security_rules.js')).get_security_rules.fn({type:'firestore'},c.mcp);
  fs.mkdirSync('.private',{recursive:true});fs.writeFileSync('.private/rules-before.json',JSON.stringify(currentRules,null,2));
  const checked=await require(path.join(c.root,'lib/mcp/tools/core/validate_security_rules.js')).validate_security_rules.fn({type:'firestore',source:fs.readFileSync('firestore.rules','utf8')},c.mcp);
  console.log(JSON.stringify(checked));
  if(checked.isError||!JSON.stringify(checked).includes('No errors detected'))throw Error('As regras precisam de correção antes da publicação.');
  const {PEOPLE}=await import('../roster.js'),{INITIAL_AGENDA}=await import('../agenda-data.js');
  const existing=await c.db.collection('people').get();
  const accounts=await c.auth.listUsers(100);
  console.log('Perfis existentes:',existing.size,'; contas existentes:',accounts.users.length);
  const batch=c.db.batch();let writes=0;
  for(const p of PEOPLE){
   const ref=c.db.doc('people/'+p.id),old=existing.docs.find(d=>d.id===p.id);
   if(old)continue;
   batch.create(ref,{nick:p.nick,photo:`img/${p.id}.jpg`,uid:null,admin:!!p.admin});writes++;
  }
  const settings=c.db.doc('settings/main');if(!(await settings.get()).exists){batch.create(settings,{budget:12000});writes++;}
  const agenda=await c.db.collection('agenda').get();
  if(agenda.empty){
   const list=INITIAL_AGENDA.map((a,i)=>({...a,id:String(i),start:Date.parse(`2026-11-${a.d}T${a.t}:00-03:00`)}));
   list.forEach((a,i)=>{const {id,...rest}=a;batch.create(c.db.doc('agenda/'+id),{place:'',pts:0,prep:'',note:'',...rest,end:list[i+1]?.d===a.d?list[i+1].start:a.start+120*60000});writes++;});
  }
  if(writes)await batch.commit();console.log('Inicialização concluída:',writes,'documentos. Sem pontos, gastos, mensagens ou votos fictícios.');
  const authApi=require(path.join(c.root,'lib/gcp/auth.js'));
  const domains=await authApi.getAuthDomains('congresso-monogamico');
  console.log('Domínios autorizados:',JSON.stringify(domains));
  if(!domains.includes('9brunosoares.github.io')){await authApi.updateAuthDomains('congresso-monogamico',[...domains,'9brunosoares.github.io']);console.log('Domínio do GitHub Pages autorizado.');}
 }finally{await c.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});