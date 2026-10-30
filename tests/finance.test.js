import test from 'node:test';
import assert from 'node:assert/strict';
import {ALL} from '../roster.js';
import {moneyToCents,splitCents,ledgerBalances,simplifiedTransfers,closingSnapshot,closingReport,settlementsOpen} from '../finance.js';
import {normalizePix} from '../pix.js';
import {INITIAL_AGENDA} from '../agenda-data.js';
test('valores monetários sem arredondamento silencioso',()=>{
 for(const [input,result] of [['2640',264000],['0,01',1],['3.29',329],['1000000',100000000]])assert.equal(moneyToCents(input),result);
 for(const value of ['0','-1','1.001','1e3','NaN','1000000.01',''])assert.throws(()=>moneyToCents(value));
});
test('locação entre 14 inclui Pig e fecha todos os centavos',()=>{
 const expense={id:'rental-2026',payer:'pig',amount:2640,amountCents:264000,split:ALL};
 const shares=splitCents(264000,ALL,expense.id);
 assert.equal(Object.values(shares).reduce((a,b)=>a+b,0),264000);
 assert.equal(Object.values(shares).filter(n=>n===18858).length,2);
 assert.equal(Object.values(shares).filter(n=>n===18857).length,12);
 assert.deepEqual(shares,splitCents(264000,[...ALL].reverse(),expense.id));
 const balances=ledgerBalances([expense]);assert.equal(balances.pig,264000-shares.pig);
 assert.equal(simplifiedTransfers(balances).length,13);
});
test('rateio de subconjunto e pagador fora do grupo',()=>{
 const b=ledgerBalances([{id:'subset',payer:'pig',amount:0.01,split:['bruno','ob']}]);
 assert.equal(b.pig,1);assert.equal(b.bruno+b.ob,-1);
 assert.throws(()=>splitCents(100,['bruno','bruno']));assert.throws(()=>splitCents(100,[]));
});
test('mil cenários de múltiplos gastos: saldo zero e sugestões quitam todos',()=>{
 let seed=12345;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n};
 for(let run=0;run<1000;run++){
  const expenses=Array.from({length:1+rand(40)},(_,i)=>({id:String(i),payer:ALL[rand(14)],amountCents:1+rand(100000000),split:ALL.filter(()=>rand(3)===0)}));
  for(const e of expenses)if(!e.split.length)e.split=[ALL[rand(14)]];
  const balances=ledgerBalances(expenses);assert.equal(Object.values(balances).reduce((a,b)=>a+b,0),0);
  for(const t of simplifiedTransfers(balances)){assert(Number.isSafeInteger(t.amountCents)&&t.amountCents>0);balances[t.from]+=t.amountCents;balances[t.to]-=t.amountCents;}
  assert(Object.values(balances).every(n=>n===0));
 }
});
test('chaves Pix normalizadas e formatos inválidos recusados',()=>{
 assert.deepEqual(normalizePix('telefone','(11) 99999-1234'),{type:'telefone',value:'+5511999991234'});
 assert.equal(normalizePix('email',' AMIGO@EXAMPLE.COM ').value,'amigo@example.com');
 assert.equal(normalizePix('cpf','529.982.247-25').value,'52998224725');
 assert.equal(normalizePix('aleatoria','12345678-ABCD-1234-ABCD-123456789012').value,'12345678-abcd-1234-abcd-123456789012');
 for(const [type,key] of [['cpf','11111111111'],['cpf','52998224724'],['telefone','123'],['email','x'],['aleatoria','x'],['outro','x']])assert.throws(()=>normalizePix(type,key));
});
test('chegada quarta à noite e quinta home office na casa',()=>{
 assert(INITIAL_AGENDA.some(a=>a.d===18&&a.t==='20:00'&&a.title.includes('Chegada')));
 assert(INITIAL_AGENDA.filter(a=>a.d===19&&a.title.includes('Home office')).every(a=>a.place==='Casa'));
 for(const d of [18,19,20,21,22])assert.equal(INITIAL_AGENDA.filter(a=>a.d===d&&/^(Café da manhã|Almoço|Janta)/.test(a.title)).length,d===18?1:d===22?2:3);
 assert.equal(INITIAL_AGENDA.find(a=>a.title==='Volta para São Paulo').t,'14:00');
});
test('pagamentos parciais, cancelamentos e fechamento preservam todos os saldos',()=>{
 const expenses=[{id:'house',payer:'pig',amount:140,split:ALL}],payments=[{from:'ob',to:'pig',amountCents:300,status:'active'}];
 assert.equal(ledgerBalances(expenses,payments).ob,-700);assert.equal(ledgerBalances(expenses,payments).pig,12700);
 assert.equal(ledgerBalances(expenses,[{...payments[0],status:'cancelled'}]).ob,-1000);
 assert.equal(ledgerBalances([{...expenses[0],status:'cancelled'}]).pig,0);
 const closing=closingSnapshot(expenses,payments,14000,{pig:{type:'email',value:'pix@example.com'}});
 assert.equal(closing.expenseTotalCents,14000);assert(closingReport(closing).includes('pix@example.com'));
 const final=closing.transfers.map(t=>({...t,kind:'settlement',settlementId:t.id,status:'active'}));
 assert(Object.values(ledgerBalances(expenses,[...payments,...final])).every(n=>n===0));
 assert(closingReport(closing,final).includes('— pago'));
 assert(!settlementsOpen(Date.parse('2026-11-22T02:59:59.999Z')));assert(settlementsOpen(Date.parse('2026-11-22T03:00:00Z')));
});
