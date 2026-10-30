import {ALL} from './roster.js';
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
export function ledgerBalances(expenses){
 const balances=Object.fromEntries(ALL.map(id=>[id,0]));
 for(const expense of expenses){
  if(!ALL.includes(expense.payer))throw Error('Pagador inválido.');
  const cents=expenseCents(expense),shares=splitCents(cents,expense.split,expense.id||'');
  balances[expense.payer]+=cents;for(const [id,share] of Object.entries(shares))balances[id]-=share;
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
