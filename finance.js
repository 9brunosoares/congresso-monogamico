import {ALL} from './roster.js';
import {P} from './roster.js';
export const SETTLEMENT_START=Date.parse('2026-11-22T00:00:00-03:00');
export const settlementsOpen=(time=Date.now())=>time>=SETTLEMENT_START;
export const activeExpenses=expenses=>expenses.filter(e=>e.status!=='cancelled');
export const canManagePayment=(payment,me,admin)=>!!admin||payment.from===me||payment.to===me;
export function transferRows(closing,pixKeys={}){
 const t=closing.transfers;
 const rows=Array.isArray(t)?t:t.from.map((from,i)=>({id:'t'+i,from,to:t.to[i],amountCents:t.amountCents[i]}));
 return rows.map(row=>({...row,pixType:pixKeys[row.to]?.type||row.pixType||'',pixValue:pixKeys[row.to]?.value||row.pixValue||''}));
}
export function storedClosing(snapshot){
 const rows=transferRows(snapshot);return {...snapshot,transfers:{from:rows.map(t=>t.from),to:rows.map(t=>t.to),amountCents:rows.map(t=>t.amountCents)}};
}
export function closingSnapshot(expenses,payments,budget,pixKeys={}){
 const balances=ledgerBalances(expenses,payments);
 return {budget,expenseTotalCents:activeExpenses(expenses).reduce((sum,e)=>sum+expenseCents(e),0),
  transfers:simplifiedTransfers(balances).map((t,i)=>({id:'t'+i,...t,pixType:pixKeys[t.to]?.type||'',pixValue:pixKeys[t.to]?.value||''}))};
}
export function closingReport(closing,payments=[],pixKeys={}){
 const money=cents=>'R$ '+(cents/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
 const lines=['XVI Congresso — acerto final',`Gastos: ${money(closing.expenseTotalCents)}`,''];
 const rows=transferRows(closing,pixKeys);
 for(const t of rows){
  const paid=payments.some(p=>p.kind==='settlement'&&p.settlementId===t.id&&p.status!=='cancelled');
  lines.push(`${paid?'✓ ':''}${P[t.from].nick} → ${P[t.to].nick}: ${money(t.amountCents)}${paid?' — pago':''}`);
  if(t.pixValue)lines.push('Pix: '+t.pixValue);
 }
 if(!rows.length)lines.push('Todos os saldos estão zerados.');
 return lines.join('\n');
}
export function moneyToCents(value){
 const text=String(value).trim().replace(',','.');
 if(!/^\d{1,7}(\.\d{1,2})?$/.test(text))throw Error('Use um valor com no máximo duas casas decimais.');
 const [whole,decimal='']=text.split('.'),cents=Number(whole)*100+Number(decimal.padEnd(2,'0'));
 if(!Number.isSafeInteger(cents)||cents<=0||cents>100000000)throw Error('Use um valor maior que zero e até R$ 1.000.000.');
 return cents;
}
export function expenseCents(expense){return Number.isSafeInteger(expense.amountCents)?expense.amountCents:moneyToCents(expense.amount);}
export function splitCents(cents,split,seed=''){
 if(!Number.isSafeInteger(cents)||cents<=0||!Array.isArray(split)||!split.length||new Set(split).size!==split.length||split.some(id=>!ALL.includes(id)))throw Error('Rateio inválido.');
 const people=ALL.filter(id=>split.includes(id)),base=Math.floor(cents/people.length),remainder=cents%people.length;
 let hash=0;for(const char of String(seed))hash=(Math.imul(hash,31)+char.charCodeAt(0))>>>0;
 const offset=hash%people.length,shares=Object.fromEntries(people.map(id=>[id,base]));
 // Distribuição determinística do restante de 1 centavo, sem perder dinheiro.
 for(let i=0;i<remainder;i++)shares[people[(offset+i)%people.length]]++;
 return shares;
}
export function ledgerBalances(expenses,payments=[]){
 const balances=Object.fromEntries(ALL.map(id=>[id,0]));
 for(const expense of activeExpenses(expenses)){
  if(!ALL.includes(expense.payer))throw Error('Pagador inválido.');
  const cents=expenseCents(expense),shares=splitCents(cents,expense.split,expense.id||'');
  balances[expense.payer]+=cents;for(const [id,share] of Object.entries(shares))balances[id]-=share;
 }
 for(const payment of payments.filter(p=>p.status!=='cancelled')){
  if(!ALL.includes(payment.from)||!ALL.includes(payment.to)||payment.from===payment.to||!Number.isSafeInteger(payment.amountCents)||payment.amountCents<=0)throw Error('Pagamento inválido.');
  // Quem enviou dinheiro reduz sua dívida; quem recebeu reduz seu crédito.
  balances[payment.from]+=payment.amountCents;balances[payment.to]-=payment.amountCents;
 }
 return balances;
}
export function simplifiedTransfers(balances){
 if(ALL.some(id=>!Number.isSafeInteger(balances[id]))||ALL.reduce((sum,id)=>sum+balances[id],0)!==0)throw Error('Os saldos precisam fechar em zero centavos.');
 const creditors=ALL.filter(id=>balances[id]>0).map(id=>({id,cents:balances[id]})).sort((a,b)=>b.cents-a.cents);
 const debtors=ALL.filter(id=>balances[id]<0).map(id=>({id,cents:-balances[id]})).sort((a,b)=>b.cents-a.cents);
 const transfers=[];let i=0,j=0;
 while(i<debtors.length&&j<creditors.length){
  const cents=Math.min(debtors[i].cents,creditors[j].cents);
  transfers.push({from:debtors[i].id,to:creditors[j].id,amountCents:cents});debtors[i].cents-=cents;creditors[j].cents-=cents;
  if(debtors[i].cents===0)i++;if(creditors[j].cents===0)j++;
 }
 return transfers;
}
