const fs=require('node:fs');
const {FieldValue}=require('firebase-admin/firestore');
const {context}=require('./firebase-context.cjs');
(async()=>{const c=await context();try{
 const stamp=FieldValue.serverTimestamp();
 await c.db.runTransaction(async tx=>{
  const [expenses,payments,settings,control,person]=await Promise.all([tx.get(c.db.collection('expenses')),tx.get(c.db.collection('payments')),tx.get(c.db.doc('settings/main')),tx.get(c.db.doc('financeControl/main')),tx.get(c.db.doc('people/kirk'))]);
  if(control.data().closed)throw Error('Contas encerradas.');
  if(person.exists&&person.data().uid)throw Error('Kirk possui conta: revisar vínculo antes de remover.');
  if(payments.docs.some(d=>d.data().from==='kirk'||d.data().to==='kirk'))throw Error('Há pagamento envolvendo Kirk.');
  fs.mkdirSync('.private',{recursive:true});fs.writeFileSync('.private/remove-kirk-'+Date.now()+'.json',JSON.stringify({expenses:expenses.docs.map(d=>({id:d.id,...d.data()})),settings:settings.data(),control:control.data(),person:person.data()||null},null,2));
  const events=[];
  for(const d of expenses.docs){const before=d.data();if(!before.split.includes('kirk'))continue;
   if(before.payer==='kirk')throw Error('Kirk é pagador.');
   const after={...before,split:before.split.filter(id=>id!=='kirk'),version:before.version+1,updatedAt:stamp,updatedBy:'bruno'};
   const event='expense_'+d.id+'_'+after.version;tx.set(d.ref,after);tx.create(c.db.doc('financeHistory/'+event),{type:'expense',recordId:d.id,version:after.version,action:'update',by:'bruno',before,after,createdAt:stamp});events.push(event);
  }
  if(settings.data().budget!==13000){const before=settings.data(),after={...before,budget:13000,version:before.version+1,updatedAt:stamp,updatedBy:'bruno'},event='budget_main_'+after.version;tx.set(settings.ref,after);tx.create(c.db.doc('financeHistory/'+event),{type:'budget',recordId:'main',version:after.version,action:'update',by:'bruno',before,after,createdAt:stamp});events.push(event);}
  if(events.length)tx.update(control.ref,{revision:control.data().revision+events.length,lastEvent:events.at(-1)});
  if(person.exists)tx.delete(person.ref);
  console.log('Rateios atualizados:',events.length,'eventos; orçamento 13000; cadastro não utilizado do Kirk removido.');
 });
 }finally{await c.close()}})().catch(e=>{console.error(e.message);process.exitCode=1});
