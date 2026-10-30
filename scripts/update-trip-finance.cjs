// Alterações aprovadas por Bruno: orçamento 14 mil, locação paga por Pig,
// chegada quarta preservada, saída domingo no começo da tarde. Idempotente.
const fs=require('node:fs');
const {FieldValue}=require('firebase-admin/firestore');
const {context}=require('./firebase-context.cjs');
(async()=>{const c=await context();try{
 const {ALL}=await import('../roster.js');
 const settingsRef=c.db.doc('settings/main'),rentalRef=c.db.doc('expenses/rental-2026');
 const [settings,expenses,agenda]=await Promise.all([settingsRef.get(),c.db.collection('expenses').get(),c.db.collection('agenda').get()]);
 const existing=expenses.docs.find(d=>d.id==='rental-2026');
 const possibleDuplicate=expenses.docs.filter(d=>d.id!=='rental-2026'&&(/loca[çc][aã]o|aluguel/i.test(d.data().title||'')));
 if(possibleDuplicate.length)throw Error('Já existe possível locação: '+possibleDuplicate.map(d=>d.id).join(', ')+'. Conferir antes de lançar outra.');
 if(existing&&(existing.data().amount!==2640||existing.data().payer!=='pig'||existing.data().split?.length!==14||!ALL.every(id=>existing.data().split.includes(id))))throw Error('Locação existente diverge do aprovado.');
 const arrival=agenda.docs.find(d=>d.data().d===18&&/Chegada/.test(d.data().title));
 if(!arrival)throw Error('A chegada de quarta precisa estar preservada antes desta atualização.');
 const departure=agenda.docs.find(d=>d.data().title==='Volta para São Paulo');
 const lunch=agenda.docs.find(d=>d.data().d===22&&d.data().title==='Almoço');
 if(!departure||!lunch)throw Error('Sessões de domingo não encontradas.');
 console.log(JSON.stringify({budgetBefore:settings.data()?.budget,budgetAfter:14000,rentalAlreadyExists:!!existing,otherExpenses:expenses.size-(existing?1:0),agendaSessions:agenda.size,arrival:arrival.data().t,departureBefore:departure.data().t,departureAfter:'14:00',apply:process.argv.includes('--apply')},null,2));
 if(!process.argv.includes('--apply'))return;
 fs.mkdirSync('.private',{recursive:true});
 fs.writeFileSync('.private/trip-finance-before-'+Date.now()+'.json',JSON.stringify({settings:settings.data(),expenses:expenses.docs.map(d=>({id:d.id,...d.data()})),agenda:agenda.docs.map(d=>({id:d.id,...d.data()}))},null,2));
 await c.db.runTransaction(async tx=>{
  const saved=await tx.get(rentalRef);
  if(saved.exists&&!existing)throw Error('A locação foi criada durante a revisão. Execute novamente.');
  tx.set(settingsRef,{budget:14000},{merge:true});
  if(!saved.exists)tx.create(rentalRef,{title:'Locação da casa',cat:'casa',amount:2640,amountCents:264000,payer:'pig',split:ALL,by:'bruno',at:new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}),createdAt:FieldValue.serverTimestamp()});
  tx.update(departure.ref,{t:'14:00',start:Date.parse('2026-11-22T14:00:00-03:00'),end:Date.parse('2026-11-22T16:00:00-03:00'),note:'Saída da casa no começo da tarde; horário exato a confirmar.'});
  tx.update(lunch.ref,{place:'Casa',note:'Antes da saída para São Paulo.',end:Date.parse('2026-11-22T14:00:00-03:00')});
 });
 const [after,paid]=await Promise.all([settingsRef.get(),rentalRef.get()]);
 if(after.data().budget!==14000||paid.data().amountCents!==264000)throw Error('Verificação divergente.');
 console.log('Publicado: orçamento R$14.000 e locação única de R$2.640 paga por Pig; chegada quarta preservada.');
}finally{await c.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
