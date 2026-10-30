// Preserva os valores existentes e inicia histórico a partir da migração.
// Sem --apply, somente consulta. Não cria pagamentos, não encerra contas.
const fs=require('node:fs');
const {Timestamp}=require('firebase-admin/firestore');
const {context}=require('./firebase-context.cjs');
(async()=>{const c=await context();try{
 const {expenseCents}=await import('../finance.js');
 const settings=c.db.doc('settings/main'),control=c.db.doc('financeControl/main');
 const [expenses,previousSettings,previousControl]=await Promise.all([c.db.collection('expenses').get(),settings.get(),control.get()]);
 console.log(JSON.stringify({expenses:expenses.size,unversioned:expenses.docs.filter(d=>!d.data().version).length,controlExists:previousControl.exists,apply:process.argv.includes('--apply')}));
 if(!process.argv.includes('--apply'))return;
 fs.mkdirSync('.private',{recursive:true});
 fs.writeFileSync('.private/finance-migration-before-'+Date.now()+'.json',JSON.stringify({settings:previousSettings.data(),control:previousControl.data(),expenses:expenses.docs.map(d=>({id:d.id,...d.data()}))},null,2));
 await c.db.runTransaction(async tx=>{
  const [ledger,budget,config]=await Promise.all([tx.get(c.db.collection('expenses')),tx.get(settings),tx.get(control)]);
  if(config.exists){if(ledger.docs.some(d=>!d.data().version)||!budget.data().version)throw Error('Migração parcial; revisar antes de continuar.');return;}
  const time=Timestamp.now();
  for(const doc of ledger.docs){
   const before=doc.data();if(before.version)throw Error('Versão inesperada antes da migração.');
   const after={...before,amountCents:expenseCents(before),by:before.by||'',status:'active',version:1,updatedAt:time,updatedBy:'bruno'};
   tx.set(doc.ref,after);tx.create(c.db.doc(`financeHistory/expense_${doc.id}_1`),{type:'expense',recordId:doc.id,version:1,action:'baseline',by:'bruno',before,after,createdAt:time});
  }
  const before=budget.data(),after={budget:before.budget,version:1,updatedAt:time,updatedBy:'bruno'};
  tx.set(settings,after);tx.create(c.db.doc('financeHistory/budget_main_1'),{type:'budget',recordId:'main',version:1,action:'baseline',by:'bruno',before,after,createdAt:time});
  tx.create(control,{revision:0,closed:false,lastEvent:''});
 });
 const [after,config]=await Promise.all([c.db.collection('expenses').get(),control.get()]);
 if(after.size!==expenses.size||after.docs.some(d=>!d.data().version)||config.data().closed)throw Error('Verificação da migração divergente.');
 for(const doc of expenses.docs){const saved=after.docs.find(d=>d.id===doc.id).data();for(const key of ['title','cat','amount','payer','split'])if(JSON.stringify(saved[key])!==JSON.stringify(doc.data()[key]))throw Error('Valor alterado inesperadamente: '+key);}
 console.log('Histórico iniciado; gastos, rateios e orçamento preservados; contas abertas.');
}finally{await c.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
