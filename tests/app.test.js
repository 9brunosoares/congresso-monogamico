import test from 'node:test';
import {moneyToCents,expenseCents,ledgerBalances,simplifiedTransfers,settlementsOpen,activeExpenses,canManagePayment,splitCents,closingReport,closingSnapshot,transferRows} from '../finance.js';
import {PIX_TYPES} from '../pix.js';
import {EMPTY_OFFICIAL_LINKS} from '../official-links.js';
import {REACTIONS} from '../mural-reactions.js';
import {prepareReportPhoto} from '../report-photo.js';
import {bindAgendaSwipe,adjacentDay} from '../agenda-gesture.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ALL,PEOPLE,P,EMOJIS} from '../roster.js';
import {dayKey,validatePin,applyBallot,decodeTally,VOTE_DAYS,votingOpen,missedVotePoints,resultDay,alreadyVotedMessage,scoringPoints,notice} from '../shared.js';

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
 const code=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*?;$/gm,'').replace(/backend.start\(data=>\{[\s\S]*$/,'');
 const nodes={};const context={moneyToCents,expenseCents,ledgerBalances,simplifiedTransfers,settlementsOpen,activeExpenses,canManagePayment,splitCents,closingReport,closingSnapshot,transferRows,PIX_TYPES,EMPTY_OFFICIAL_LINKS,REACTIONS,prepareReportPhoto,bindAgendaSwipe,adjacentDay,PEOPLE,P,ALL,EMOJIS,dayKey,VOTE_DAYS,votingOpen,missedVotePoints,resultDay,alreadyVotedMessage,scoringPoints,notice,Date,Intl,console,backend:{formatStamp:()=>''},setTimeout(){},setInterval(){},scrollY:0,scrollTo(){},location:{},localStorage:{getItem(){return null},setItem(){}},document:{querySelector(s){return nodes[s]??={innerHTML:'',querySelectorAll(){return []}}},querySelectorAll(){return []},addEventListener(){}}};
 vm.createContext(context);vm.runInContext(code,context);return {context,nodes,html};
}

test('mural mostra cinco reações, contagens e seleção; tribunal não permite reagir',()=>{
 const {context}=ui();
 vm.runInContext("S={...S,me:'bruno',caseReactions:{example:{bruno:'😂',ob:'😂',pig:'❤️'}},loaded:{'reactions-example':true}}",context);
 const html=vm.runInContext("caseCard({id:'example',who:'ob',what:'Teste',status:'ok'})",context);
 assert.equal((html.match(/data-react=/g)||[]).length,5);
 assert(html.includes('class="reaction-count" aria-hidden="true">2</span>'));
 assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);
 assert(!vm.runInContext("caseCard({id:'example',who:'ob',what:'Teste',status:'pend'},true)",context).includes('data-react='));
 vm.runInContext("S.reactionPending={example:true}",context);
 assert.equal((vm.runInContext("caseReactions('example')",context).match(/ disabled/g)||[]).length,5);
});
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
test('home mostra mural apenas após condenação; login sem selo ADM',()=>{
 const {context,nodes}=ui();vm.runInContext('S.ready=true;viewLogin()',context);
 assert(nodes['#root'].innerHTML.includes('Quem é você?'));assert(!nodes['#root'].innerHTML.includes('class="adm"'));
 vm.runInContext("S.me='bruno';S.shame=[{status:'ok'}];tab='inicio';render()",context);
 assert(nodes['#root'].innerHTML.includes('Fazer denúncia'));assert(nodes['#root'].innerHTML.includes('Ver mural da vergonha'));
 assert(!nodes['#root'].innerHTML.includes('Relógio real'));
});

test('Fofoca só tem chat; mural não expõe pendentes e usa foto ou avatar',()=>{
 const {context,nodes}=ui();
 vm.runInContext("S={...S,me:'bruno',admin:false,ready:true,shame:[{id:'pending',who:'ob',by:'bruno',what:'Pendente',status:'pend'}]};tab='inicio';render()",context);
 assert(!nodes['#root'].innerHTML.includes('Ver mural da vergonha'));
 vm.runInContext("tab='fofoca';render()",context);assert(nodes['#root'].innerHTML.includes('Chat anônimo'));assert(!nodes['#root'].innerHTML.includes('Mural da Vergonha'));assert(!nodes['#root'].innerHTML.includes('data-fseg'));
 vm.runInContext("S.shame.push({id:'approved',who:'ob',what:'Título condenado',status:'ok'});tab='mural';render()",context);
 assert(nodes['#root'].innerHTML.includes('Título condenado'));assert(!nodes['#root'].innerHTML.includes('Pendente'));assert(nodes['#root'].innerHTML.includes('img/ob.jpg'));
 vm.runInContext("S.casePhotos={approved:'data:image/jpeg;base64,AAAA'};render()",context);assert(nodes['#root'].innerHTML.includes('class="case-photo"'));
 assert(!nodes['#root'].innerHTML.includes('Programação e orçamento provisórios'));
 vm.runInContext("tab='programa';render()",context);assert(!nodes['#root'].innerHTML.includes('Programação provisória'));
});

test('orçamento zero não mostra NaN ou Infinity',()=>{
 const {context,nodes}=ui();vm.runInContext("S={...S,me:'bruno',ready:true,budget:0};tab='contas';contasSeg='orcamento';render()",context);
 assert(!nodes['#root'].innerHTML.includes('NaN'));assert(!nodes['#root'].innerHTML.includes('Infinity'));assert(nodes['#root'].innerHTML.includes('Orçamento não definido'));
});

test('orçamento é visível a membros e acerto mostra acesso à chave Pix',()=>{
 const {context,nodes}=ui();vm.runInContext("S={...S,me:'ob',admin:false,ready:true,budget:14000,loaded:{pix:true},pixKeys:{pig:{type:'email',value:'teste@example.com'}},exps:[{id:'rental-2026',title:'Locação da casa',cat:'casa',payer:'pig',amount:2640,amountCents:264000,split:ALL}]};tab='contas';contasSeg='orcamento';render()",context);
 assert(nodes['#root'].innerHTML.includes('14.000'));assert(nodes['#root'].innerHTML.includes('1.000 previstos'));assert(!nodes['#root'].innerHTML.includes('Ajustar orçamento (ADM)'));
 vm.runInContext("contasSeg='pagamentos';render()",context);assert(nodes['#root'].innerHTML.includes('Registrar pagamento'));assert(!nodes['#root'].innerHTML.includes('ainda não são registrados'));
});
test('fechamento oculta lançamentos e exibe relatório e confirmações',()=>{
 const {context,nodes}=ui();vm.runInContext("S={...S,me:'ob',ready:true,payments:[],closing:closingSnapshot([{id:'test',title:'Casa',amount:140,payer:'pig',split:ALL}],[],14000,{pig:{type:'email',value:'pix@example.com'}})};tab='contas';render()",context);
 assert(!nodes['#root'].innerHTML.includes('id=\"quickExp\"'));assert(nodes['#root'].innerHTML.includes('Acerto final'));
 vm.runInContext("tab='fechamento';render()",context);assert(nodes['#root'].innerHTML.includes('Copiar relatório'));assert(nodes['#root'].innerHTML.includes('Confirmar pagamento'));assert(nodes['#root'].innerHTML.includes('pix@example.com'));
});
test('resultado fica oculto mesmo com cache até meio-dia; domingo sem promessa de amanhã',()=>{
 const previous=Date.now;
 try{
  Date.now=()=>Date.parse('2026-11-19T11:59:59-03:00');const {context,nodes}=ui(),key=dayKey();
  vm.runInContext(`S={...S,me:'ob',ready:true,loaded:{'votes-${key}':true},qvoted:{'${key}':['ob']},querido:{'${key}':{bruno:{'❤️':13}}}};tab='querido';render()`,context);
  assert(!nodes['#root'].innerHTML.includes('class="qres'));assert(nodes['#root'].innerHTML.includes('revelado ao meio-dia'));
  Date.now=()=>Date.parse('2026-11-19T12:00:00-03:00');vm.runInContext('render()',context);assert(nodes['#root'].innerHTML.includes('Resultado de 19/11'));assert(nodes['#root'].innerHTML.includes('class="qres'));
  Date.now=()=>Date.parse('2026-11-22T10:00:00-03:00');const final=dayKey();vm.runInContext(`S.qvoted={'${final}':['ob']};render()`,context);assert(nodes['#root'].innerHTML.includes('Esta foi a última votação do congresso.'));assert(!nodes['#root'].innerHTML.includes('Amanhã'));
 }finally{Date.now=previous;}
});
test('placar congelado não ganha multa de domingo; CPF padrão e novas categorias',()=>{
 const closeAt=Date.parse('2026-11-22T09:00:00-03:00'),later=Date.parse('2026-11-22T13:00:00-03:00');
 const before=scoringPoints([],{},undefined,{closedAt:{toMillis:()=>closeAt}},later);
 assert.equal(before.length,42);assert(!before.some(p=>p.id.includes(VOTE_DAYS.at(-1).key)));
 assert.equal(scoringPoints([],{},undefined,null,later).length,56);
 assert.equal(Object.keys(PIX_TYPES)[0],'cpf');
 const {context,nodes}=ui();vm.runInContext("S={...S,me:'bruno',admin:true,ready:true,scoreClosing:{closedAt:{toMillis:()=>Date.now()}}};tab='placar';render()",context);
 assert(!nodes['#root'].innerHTML.includes('id="givePts"'));assert(nodes['#root'].innerHTML.includes('Placar encerrado.'));
 assert(vm.runInContext("CATS.some(c=>c.name==='Colocação')&&CATS.some(c=>c.name==='Outros')",context));
 assert.equal(notice('Escolha sua foto primeiro'),'Escolha sua foto primeiro.');assert.equal(notice('Escolha sua foto primeiro.'),'Escolha sua foto primeiro.');
});
test('links ficam compactos na home; modal oculta edição a membros e não expõe URL vazia',()=>{
 const {context,nodes}=ui();vm.runInContext("S={...S,me:'bruno',ready:true,admin:false,loaded:{officialLinks:true},officialLinks:{...EMPTY_OFFICIAL_LINKS,playlistUrl:'https://open.spotify.com/playlist/example',wifiPassword:'senha-exemplo'}};tab='inicio';render();sheet=(html)=>globalThis.modal=html;sheetOfficialLinks()",context);
 assert(nodes['#root'].innerHTML.includes('Links oficiais'));assert(!nodes['#root'].innerHTML.includes('senha-exemplo'));assert(!nodes['#root'].innerHTML.includes('https://open.spotify.com'));
 assert(!context.modal.includes('editOfficialLinks'));assert(context.modal.includes('Em breve'));assert(context.modal.includes('noopener noreferrer'));assert(context.modal.includes('Copiar senha'));assert(!context.modal.includes('href=""'));
 vm.runInContext('S.admin=true;sheetOfficialLinks()',context);assert(context.modal.includes('editOfficialLinks'));
});
