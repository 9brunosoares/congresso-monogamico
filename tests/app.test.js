import {createDiscovery,DISCOVERY_OWNER,DISCOVERY_END} from '../discovery.js';
import {departure,availableDay,agendaFor,votePeople,departureFor} from '../travel.js';
import test from 'node:test';
import {moneyToCents,expenseCents,ledgerBalances,simplifiedTransfers,settlementsOpen,activeExpenses,canManagePayment,splitCents,closingReport,closingSnapshot,transferRows} from '../finance.js';
import {PIX_TYPES} from '../pix.js';
import {EMPTY_OFFICIAL_LINKS} from '../official-links.js';
import {REACTIONS} from '../mural-reactions.js';
import {createChatColors} from '../chat-colors.js';
import {prepareReportPhoto} from '../report-photo.js';
import {bindAgendaSwipe,adjacentDay} from '../agenda-gesture.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ALL,PEOPLE,P,EMOJIS} from '../roster.js';
import {dayKey,tripStarted,validatePin,applyBallot,decodeTally,VOTE_DAYS,votingKey,votingOpen,missedVotePoints,resultDay,alreadyVotedMessage,scoringPoints,notice} from '../shared.js';

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
 assert.equal(ALL.length,13);assert.equal(new Set(ALL).size,13);
 assert.deepEqual(PEOPLE.filter(p=>p.admin).map(p=>p.id),['bruno','igor','pig']);
 for(const p of PEOPLE){assert(p.nick);assert(!('name'in p));assert(fs.existsSync(new URL(`../img/${p.id}.jpg`,import.meta.url)));}
});
test('Nosso feed tem botão de publicar no título e curtidas simples',()=>{
 const {context,nodes,events}=ui();
 vm.runInContext(`S={...S,ready:true,me:'bruno',loaded:{tripFeed:true,tripGallery:true},tripPosts:[
  {id:'a',author:'ob',createdAt:'stamp',caption:'Chegamos! <3',reactions:{bruno:'❤️',igor:'😂'}},{id:'b',author:'bruno',createdAt:'stamp',reactions:{ob:'❤️'}},{id:'c',author:'igor',reactions:{}}
 ]};render()`,context);
 const home=nodes['#root'].innerHTML;
 assert(home.indexOf('id="trip-title"')>home.indexOf('<h3>Queridômetro</h3>'));
 for(const section of ['Seu placar','Liderança','Suas contas'])assert(!home.includes(`<h3>${section}</h3>`));
 assert.equal((home.match(/data-trip-photo=/g)||[]).length,2);
 assert.match(home,/<p class="trip-caption">Chegamos! &lt;3<\/p>/);
 assert.match(home,/data-trip-delete="b"/);assert(!home.includes('data-trip-delete="a"'));
 assert.match(home,/data-trip-like="a"[^>]+aria-label="Curtir foto, 1 curtida"[^>]+aria-pressed="true"/);
 assert(!home.includes('data-trip-like="b"'));assert(!home.includes('data-reaction-picker='));
 assert.match(home,/<h3 id="trip-title">Nosso feed<\/h3>[^\n]+id="addTripPhoto"/);
 const calls=[];context.backend.setTripReaction=(...args)=>{calls.push(args);return Promise.resolve();};
 for(const pressed of ['false','true']){
  const button={dataset:{tripLike:'a'},getAttribute:()=>pressed};
  for(const click of events.click)click({target:{closest:s=>s==='[data-trip-like]'?button:null}});
 }
 assert.deepEqual(calls,[['a','❤️'],['a',null]]);
 vm.runInContext("tab='fotos';render()",context);
 assert.equal((nodes['#root'].innerHTML.match(/data-trip-photo=/g)||[]).length,3);
 assert.match(nodes['#root'].innerHTML,/data-trip-like="c"[^>]+0 curtidas/);
 assert(!nodes['#root'].innerHTML.includes('id="addTripPhoto"'));
});
test('portão e mapa aparecem na home após a liberação de cada perfil',()=>{
 const previous=Date.now;Date.now=()=>Date.parse('2026-11-11T10:00:00-03:00');
 try{
 const {context,nodes}=ui();
 nodes['#meBtn']={focus(){}};
 const opened=[];
 context.openTravelMap=(id,onClose)=>{opened.push(id);return {close:onClose};};
 for(const id of ALL){
  context.profile=P[id];
  vm.runInContext('S.me=profile.id;S.admin=!!profile.admin',context);
  vm.runInContext('S.ready=true;render()',context);
  const earlyAccess=['pig','igor','ibrahim','nanu'].includes(id);
  assert.equal(nodes['#root'].innerHTML.includes('id="simulateTrip"'),earlyAccess);
  if(!earlyAccess)vm.runInContext("for(const event of ['programa','contas','open'])discovery.record(S.me,event)",context);
  const home=vm.runInContext('viewInicio()',context);
  assert(home.includes('id="simulateTrip"'));
  vm.runInContext('simulateTrip();travelMap.close()',context);
 }
 vm.runInContext('S.me=null;simulateTrip()',context);
 assert.deepEqual(opened,ALL);
 }finally{Date.now=previous;}
});

test('revelação só perde destaque depois de carregar em uma aba visível',()=>{
 const previous=Date.now;Date.now=()=>Date.parse('2026-11-20T12:00:01-03:00');
 try{
  const {context}=ui(),key=dayKey();
  vm.runInContext("S.me='bruno';tab='querido';markResultSeen()",context);
  assert(vm.runInContext('homeQueridometro()',context).includes('q-reveal'));
  vm.runInContext(`S.loaded={'votes-${key}':true};document.hidden=true;markResultSeen()`,context);
  assert(vm.runInContext('homeQueridometro()',context).includes('q-reveal'));
  vm.runInContext('document.hidden=false;markResultSeen()',context);
  assert(vm.runInContext('homeQueridometro()',context).includes('q-quiet'));
  vm.runInContext("S.me='igor'",context);
  assert(vm.runInContext('homeQueridometro()',context).includes('q-reveal'));
 }finally{Date.now=previous;}
});
function ui(){
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const code=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*?;$/gm,'').replace(/backend.start\(data=>\{[\s\S]*$/,'');
 const nodes={},events={},timers=new Map();let timerId=0;const context={createDiscovery,DISCOVERY_OWNER,DISCOVERY_END,departure,availableDay,agendaFor,votePeople,departureFor,moneyToCents,expenseCents,ledgerBalances,simplifiedTransfers,settlementsOpen,activeExpenses,canManagePayment,splitCents,closingReport,closingSnapshot,transferRows,PIX_TYPES,EMPTY_OFFICIAL_LINKS,REACTIONS,createChatColors,prepareReportPhoto,bindAgendaSwipe,adjacentDay,PEOPLE,P,ALL,EMOJIS,dayKey,tripStarted,VOTE_DAYS,votingKey,votingOpen,missedVotePoints,resultDay,alreadyVotedMessage,scoringPoints,notice,Date,Intl,console,backend:{formatStamp:()=>''},setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id},clearTimeout(id){timers.delete(id)},setInterval(){},scrollY:0,scrollTo(){},location:{},localStorage:{getItem(){return null},setItem(){}},document:{querySelector(s){return nodes[s]??={innerHTML:'',querySelectorAll(){return []}}},querySelectorAll(){return []},addEventListener(name,fn){(events[name]??=[]).push(fn)}}};
 vm.createContext(context);vm.runInContext(code,context);return {context,nodes,html,events,timers};
}

test('mural discreto: só contagens positivas; opções aparecem ao abrir o seletor',()=>{
 const {context}=ui();
 vm.runInContext("S={...S,me:'bruno',caseReactions:{example:{bruno:'😂',ob:'😂',pig:'❤️'}},loaded:{'reactions-example':true}}",context);
 let html=vm.runInContext("caseCard({id:'example',who:'ob',what:'Teste',status:'ok'})",context);
 assert(!html.includes('data-react='));assert(html.includes('data-reaction-picker="example"'));
 assert.equal((html.match(/class="reaction-total[ "]/g)||[]).length,2);assert(html.includes('Rindo: 2'));assert(!html.includes('Palmas: 0'));
 vm.runInContext("reactionPicker='example'",context);html=vm.runInContext("caseReactions('example')",context);
 assert.equal((html.match(/data-react=/g)||[]).length,5);assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);
 assert(!vm.runInContext("caseCard({id:'example',who:'ob',what:'Teste',status:'pend'},true)",context).includes('data-reaction-picker='));
 vm.runInContext("S.reactionPending={example:true}",context);
 assert.equal((vm.runInContext("caseReactions('example')",context).match(/ disabled/g)||[]).length,6);
 vm.runInContext("reactionPicker=null;S.caseReactions={}",context);
 assert(!vm.runInContext("caseReactions('example')",context).includes('class="reaction-total '));
});

test('seletor abre com toque ou pressão longa; rolagem cancela a pressão',()=>{
 const {context,events,timers}=ui();
 vm.runInContext("S={...S,me:'bruno',ready:true,loaded:{'cases-mural':true,'reactions-example':true}};tab='mural'",context);
 const button={disabled:false,dataset:{reactionPicker:'example'}};
 const target={closest:selector=>selector==='[data-reaction-picker]'?button:null};
 const send=(name,e)=>events[name]?.forEach(fn=>fn(e));
 send('click',{target});assert.equal(vm.runInContext('reactionPicker',context),'example');
 send('click',{target});assert.equal(vm.runInContext('reactionPicker',context),null);
 send('pointerdown',{target,button:0,clientX:20,clientY:30});
 send('pointermove',{clientX:20,clientY:70});assert(![...timers.values()].some(t=>t.ms===420));
 send('pointerdown',{target,button:0,clientX:20,clientY:30});
 [...timers.values()].find(t=>t.ms===420).fn();send('pointerup',{});send('click',{target:{closest:()=>null}});
 assert.equal(vm.runInContext('reactionPicker',context),'example');
 send('click',{target:{closest:()=>null}});assert.equal(vm.runInContext('reactionPicker',context),null);
});

test('histórico unificado, exclusão por ADM e lançamento a partir de 18/11',()=>{
 const {context}=ui();
 vm.runInContext("S={...S,ready:true,me:'ob',admin:false,tasks:[{id:'task-example',who:'ob',d:5,why:'Lavar a louça',status:'ok'}],points:[{id:'task_task-example',who:'ob',d:5,why:'Lavar a louça',kind:'aux'}]}",context);
 let at=Date.parse('2026-11-18T03:00:00Z')-1;
 context.tripStarted=()=>tripStarted(at);
 let html=vm.runInContext('viewPlacar()',context);
 assert(html.includes('Os lançamentos abrem em 18/11.'));
 assert(!html.includes('id="quickReport"'));assert(!html.includes('id="givePts"'));
 assert(!vm.runInContext('viewInicio()',context).includes('id="homeReport"'));
 at++;html=vm.runInContext('viewPlacar()',context);
 assert(html.includes('Histórico de lançamentos'));
 assert.equal((html.match(/Lavar a louça/g)||[]).length,1);
 assert(html.includes('Fiz uma tarefa'));assert(!html.includes('data-delete-task'));
 assert(vm.runInContext('viewInicio()',context).includes('id="homeReport"'));
 vm.runInContext('S.admin=true',context);html=vm.runInContext('viewPlacar()',context);assert(html.includes('data-delete-task="task-example"'));
 vm.runInContext("S.scoreClosing={closedAt:{toMillis:()=>Date.now()}}",context);assert(!vm.runInContext('viewPlacar()',context).includes('data-delete-task'));
});

test('chat: só o autor vê apagar; mensagem riscada continua legível e ADM não recebe poder extra',()=>{
 const {context,html:styles}=ui();
 vm.runInContext("S={...S,me:'bruno',admin:true,chat:[{id:'own',text:'Minha mensagem',mine:true},{id:'other',text:'Mensagem de outro',mine:false},{id:'struck',text:'Ainda dá para ler',mine:true,struck:true}]}",context);
 const html=vm.runInContext('viewFofoca()',context);
 assert(html.includes('chatForm'));assert(html.includes('Minha mensagem'));
 assert(html.includes('data-del="own"'));assert(!html.includes('data-del="other"'));assert(!html.includes('data-del="struck"'));
 assert(html.includes('class="chat-text struck">Ainda dá para ler</div>'));
 assert(styles.includes('text-decoration-style:double'));assert(!html.includes('risco duplo'));
 vm.runInContext('S.admin=false',context);assert(vm.runInContext('viewFofoca()',context).includes('data-del="own"'));
});

test('chat agrupa falas por cor sem imprimir chave/identidade; mensagens antigas são neutras',()=>{
 const {context}=ui();
 vm.runInContext("S.chat=[{text:'Primeira',threadKey:'a'.repeat(32)},{text:'Segunda',threadKey:'b'.repeat(32)},{text:'Terceira',threadKey:'a'.repeat(32)},{text:'Antiga'}]",context);
 const html=vm.runInContext('viewFofoca()',context),colors=[...html.matchAll(/style="--chat-light:([^;]+);--chat-dark:([^"]+)"/g)];
 assert.equal(colors.length,3);assert.equal(colors[0][0],colors[2][0]);assert.notEqual(colors[0][0],colors[1][0]);
 assert(!html.includes('a'.repeat(32)));assert(!html.includes('b'.repeat(32)));assert(!html.includes('threadKey'));
 assert.equal((html.match(/ tinted/g)||[]).length,3);
});

test('telas renderizam para os 14 e controles ADM usam papel do servidor',()=>{
 const {context,nodes,html}=ui();assert(!html.includes('xvi-congresso'));assert(!html.includes('base64'));
 vm.runInContext('S.ready=true;viewLogin();',context);assert.equal((nodes['#root'].innerHTML.match(/data-id=/g)||[]).length,13);
 for(const id of ALL){vm.runInContext(`S={...S,me:'${id}',admin:false,ready:true};for(const key of Object.keys(LABELS)){tab=key;render();}`,context);assert(!nodes['#root'].innerHTML.includes('id="givePts"'));}
 context.tripStarted=()=>true;vm.runInContext("S.me='bruno';S.admin=true;tab='placar';render()",context);assert(nodes['#root'].innerHTML.includes('id="givePts"'));
});
test('rateio entre 14 pessoas e acerto não perdem saldo',()=>{
 const {context}=ui();vm.runInContext("S.me='bruno';S.exps=[{payer:'bruno',amount:130,split:ALL}];",context);
 const result=vm.runInContext('({balance:balances(),transfers:settle()})',context);
 assert.equal(result.balance.bruno,120);assert(ALL.filter(id=>id!=='bruno').every(id=>result.balance[id]===-10));assert.equal(result.transfers.length,12);assert.equal(result.transfers.reduce((s,t)=>s+t.v,0),120);
});
test('14 votações completas não causam transporte entre os oito contadores',()=>{
 for(const emoji of EMOJIS){let state;for(const voter of ALL){state=applyBallot(state,Object.fromEntries(ALL.filter(id=>id!==voter).map(id=>[id,emoji])),voter);}assert.equal(state.voters,13);for(const id of ALL){const decoded=decodeTally(state.counts[id]);assert.equal(decoded[emoji],12);assert.equal(Object.values(decoded).reduce((a,b)=>a+b,0),12);}}
});

test('votação somente nas quatro manhãs e penalidade única após o prazo',()=>{
 assert(!votingOpen(Date.parse('2026-11-18T10:00:00-03:00')));
 for(const day of VOTE_DAYS){
  assert(!votingOpen(day.start));assert(!votingOpen(day.start+6*3600000-1));assert(votingOpen(day.start+6*3600000));assert(votingOpen(day.deadline-1));assert(!votingOpen(day.deadline));
 }
 assert(!votingOpen(Date.parse('2026-11-23T10:00:00-03:00')));
 const d=VOTE_DAYS[0],attendance={[d.key]:{igor:true}};
 assert.equal(missedVotePoints(attendance,d.deadline-1).length,0);
 const penalties=missedVotePoints(attendance,d.deadline);
 assert.equal(penalties.length,7);assert(!penalties.some(p=>p.who==='igor'));assert(penalties.every(p=>p.d===-5));
 assert.equal(missedVotePoints({},VOTE_DAYS[3].deadline).length,47);
});
test('home mostra mural apenas após condenação; login sem selo ADM',()=>{
 const {context,nodes}=ui();context.tripStarted=()=>true;vm.runInContext('S.ready=true;viewLogin()',context);
 assert(nodes['#root'].innerHTML.includes('Quem é você?'));assert(!nodes['#root'].innerHTML.includes('class="adm"'));
 vm.runInContext("S.me='bruno';S.shame=[{status:'ok'}];tab='inicio';render()",context);
 assert(nodes['#root'].innerHTML.includes('Fazer denúncia'));assert(nodes['#root'].innerHTML.includes('Mural da Vergonha'));
 assert(!nodes['#root'].innerHTML.includes('Relógio real'));
});

test('Fofoca só tem chat; mural não expõe pendentes e usa foto ou avatar',()=>{
 const {context,nodes}=ui();
 vm.runInContext("S={...S,me:'bruno',admin:false,ready:true,shame:[{id:'pending',who:'ob',by:'bruno',what:'Pendente',status:'pend'}]};tab='inicio';render()",context);
 assert(!nodes['#root'].innerHTML.includes('Mural da Vergonha'));
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
 const {context,nodes}=ui();vm.runInContext("S={...S,me:'ob',admin:false,ready:true,budget:13000,loaded:{pix:true},pixKeys:{pig:{type:'email',value:'teste@example.com'}},exps:[{id:'rental-2026',title:'Locação da casa',cat:'casa',payer:'pig',amount:2640,amountCents:264000,split:ALL}]};tab='contas';contasSeg='orcamento';render()",context);
 assert(nodes['#root'].innerHTML.includes('13.000'));assert(nodes['#root'].innerHTML.includes('1.000 previstos'));assert(!nodes['#root'].innerHTML.includes('Ajustar orçamento (ADM)'));
 vm.runInContext("contasSeg='pagamentos';render()",context);assert(nodes['#root'].innerHTML.includes('Registrar pagamento'));assert(!nodes['#root'].innerHTML.includes('ainda não são registrados'));
});
test('fechamento oculta lançamentos e exibe relatório e confirmações',()=>{
 const {context,nodes}=ui();vm.runInContext("S={...S,me:'ob',ready:true,payments:[],closing:closingSnapshot([{id:'test',title:'Casa',amount:140,payer:'pig',split:ALL}],[],14000,{pig:{type:'email',value:'pix@example.com'}})};tab='contas';render()",context);
 assert(!nodes['#root'].innerHTML.includes('id=\"quickExp\"'));assert(nodes['#root'].innerHTML.includes('Acerto final'));
 vm.runInContext("tab='fechamento';render()",context);assert(nodes['#root'].innerHTML.includes('Copiar relatório'));assert(nodes['#root'].innerHTML.includes('Confirmar pagamento'));assert(nodes['#root'].innerHTML.includes('pix@example.com'));
});
test('detalhes do saldo mostram somente os Pix do perfil e atualizam com pagamentos',()=>{
 const {context,nodes}=ui();
 const views=[];
 context.backend.setView=view=>views.push(view);
 vm.runInContext(`S={...S,me:'ob',ready:true,loaded:{pix:true},pixKeys:{bruno:{type:'email',value:'bruno@example.com'}},payments:[],exps:[
  {id:'a',title:'Casa',cat:'casa',payer:'bruno',amount:120,split:['bruno','ob','igor']},
  {id:'b',title:'Comida',cat:'mercado',payer:'pig',amount:50,split:['pig','luan']}
 ]};tab='contas';render()`,context);
 assert.match(nodes['#root'].innerHTML,/data-go="saldo"[^>]*>[^]*Ver detalhes/);
 vm.runInContext("go('saldo')",context);
 assert.equal(views.at(-1),'contas');
 let html=nodes['#root'].innerHTML;
 assert.match(html,/Você paga[^]*Bruno[^]*R\$ 40,00/);
 assert(html.includes('data-pix="bruno"'));
 for(const other of ['Igor','Pig','Luan','Você recebe'])assert(!html.includes(other));

 vm.runInContext("S.payments=[{from:'ob',to:'bruno',amountCents:1000,status:'active'}];render()",context);
 assert(nodes['#root'].innerHTML.includes('R$ 30,00'));
 vm.runInContext("S.me='bruno';render()",context);
 html=nodes['#root'].innerHTML;
 assert(html.includes('Você recebe')&&html.includes('OB')&&html.includes('Igor'));
 assert(!html.includes('Você paga')&&!html.includes('data-pix=')&&!html.includes('Luan'));

 vm.runInContext("S.me='ob';S.closing=closingSnapshot(S.exps,S.payments,13000);const own=S.closing.transfers.find(t=>t.from==='ob');S.payments.push({kind:'settlement',status:'active',settlementId:own.id});render()",context);
 assert(nodes['#root'].innerHTML.includes('Você não tem valores a pagar ou receber.'));
 assert(!nodes['#root'].innerHTML.includes('data-pix='));
});
test('resultado fica oculto mesmo com cache até meio-dia; domingo sem promessa de amanhã',()=>{
 const previous=Date.now;
 try{
  Date.now=()=>Date.parse('2026-11-19T11:59:59-03:00');const {context,nodes}=ui(),key=dayKey();
  vm.runInContext(`S={...S,me:'ob',ready:true,loaded:{'votes-${key}':true},qvoted:{'${key}':['ob']},querido:{'${key}':{bruno:{'❤️':13}}}};tab='querido';render()`,context);
  assert(!nodes['#root'].innerHTML.includes('class="qres'));assert(nodes['#root'].innerHTML.includes('revelado ao meio-dia'));
  assert(!vm.runInContext('viewInicio()',context).includes('Os votos foram revelados!'));
  Date.now=()=>Date.parse('2026-11-19T12:00:00-03:00');vm.runInContext('render()',context);assert(nodes['#root'].innerHTML.includes('Resultado de 19/11'));assert(nodes['#root'].innerHTML.includes('class="qres'));
  for(const me of ['ob','bruno']){
   const home=vm.runInContext(`S.me='${me}';viewInicio()`,context);
   assert(home.includes(me==='ob'?'q-quiet':'Os votos foram revelados!'));
   assert(!home.includes('Você já votou hoje.'));
  }
  vm.runInContext("S.me='ob'",context);
  Date.now=()=>Date.parse('2026-11-22T10:00:00-03:00');const final=dayKey();vm.runInContext(`S.qvoted={'${final}':['ob']};render()`,context);assert(nodes['#root'].innerHTML.includes('Esta foi a última votação do congresso.'));assert(!nodes['#root'].innerHTML.includes('Amanhã'));
 }finally{Date.now=previous;}
});
test('placar congelado não ganha multa de domingo; CPF padrão e novas categorias',()=>{
 const closeAt=Date.parse('2026-11-22T09:00:00-03:00'),later=Date.parse('2026-11-22T13:00:00-03:00');
 const before=scoringPoints([],{},undefined,{closedAt:{toMillis:()=>closeAt}},later);
 assert.equal(before.length,34);assert(!before.some(p=>p.id.includes(VOTE_DAYS.at(-1).key)));
 assert.equal(scoringPoints([],{},undefined,null,later).length,47);
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

test('saídas personalizadas mantêm a agenda comum e respeitam carros e períodos',()=>{
 assert.equal(departureFor('bruno',19).driver,'bruno');assert.equal(departureFor('ibrahim',19).period,'À noite');
 assert.equal(departureFor('pig',18).driver,'igor');assert.equal(departureFor('diogo',18).driver,'nanu');
 assert.equal(departureFor('luan',20).driver,'felipe');assert.equal(departureFor('sadano',18),null);assert.equal(departureFor('kirk',18),null);
 const {context}=ui();vm.runInContext("S={...S,me:'ibrahim'};day=19",context);const html=vm.runInContext('viewPrograma()',context);assert(html.includes('Carro de Bruno'));
});
test('PIN é uma segunda etapa e possui volta discreta',()=>{
 const {context,nodes}=ui();vm.runInContext("loginPerson='ob';viewLogin()",context);const html=nodes['#root'].innerHTML;
 assert(html.includes('id="identityStep" hidden'));assert(!html.includes('id="pinStep" hidden'));assert(html.includes('id="backIdentity"'));
 assert(!html.includes('id="resetPin"'));
 for(const key of ['#recoveryCode','#pin','#pinAgain','#pinRecovery','#firstAccess','#pinLabel','#confirmPin','#enter'])nodes[key]={style:{},focus(){}};
 vm.runInContext("loginPerson='nanu';viewLogin()",context);
 assert(nodes['#root'].innerHTML.includes('Esqueci meu PIN'));
 nodes['#resetPin'].onclick();
 assert.equal(nodes['#pinRecovery'].hidden,false);
 assert.equal(nodes['#recoveryCode'].required,true);
 assert.equal(nodes['#firstAccess'].hidden,true);
 assert.equal(nodes['#pinAgain'].required,true);
 nodes['#resetPin'].onclick();
 assert.equal(nodes['#pinRecovery'].hidden,true);
 assert.equal(nodes['#pinAgain'].required,false);
});

test('primeira votação inclui oito presentes, sem voto nem multa dos que chegam depois',()=>{
 const at=Date.parse('2026-11-19T10:00:00-03:00'),eligible=votePeople(ALL,19);assert.equal(eligible.length,8);assert(eligible.includes('sadano'));assert(!eligible.includes('bruno'));
 let state;for(const voter of eligible)state=applyBallot(state,Object.fromEntries(eligible.filter(id=>id!==voter).map(id=>[id,EMOJIS[0]])),voter,at);
 assert.equal(state.voters,8);for(const id of eligible)assert.equal(decodeTally(state.counts[id])[EMOJIS[0]],7);assert.equal(state.counts.bruno,0);
 assert.throws(()=>applyBallot(undefined,{},'bruno',at));assert.equal(missedVotePoints({},VOTE_DAYS[0].deadline).length,8);assert.equal(votePeople(ALL,20).length,13);
 assert.equal(agendaFor([{start:departure('luan').start-1},{start:departure('luan').start}],'luan').length,1);assert.equal(availableDay('luan'),20);assert.equal(departure('bruno').time,'20:00');assert.equal(departure('luan').time,'08:00');
});

test('pagamento acompanha Pix do recebedor e não mantém chave de outra pessoa',()=>{
 const {context,nodes}=ui();nodes['#pmTo']={value:'bruno'};nodes['#paymentRecipientPix']={innerHTML:'',hidden:false,querySelector:()=>null};
 vm.runInContext("S={...S,loaded:{pix:true},pixKeys:{bruno:{type:'email',value:'bruno@example.com'},ob:{type:'email',value:'ob@example.com'}}};refreshRecipientPix()",context);
 assert(nodes['#paymentRecipientPix'].innerHTML.includes('bruno@example.com'));
 nodes['#pmTo'].value='ob';vm.runInContext('refreshRecipientPix()',context);assert(nodes['#paymentRecipientPix'].innerHTML.includes('ob@example.com'));assert(!nodes['#paymentRecipientPix'].innerHTML.includes('bruno@example.com'));
 nodes['#pmTo'].value='igor';vm.runInContext('refreshRecipientPix()',context);assert(nodes['#paymentRecipientPix'].hidden);assert(!nodes['#paymentRecipientPix'].innerHTML.includes('ob@example.com'));
});

test('viagem começa à meia-noite de 18/11 e votação só nos dias oficiais',()=>{
 const start=Date.parse('2026-11-18T00:00:00-03:00'),before=start-1;
 assert(!tripStarted(before));assert(tripStarted(start));assert(!votingOpen(start));
 assert.equal(resultDay(start),null);assert.equal(missedVotePoints({},start).length,0);
});
test('editor da agenda só é oferecido a ADM, inclusive na agenda completa',()=>{
 const {context}=ui();vm.runInContext("S={...S,me:'bruno',admin:true};AGENDA.push({id:'x',d:18,t:'21:00',title:'Teste',start:1795046400000,end:1795050000000});agendaAdminMode=true;day=18",context);assert(vm.runInContext('viewPrograma()',context).includes('data-edit-activity="x"'));vm.runInContext('S.admin=false',context);assert(!vm.runInContext('viewPrograma()',context).includes('data-edit-activity'));
});
