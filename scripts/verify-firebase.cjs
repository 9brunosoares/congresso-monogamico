// Testa o backend real contra Firebase com contas temporárias e limpa só seus próprios registros.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {context}=require('./firebase-context.cjs');
const run=crypto.randomUUID().slice(0,8),tag='QA '+run;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(predicate,label){const end=Date.now()+45000;while(Date.now()<end){if(predicate())return;await sleep(150);}throw Error('Tempo esgotado: '+label);}
(async()=>{
 console.log('Preparando teste integrado');
 const c=await context(),clients=[],owned=[],createdUsers=[];let voteKey,voteStarted=false;
 console.log('Sessão administrativa pronta');
 global.sessionStorage={getItem(){return null},setItem(){}};
 Object.defineProperty(global.navigator,'onLine',{value:true,configurable:true});
 const sdk=await import('firebase/firestore'),authSdk=await import('firebase/auth'),apps=await import('firebase/app');
 const {ALL,EMOJIS}=await import('../roster.js'),{dayKey,decodeTally}=await import('../shared.js');
 console.log('SDKs carregados');
 const pin=String(crypto.randomInt(0,1000000)).padStart(6,'0');
 function track(ref){owned.push(ref.path);return ref;}
 try{
  const existingPeople=await c.db.collection('people').get(), existingAccounts=await c.auth.listUsers(100);
  console.log('Verificando contas e perfis');
  for(const id of ['bruno','ob','luan']){
   const p=existingPeople.docs.find(p=>p.id===id);assert.equal(p.data().uid,null,'Perfil já está em uso: '+id);
   const found=existingAccounts.users.find(u=>u.email===id+'@congresso.app')||null;
   assert.equal(found,null,'Conta já existe: '+id);
  }
  let code=fs.readFileSync('backend.js','utf8').replaceAll('window.addEventListener','({addEventListener(){}}).addEventListener').replace(/"https:\/\/www.gstatic.com\/firebasejs\/13.1.0\/firebase-(app|auth|firestore).js"/g,'"firebase/$1"').replace(/from '\.\//g,"from '../").replace('browserLocalPersistence, setPersistence','inMemoryPersistence, setPersistence').replace('setPersistence(auth,browserLocalPersistence)','setPersistence(auth,inMemoryPersistence)').replace('initializeApp(firebaseConfig)','initializeApp(firebaseConfig,"qa-"+crypto.randomUUID())');
  code+='\nexport {db as testDb,auth as testAuth};\n';fs.mkdirSync('.private',{recursive:true});fs.writeFileSync('.private/backend-live.mjs',code);
  async function client(id,create){console.log('Abrindo sessão:',id);
   const api=await import(pathToFileURL(path.resolve('.private/backend-live.mjs')).href+'?client='+crypto.randomUUID());
   const holder={id,api,state:null};clients.push(holder);await api.start(s=>holder.state=s);
   await until(()=>holder.state?.ready,'inicialização de '+id);
   await api.login(id,pin,create);if(create)createdUsers.push({id,uid:api.testAuth.currentUser.uid});
   await until(()=>holder.state?.me===id&&holder.state.ready,'login de '+id);
   assert.equal(holder.state.error,'');return holder;
  }
  const adm=await client('bruno',true),member=await client('ob',true),third=await client('luan',true);
  assert(adm.state.admin);assert(!member.state.admin);assert(!third.state.admin);console.log('OK: primeiro acesso com PIN e ADMs registrados no servidor.');
  await assert.rejects(()=>authSdk.signInWithEmailAndPassword(member.api.testAuth,'ob@congresso.app',pin==='000000'?'000001':'000000'));
  assert.equal(member.api.testAuth.currentUser.uid,createdUsers.find(u=>u.id==='ob').uid);
  console.log('OK: PIN errado recusado.');
  const expense=track(await member.api.addExpense({title:tag+' gasto',cat:'mercado',amount:140,payer:'ob',split:ALL}));
  await until(()=>adm.state.exps.some(e=>e.id===expense.id),'gasto aparecer em outro aparelho');
  assert.equal(adm.state.exps.find(e=>e.id===expense.id).split.length,14);
  console.log('OK: gasto compartilhado em tempo real e rateio com 14 pessoas.');
  const point={who:'ob',d:5,why:tag,kind:'aux',at:tag,createdAt:sdk.serverTimestamp()};
  await assert.rejects(()=>sdk.setDoc(sdk.doc(member.api.testDb,'points','qa-'+run),point));
  await assert.rejects(()=>sdk.updateDoc(sdk.doc(member.api.testDb,'people','ob'),{admin:true}));
  await assert.rejects(()=>sdk.updateDoc(sdk.doc(member.api.testDb,'people','bruno'),{uid:member.api.testAuth.currentUser.uid}));
  await assert.rejects(()=>sdk.addDoc(sdk.collection(member.api.testDb,'chat'),{text:tag,createdAt:sdk.serverTimestamp(),uid:'injetado'}));
  await assert.rejects(()=>sdk.addDoc(sdk.collection(member.api.testDb,'expenses'),{title:tag,cat:'mercado',amount:1,payer:'ob',split:['intruso'],at:tag,createdAt:sdk.serverTimestamp()}));
  console.log('OK: bloqueados pontos por não ADM, autopromoção, troca de identidade, autor no chat e rateio inválido.');
  const task=track(await member.api.submitTask({d:5,why:tag+' tarefa'}));await adm.api.reviewTask(task.id,true);owned.push('points/task_'+task.id);
  await until(()=>third.state.points.some(p=>p.id==='task_'+task.id),'aprovação na outra sessão');
  await assert.rejects(()=>adm.api.reviewTask(task.id,true));
  const allegation=track(await member.api.addCase({who:'luan',what:tag+' denúncia'}));await adm.api.judgeCase(allegation.id,true);owned.push('points/case_'+allegation.id);
  await assert.rejects(()=>adm.api.judgeCase(allegation.id,true));
  console.log('OK: aprovação e condenação atômicas, sem pontos duplicados.');
  await member.api.sendChat(tag+' mensagem');await until(()=>third.state.chat.some(m=>m.text===tag+' mensagem'),'chat na outra sessão');
  const message=third.state.chat.find(m=>m.text===tag+' mensagem');owned.push('chat/'+message.id);
  const rawMessage=(await c.db.doc('chat/'+message.id).get()).data();assert.deepEqual(Object.keys(rawMessage).sort(),['createdAt','text']);
  console.log('OK: chat anônimo sincronizado, com apenas texto e data no banco.');
  voteKey=dayKey();assert.equal(dayKey(rawMessage.createdAt.toMillis()),voteKey,'Data do cliente diferente do servidor');assert(!(await c.db.doc('querido/'+voteKey).get()).exists,'Já há votos reais hoje; não executar este teste sobre eles.');voteStarted=true;
  const ballot=id=>Object.fromEntries(ALL.filter(x=>x!==id).map(x=>[x,EMOJIS[0]]));
  await Promise.all([adm.api.vote(ballot('bruno')),member.api.vote(ballot('ob'))]);
  await until(()=>third.state.voterCount===2,'duas votações simultâneas');
  const day=(await c.db.doc('querido/'+voteKey).get()).data();assert.equal(day.voters,2);assert.equal(decodeTally(day.counts.luan)[EMOJIS[0]],2);assert.equal(decodeTally(day.counts.bruno)[EMOJIS[0]],1);
  await assert.rejects(()=>member.api.vote(ballot('ob')));
  await assert.rejects(()=>sdk.getDoc(sdk.doc(third.api.testDb,'querido',voteKey,'voters',member.api.testAuth.currentUser.uid)));
  await assert.rejects(()=>sdk.updateDoc(sdk.doc(third.api.testDb,'querido',voteKey),{voters:14}));
  await assert.rejects(()=>sdk.setDoc(sdk.doc(third.api.testDb,'querido',voteKey,'voters',third.api.testAuth.currentUser.uid),{voted:true}));
  console.log('OK: votos concorrentes preservados, repetição e marcador isolado recusados, voto alheio privado.');
  const guestApp=apps.initializeApp((await import('../firebase-config.js')).firebaseConfig,'qa-guest-'+run),guestDb=sdk.getFirestore(guestApp);
  await assert.rejects(()=>sdk.getDoc(sdk.doc(guestDb,'settings','main')));await assert.rejects(()=>sdk.getDocs(sdk.collection(guestDb,'chat')));await sdk.terminate(guestDb);await apps.deleteApp(guestApp);
  console.log('OK: leituras sem login recusadas.');
  const savedBudget=adm.state.budget;await adm.api.setBudget(savedBudget+1);await until(()=>third.state.budget===savedBudget+1,'orçamento na outra sessão');await adm.api.setBudget(savedBudget);
  const session=track(await adm.api.addSession({d:20,t:'18:00',title:tag+' sessão',place:'',pts:0,prep:'',note:'',start:Date.parse('2026-11-20T18:00:00-03:00'),end:Date.parse('2026-11-20T19:00:00-03:00')}));
  await until(()=>member.state.agenda.some(a=>a.id===session.id),'programação na outra sessão');
  console.log('OK: orçamento e programação compartilhados.');
  await member.api.logout();await until(()=>!member.state.me&&member.state.ready,'saída');await member.api.login('ob',pin,false);await until(()=>member.state.me==='ob'&&member.state.ready,'novo login com PIN');
  console.log('OK: sair e voltar com o mesmo PIN.');
 }finally{
  for(const client of clients){await client.api.logout().catch(()=>{});await sdk.terminate(client.api.testDb).catch(()=>{});await apps.deleteApp(client.api.testAuth.app).catch(()=>{});}
  const batch=c.db.batch();for(const p of [...new Set(owned)])batch.delete(c.db.doc(p));
  if(voteStarted){batch.delete(c.db.doc('querido/'+voteKey));for(const user of createdUsers)batch.delete(c.db.doc('querido/'+voteKey+'/voters/'+user.uid));}
  for(const user of createdUsers){const profile=c.db.doc('people/'+user.id);const snap=await profile.get();if(snap.data()?.uid===user.uid)batch.update(profile,{uid:null});batch.delete(c.db.doc('admins/'+user.uid));}
  await batch.commit();for(const user of createdUsers)await c.auth.deleteUser(user.uid);
  await c.close();console.log('Limpeza concluída: somente contas e registros temporários deste teste foram removidos.');
 }
 console.log('VERIFICAÇÃO FIREBASE CONCLUÍDA.');
})().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1);});