import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ALL,PEOPLE,P,EMOJIS} from '../roster.js';
import {dayKey,validatePin,applyBallot,decodeTally,VOTE_DAYS,votingOpen,missedVotePoints} from '../shared.js';

test('PIN aceita exatamente seis algarismos',()=>{
 for(const pin of ['000000','123456','098765'])assert.doesNotThrow(()=>validatePin(pin));
 for(const pin of ['12345','1234567','abcdef','123 45','１２３４５６',''])assert.throws(()=>validatePin(pin));
});
test('dia da votação muda à meia-noite de São Paulo',()=>{
 const before=dayKey(Date.parse('2026-11-20T02:59:59Z')),after=dayKey(Date.parse('2026-11-20T03:00:00Z'));
 assert.equal(Number(after)-Number(before),1);assert.equal(dayKey(Date.parse('2026-11-20T23:59:00-03:00')),after);
});
test('votos somam um por alvo sem registrar autor nem voto próprio',()=>{
 const ballot=Object.fromEntries(ALL.filter(id=>id!=='bruno').map(id=>[id,EMOJIS[0]]));
 const first=applyBallot(undefined,ballot,'bruno');assert.equal(first.voters,1);
 assert.equal(first.counts.bruno,0);
 for(const id of ALL.filter(id=>id!=='bruno'))assert.equal(decodeTally(first.counts[id])[EMOJIS[0]],1);
 assert.deepEqual(Object.keys(first).sort(),['counts','voters']);
 const second=applyBallot(first,Object.fromEntries(ALL.filter(id=>id!=='ob').map(id=>[id,EMOJIS[1]])),'ob');
 assert.equal(second.voters,2);assert.equal(decodeTally(second.counts.luan)[EMOJIS[0]],1);assert.equal(decodeTally(second.counts.luan)[EMOJIS[1]],1);
 assert.deepEqual(second.counts.ob,first.counts.ob);assert.equal(first.voters,1);
 assert.throws(()=>applyBallot(undefined,{},'bruno'));
 assert.throws(()=>applyBallot(undefined,{...ballot,bruno:EMOJIS[0]},'bruno'));
 assert.throws(()=>applyBallot(undefined,{...ballot,ob:'🌱'},'bruno'));
});
test('14 pessoas têm foto e só apelido; os três ADMs oficiais permanecem',()=>{
 assert.equal(ALL.length,14);assert.equal(new Set(ALL).size,14);
 assert.deepEqual(PEOPLE.filter(p=>p.admin).map(p=>p.id),['bruno','igor','pig']);
 for(const p of PEOPLE){assert(p.nick);assert(!('name'in p));assert(fs.existsSync(new URL(`../img/${p.id}.jpg`,import.meta.url)));}
});
function ui(){
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const code=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import .*?;$/gm,'').replace(/backend.start\(data=>\{[\s\S]*$/,'');
 const nodes={};const context={PEOPLE,P,ALL,EMOJIS,dayKey,VOTE_DAYS,votingOpen,missedVotePoints,Date,Intl,console,backend:{},setTimeout(){},setInterval(){},scrollY:0,scrollTo(){},location:{},localStorage:{getItem(){return null},setItem(){}},document:{querySelector(s){return nodes[s]??={innerHTML:'',querySelectorAll(){return []}}},querySelectorAll(){return []},addEventListener(){}}};
 vm.createContext(context);vm.runInContext(code,context);return {context,nodes,html};
}
test('telas renderizam para os 14 e controles ADM usam papel do servidor',()=>{
 const {context,nodes,html}=ui();assert(!html.includes('xvi-congresso'));assert(!html.includes('base64'));
 vm.runInContext('S.ready=true;viewLogin();',context);assert.equal((nodes['#root'].innerHTML.match(/data-id=/g)||[]).length,14);
 for(const id of ALL){vm.runInContext(`S={...S,me:'${id}',admin:false,ready:true};for(const key of Object.keys(LABELS)){tab=key;render();}`,context);assert(!nodes['#root'].innerHTML.includes('id="givePts"'));}
 vm.runInContext("S.me='bruno';S.admin=true;tab='placar';render()",context);assert(nodes['#root'].innerHTML.includes('id="givePts"'));
});
test('rateio entre 14 pessoas e acerto não perdem saldo',()=>{
 const {context}=ui();vm.runInContext("S.me='bruno';S.exps=[{payer:'bruno',amount:140,split:ALL}];",context);
 const result=vm.runInContext('({balance:balances(),transfers:settle()})',context);
 assert.equal(result.balance.bruno,130);assert(ALL.filter(id=>id!=='bruno').every(id=>result.balance[id]===-10));assert.equal(result.transfers.length,13);assert.equal(result.transfers.reduce((s,t)=>s+t.v,0),130);
});
test('14 votações completas não causam transporte entre os oito contadores',()=>{
 for(const emoji of EMOJIS){let state;for(const voter of ALL){state=applyBallot(state,Object.fromEntries(ALL.filter(id=>id!==voter).map(id=>[id,emoji])),voter);}assert.equal(state.voters,14);for(const id of ALL){const decoded=decodeTally(state.counts[id]);assert.equal(decoded[emoji],13);assert.equal(Object.values(decoded).reduce((a,b)=>a+b,0),13);}}
});

test('votação somente nas quatro manhãs e penalidade única após o prazo',()=>{
 assert(!votingOpen(Date.parse('2026-11-18T10:00:00-03:00')));
 for(const day of VOTE_DAYS){
  assert(votingOpen(day.start));assert(votingOpen(day.deadline-1));assert(!votingOpen(day.deadline));
 }
 assert(!votingOpen(Date.parse('2026-11-23T10:00:00-03:00')));
 const d=VOTE_DAYS[0],attendance={[d.key]:{bruno:true}};
 assert.equal(missedVotePoints(attendance,d.deadline-1).length,0);
 const penalties=missedVotePoints(attendance,d.deadline);
 assert.equal(penalties.length,13);assert(!penalties.some(p=>p.who==='bruno'));assert(penalties.every(p=>p.d===-5));
 assert.equal(missedVotePoints({},VOTE_DAYS[3].deadline).length,56);
});
test('home destaca denúncia e mural mesmo com caso já julgado; login sem selo ADM',()=>{
 const {context,nodes}=ui();vm.runInContext('S.ready=true;viewLogin()',context);
 assert(nodes['#root'].innerHTML.includes('Quem é você?'));assert(!nodes['#root'].innerHTML.includes('class="adm"'));
 vm.runInContext("S.me='bruno';S.shame=[{status:'ok'}];tab='inicio';render()",context);
 assert(nodes['#root'].innerHTML.includes('Fazer denúncia'));assert(nodes['#root'].innerHTML.includes('Ver mural da vergonha'));
 assert(!nodes['#root'].innerHTML.includes('Relógio real'));
});
