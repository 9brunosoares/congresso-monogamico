import {prepareReportPhoto} from './report-photo.js';
import {bindAgendaSwipe,adjacentDay} from './agenda-gesture.js';
import {PEOPLE, P, ALL, EMOJIS} from './roster.js';
import {dayKey,votingOpen,missedVotePoints,VOTE_DAYS} from './shared.js?v=20261029b';
import * as backend from './backend.js?v=20261029h';
/* ===================== DADOS ===================== */
const first = id => P[id].nick;

// Viagem: quarta 18 à noite até domingo 22/11/2026 pela manhã.
const DAYS = [
  {d:18, wd:"Qua", title:"Chegadas"},
  {d:19, wd:"Qui", title:"Home office"},
  {d:20, wd:"Sex", title:"Circuito"},
  {d:21, wd:"Sáb", title:"Bexiga e lona"},
  {d:22, wd:"Dom", title:"Retorno"},
];
const AGENDA = [];

const RULES = {
  plus:[["Lavar a louça",5],["Tirar o lixo",5],["Cozinhar uma refeição",10],["Repor gelo ou bebida",3],["Vencer jogo ou gincana","10 a 20"]],
  minus:[["Lixo no chão",-5],["Louça suja pela casa",-5],["Atraso na programação",-3],["Sem look temático",-5],["Infração da monogamia",-15]],
};

const CATS = [
  {id:"casa",name:"Casa",budget:6500},
  {id:"mercado",name:"Mercado",budget:2000},
  {id:"bebida",name:"Bebidas",budget:1500},
  {id:"transporte",name:"Transporte",budget:800},
  {id:"atividades",name:"Atividades e festa",budget:1200},
];

let S = {me:null,admin:false,ready:false,budget:0,points:[],exps:[],shame:[],chat:[],tasks:[],querido:{},qvoted:{},voterCount:0,error:''};

/* Relógio de demonstração: começa na sexta, 20/11, 15:40 */
const T0 = Date.now(), DEMO0 = new Date(2026,10,20,15,40).getTime();
let demo = false;
const now = () => demo ? DEMO0 + (Date.now()-T0) : Date.now();

/* ===================== AJUDANTES ===================== */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const brl = v => "R$ " + v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const brl0 = v => "R$ " + Math.round(v).toLocaleString("pt-BR");
// Enquadra as fotos das capturas originais sem alterar seus pixels.
const photoStyle = id => {
  const frame=P[id].frame;
  if(!frame)return "";
  const [w,h,x,y,size]=frame;
  return `width:${w/size*100}%;height:${h/size*100}%;left:${-x/size*100}%;top:${-y/size*100}%;object-fit:fill`;
};
const av = (id,cls="") => `<span class="av ${cls}" aria-hidden="true">${esc(P[id].nick[0])}<img src="img/${id}.jpg" style="${photoStyle(id)}" alt="" onerror="this.remove()"></span>`;
const isAdm = () => S.me && S.admin;
const allPoints = () => [...S.points,...missedVotePoints(S.attendance).filter(p=>!S.attendanceReady||S.attendanceReady[p.id.split('_')[1]])];
const score = id => allPoints().filter(x=>x.who===id).reduce((a,x)=>a+x.d,0);
const ranking = () => ALL.map(id=>({id,s:score(id),n:allPoints().filter(x=>x.who===id).length})).sort((a,b)=>b.s-a.s||P[a.id].nick.localeCompare(P[b.id].nick));
const pts = d => `<span class="pts ${d<0?"neg":"pos"}">${d>0?"+":""}${d}</span>`;
const fmtTime = ms => new Date(ms).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
const dayOf = ms => DAYS.find(x=>x.d===new Date(ms).getDate());

function toast(msg){ const t=document.createElement("div"); t.className="toast"; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2200); }

/* ===================== CONTAS ===================== */
function balances(){
  const b = Object.fromEntries(ALL.map(id=>[id,0]));
  S.exps.forEach(e=>{ const share=e.amount/e.split.length; b[e.payer]+=e.amount; e.split.forEach(id=>b[id]-=share); });
  return b;
}
function settle(){
  const b = balances();
  const cred = ALL.filter(id=>b[id]>0.005).map(id=>({id,v:b[id]})).sort((a,c)=>c.v-a.v);
  const debt = ALL.filter(id=>b[id]<-0.005).map(id=>({id,v:-b[id]})).sort((a,c)=>c.v-a.v);
  const out=[]; let i=0,j=0;
  while(i<debt.length && j<cred.length){
    const v=Math.min(debt[i].v,cred[j].v); out.push({from:debt[i].id,to:cred[j].id,v});
    debt[i].v-=v; cred[j].v-=v; if(debt[i].v<0.01)i++; if(cred[j].v<0.01)j++;
  }
  return out;
}

/* ===================== TELAS ===================== */
let tab = "inicio", day = 18, contasSeg = "despesas", qDraft = {};
try{ tab = localStorage.getItem("xvi-tab") || "inicio";if(!["inicio","programa","placar","querido","contas","fofoca"].includes(tab))tab="inicio"; }catch(e){}

const busyActions=new Set();
async function act(button,run){
  const key=button?.id;if(button?.disabled||(key&&busyActions.has(key)))return;
  if(key)busyActions.add(key);
  if(button){button.disabled=true;button.setAttribute("aria-busy","true");button.dataset.original=button.innerHTML;button.innerHTML=loader()+"<span>Enviando…</span>";}
  try{await run();}catch(e){backend.reportError?.(e);toast(backend.errorText(e));}
  finally{if(key)busyActions.delete(key);if(button){button.disabled=false;button.removeAttribute("aria-busy");button.innerHTML=button.dataset.original;}const current=key?document.getElementById?.(key):null;if(current)current.disabled=false;}
}
function loader(){return '<span class="union-loader" aria-hidden="true"><span class="jewel-ring ring-left"><i class="gem"></i></span> <span class="jewel-ring ring-right"><i class="gem"></i></span> <span class="lock"><i class="shackle"></i><i class="lock-body"><b class="keyhole"></b></i></span></span>';}
function viewLogin(){
  let sel=null;
  $('#root').innerHTML=`<div class="app"><form class="login" id="loginForm">
    <div class="badge"><div class="lanyard"><span>CREDENCIAL</span><span>XVI CONGRESSO</span></div><div class="body">
    <div class="eyebrow">Bem-vindo ao</div><h1><em>XVI</em> Congresso Monogâmico</h1>
    <p class="muted" style="margin:10px 0 0">Escolha sua foto e use seu PIN. No primeiro acesso, crie um PIN de 6 dígitos.</p></div></div>
    <h2 style="margin-top:22px">Quem é você?</h2><div class="pick" id="pick">${PEOPLE.map(p=>`<button type="button" data-id="${p.id}" aria-pressed="false">${av(p.id)}<span>${esc(p.nick)}</span></button>`).join('')}</div>
    <label class="f">PIN de 6 dígitos<input id="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="current-password" required placeholder="••••••"></label>
    <label style="display:flex;align-items:center;gap:8px;margin:16px 0"><input id="newAccount" type="checkbox">Primeiro acesso: criar meu PIN</label>
    <label class="f" id="confirmPin" style="display:none;margin-bottom:14px">Confirme seu PIN<input id="pinAgain" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="new-password" placeholder="••••••"></label>
    ${S.error?`<p role="alert">${esc(S.error)}</p>`:''}
    <button class="btn seal block" id="enter" type="submit">Entrar no congresso</button>
    <p class="muted" style="font-size:12px;text-align:center">O celular mantém sua sessão. Esqueceu o PIN? Fale com um ADM.</p>
  </form></div>`;
  $('#pick').onclick=e=>{const b=e.target.closest('button');if(!b)return;sel=b.dataset.id;document.querySelectorAll('#pick button').forEach(x=>x.setAttribute('aria-pressed',x===b));};
  $('#newAccount').onchange=()=>{const create=$('#newAccount').checked;$('#confirmPin').style.display=create?'flex':'none';$('#pinAgain').required=create;$('#pin').autocomplete=create?'new-password':'current-password';$('#enter').textContent=create?'Criar PIN e entrar':'Entrar no congresso';};
  $('#loginForm').onsubmit=e=>{e.preventDefault();const pin=$('#pin').value,create=$('#newAccount').checked;
    if(!sel){toast('Escolha sua foto primeiro');return;}
    if(create && pin!==$('#pinAgain').value){toast('Os dois PINs precisam ser iguais');return;}
    act($('#enter'),()=>backend.login(sel,pin,create));
  };
}

function header(){
  return `<div class="top">
    <div class="brand"><div class="roman">XVI CONGRESSO</div><h1>Monogâmico</h1></div>
    <button class="me" id="meBtn" type="button">${av(S.me,"sm")}<span>${esc(first(S.me))}</span>${isAdm()?'<span class="adm">ADM</span>':""}</button>
  </div>
  <div class="demo">
    <span>Agora: <b class="num" id="clock"></b></span>
    ${isAdm()?`<button class="chip" id="clockBtn" type="button">${demo?"Encerrar demonstração":"Demonstração"}</button>`:""}
  </div>`;
}

function nextItem(){
  const t=now();
  const cur = AGENDA.find(a=>a.start<=t && t<a.end);
  const nxt = AGENDA.find(a=>a.start>t);
  return {cur,nxt};
}

function viewInicio(){
  const {cur,nxt} = nextItem();
  const rk = ranking();
  const myPos = rk.findIndex(r=>r.id===S.me)+1;
  return `
  <button class="btn seal block" id="homeReport" type="button" style="margin-bottom:14px">Fazer denúncia</button>
  ${(S.hasMural??S.shame.some(s=>s.status==="ok"))?'<button class="btn block mural-alert" data-go="mural" type="button" style="margin-bottom:14px">Ver mural da vergonha →</button>':''}
  ${nxt ? `<section class="card next">
    <div class="sealmark" aria-hidden="true">XVI</div>
    <div class="eyebrow">Próxima sessão · ${dayOf(nxt.start).wd} ${fmtTime(nxt.start)}</div>
    <h2>${esc(nxt.title)}</h2>
    <div style="margin-top:4px;opacity:.8;font-size:14px">${esc(nxt.place||"")}${nxt.pts?` · vale até ${nxt.pts} pts`:""}</div>
    <div class="count" id="count"></div>
    ${nxt.prep?`<div class="prep"><small>Exige preparação</small>${esc(nxt.prep)}</div>`:`<div class="prep" style="background:color-mix(in srgb,var(--bg) 12%,transparent);color:inherit"><small>Preparação</small>Nada a preparar. Só aparecer.</div>`}
  </section>` : `<section class="card next"><div class="eyebrow">Congresso encerrado</div><h2>Até o XVII.</h2></section>`}

  ${cur?`<div class="card row" style="margin-top:12px"><span class="tag live">Agora</span><div class="grow"><b>${esc(cur.title)}</b><div class="muted" style="font-size:13px">até ${fmtTime(cur.end)} · ${esc(cur.place||"")}</div></div></div>`:""}

  ${(()=>{const d=dayKey(); const done=(S.qvoted[d]||[]).includes(S.me);
    return `<div class="sec-h"><h3>Queridômetro</h3><button class="link" data-go="querido" type="button">${done||!votingOpen()?"Ver queridômetro":"Votar agora"}</button></div>
    <div class="card row"><div class="emo-strip" aria-hidden="true">${EMOJIS.slice(0,5).join("")}</div><div class="grow">${done?"Você já votou hoje. Os votos são anônimos.":votingOpen()?"Vote até meio-dia. Quem não preencher perde 5 pontos.":"De 19 a 22/11, pela manhã até meio-dia. Não preencher custa 5 pontos por dia."}</div></div>`})()}

  <div class="sec-h"><h3>Seu placar</h3><button class="link" data-go="placar" type="button">Ranking completo</button></div>
  <div class="card row">
    ${av(S.me,"lg")}
    <div class="grow"><div class="eyebrow">${myPos}º lugar de ${ALL.length}</div><div class="bigfig num">${score(S.me)} <span style="font-size:16px;font-family:var(--f-body)" class="muted">pontos</span></div></div>
    <button class="btn sm ghost" id="quickReport" type="button">Fiz uma tarefa</button>
  </div>

  <div class="sec-h"><h3>Liderança</h3></div>
  <div class="card">${podium(rk)}</div>

  <div class="sec-h"><h3>Suas contas</h3><button class="link" data-go="contas" type="button">Abrir contas</button></div>
  ${(()=>{const b=balances()[S.me];return `<div class="card row"><div class="grow"><div class="eyebrow">${b>=0?"Você tem a receber":"Você deve"}</div><div class="bigfig num" style="color:${b>=0?"var(--good)":"var(--bad)"}">${brl(Math.abs(b))}</div></div><button class="btn sm" id="quickExp" type="button">Lançar gasto</button></div>`})()}

  `;
}

function podium(rk){
  const [a,b,c]=rk;
  const one=(r,cls,place)=>`<div class="pod ${cls}">${cls==="p1"?'<div class="crown">LÍDER</div>':""}${av(r.id,cls==="p1"?"xl":"lg")}<div class="nm">${esc(first(r.id))}</div><div class="block"><div class="place">${place}</div><b class="num">${r.s}</b></div></div>`;
  return `<div class="podium">${one(b,"p2","2º")}${one(a,"p1","1º")}${one(c,"p3","3º")}</div>`;
}

function viewPrograma(){
  const t=now();
  const items = AGENDA.filter(a=>a.d===day);
  return `
  <div class="days" role="tablist">${DAYS.map(d=>`<button type="button" data-day="${d.d}" aria-pressed="${d.d===day}"><span>${d.wd}</span><b>${d.d}</b><span>${d.title}</span></button>`).join("")}</div>
  <section class="agenda-swipe" aria-label="Atividades do dia"><div class="sec-h"><h3>${DAYS.find(d=>d.d===day).wd}, ${day} de novembro</h3><span class="muted" style="font-size:13px">${items.length} sessões</span></div>
  <div class="card" style="padding-block:4px">${items.map(a=>{
    const st = t>=a.end?"done":(t>=a.start?"now":"");
    return `<div class="slot ${st}"><time>${a.t}</time><div><h4>${esc(a.title)}</h4>
      ${a.note?`<div class="note">${esc(a.note)}</div>`:""}
      <div class="meta">${st==="now"?'<span class="tag live">Agora</span>':""}${a.place?`<span class="tag">${esc(a.place)}</span>`:""}${a.pts?`<span class="pts">até ${a.pts} pts</span>`:""}${a.prep?`<span class="tag prepn">Preparação</span>`:""}</div>
      ${a.prep?`<div class="note"><b style="color:var(--ink)">Leve/prepare:</b> ${esc(a.prep)}</div>`:""}
    </div></div>`}).join("")}</div>
  </section>${isAdm()?`<button class="btn ghost block" style="margin-top:12px" id="addAct" type="button">Adicionar sessão (ADM)</button>`:""}`;
}

function viewPlacar(){
  const rk=ranking();
  const log=allPoints().sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)).slice(0,12);
  const tasks=S.tasks.filter(t=>isAdm()?t.status==='pend':t.who===S.me);
  const approvals=tasks.length?`<div class="sec-h"><h3>${isAdm()?'Tarefas para aprovar':'Minhas tarefas'}</h3></div><div class="card stack">${tasks.map(t=>`<div><b>${esc(first(t.who))}</b> · ${esc(t.why)} (+${t.d})<div class="muted">${t.status==='pend'?'Aguardando aprovação':t.status==='ok'?'Aprovada':'Não aprovada'}</div>${isAdm()?`<button class="btn sm" data-task="${esc(t.id)}" data-approve="yes" type="button">Aprovar</button> <button class="btn sm ghost" data-task="${esc(t.id)}" data-approve="no" type="button">Recusar</button>`:''}</div>`).join('')}</div>`:'';
  return `
  <div class="card">${podium(rk)}</div>
  ${isAdm()?`<div class="fab-row" style="margin-top:12px"><button class="btn seal" id="givePts" type="button">Lançar pontos</button><button class="btn ghost" id="takePts" type="button">Registrar infração</button></div>`:`<button class="btn ghost block" style="margin-top:12px" id="quickReport" type="button">Fiz uma tarefa (vai para aprovação)</button>`}
  ${approvals}<div class="sec-h"><h3>Classificação</h3><span class="muted" style="font-size:13px">${ALL.length} congressistas</span></div>
  <div class="card rank" style="padding-block:4px">${rk.map((r,i)=>`<div class="rk ${r.id===S.me?"me-row":""}"><span class="pos">${i+1}</span>${av(r.id)}<div><div class="nm">${esc(P[r.id].nick)}</div><div class="sub">${r.n} lançamentos</div></div><span class="score">${r.s}</span></div>`).join("")}</div>
  <div class="sec-h"><h3>Últimos lançamentos</h3></div>
  <div class="card" style="padding-block:4px">${log.map(x=>`<div class="log">${av(x.who,"sm")}<div><b>${esc(first(x.who))}</b> · ${esc(x.why)}<div class="muted" style="font-size:12px">${esc(x.at)}</div></div>${pts(x.d)}</div>`).join("")}</div>
  <div class="sec-h"><h3>Tabela de pontos</h3></div>
  <div class="card rules">
    <div><h4 style="color:var(--good)">Somam</h4><ul>${RULES.plus.map(([n,v])=>`<li><span>${n}</span><span class="pts pos">+${v}</span></li>`).join("")}</ul></div>
    <div><h4 style="color:var(--bad)">Tiram</h4><ul>${RULES.minus.map(([n,v])=>`<li><span>${n}</span><span class="pts neg">${v}</span></li>`).join("")}<li><span>Não votar até meio-dia (automático)</span><span class="pts neg">−5</span></li></ul></div>
  </div>`;
}

function viewContas(){
  const seg = `<div class="seg" role="tablist">${[["despesas","Gastos"],["acerto","Quem paga quem"],["orcamento","Orçamento"]].map(([k,l])=>`<button type="button" data-seg="${k}" aria-pressed="${contasSeg===k}">${l}</button>`).join("")}</div>`;
  const total=S.exps.reduce((a,e)=>a+e.amount,0);
  let body="";
  if(contasSeg==="despesas"){
    const b=balances()[S.me];
    body=`<div class="card row" style="margin-top:12px"><div class="grow"><div class="eyebrow">Total gasto</div><div class="bigfig num">${brl0(total)}</div><div class="muted" style="font-size:13px">${brl(total/ALL.length)} por pessoa em média</div></div><button class="btn" id="quickExp" type="button">Lançar gasto</button></div>
    <div class="card row" style="margin-top:10px">${av(S.me)}<div class="grow"><b>Seu saldo</b><div class="muted" style="font-size:13px">${b>=0?"os outros te devem":"você deve ao grupo"}</div></div><span class="money" style="color:${b>=0?"var(--good)":"var(--bad)"}">${b>=0?"+":"−"} ${brl(Math.abs(b))}</span></div>
    <div class="sec-h"><h3>Gastos lançados</h3></div>
    <div class="card" style="padding-block:4px">${[...S.exps].reverse().map(e=>`<div class="exp">${av(e.payer)}<div style="min-width:0"><div class="t">${esc(e.title)}</div><div class="s">${esc(first(e.payer))} pagou · dividido por ${e.split.length===ALL.length?"todos":e.split.length} · ${CATS.find(c=>c.id===e.cat).name}</div></div><span class="money">${brl(e.amount)}</span></div>`).join("")}</div>`;
  }
  if(contasSeg==="acerto"){
    const st=settle(), b=balances();
    body=`<p class="muted" style="font-size:14px;margin:14px 0 0">O menor número de Pix possível para zerar tudo no check-out.</p>
    <div class="card" style="margin-top:10px;padding-block:4px">${st.length?st.map(x=>`<div class="settle" style="${x.from===S.me||x.to===S.me?"font-weight:700":""}">${av(x.from,"sm")}<span>${esc(first(x.from))}</span><span class="arrow">→</span><span>${av(x.to,"sm")} ${esc(first(x.to))}</span><span class="money">${brl(x.v)}</span></div>`).join(""):`<div class="empty">Tudo acertado.</div>`}</div>
    <div class="sec-h"><h3>Saldo de cada um</h3></div>
    <div class="card" style="padding-block:6px">${ALL.map(id=>({id,v:b[id]})).sort((a,c)=>c.v-a.v).map(r=>`<div class="bal">${av(r.id,"sm")}<span>${esc(P[r.id].nick)}</span><span class="money ${r.v>=0?"pos":"neg"}">${r.v>=0?"+":"−"} ${brl(Math.abs(r.v))}</span></div>`).join("")}</div>`;
  }
  if(contasSeg==="orcamento"){
    const percent=S.budget>0?total/S.budget*100:0, pct=Math.min(100,percent), left=S.budget-total;
    body=`<div class="card" style="margin-top:12px">
      <div class="eyebrow">Orçamento do congresso</div>
      <div class="row" style="align-items:baseline;margin:6px 0 10px"><div class="bigfig num">${brl0(total)}</div><span class="muted">de ${brl0(S.budget)}</span></div>
      <div class="bar ${total>S.budget?"over":""}"><i style="width:${pct}%"></i></div>
      <div class="row" style="justify-content:space-between;margin-top:8px;font-size:14px"><span class="muted">${S.budget>0?Math.round(percent)+"% usado":"Orçamento não definido"}</span><b style="color:${left>=0?"var(--good)":"var(--bad)"}">${left>=0?`Sobram ${brl0(left)}`:`Estourou ${brl0(-left)}`}</b></div>
      <div class="muted" style="font-size:13px;margin-top:6px">Por pessoa: ${brl0(total/ALL.length)} gastos de ${brl0(S.budget/ALL.length)} previstos</div>
      ${isAdm()?`<button class="btn sm ghost" style="margin-top:12px" id="editBudget" type="button">Ajustar orçamento (ADM)</button>`:""}
    </div>
    <div class="sec-h"><h3>Por categoria</h3></div>
    <div class="card" style="padding-block:4px">${CATS.map(c=>{const s=S.exps.filter(e=>e.cat===c.id).reduce((a,e)=>a+e.amount,0);return `<div class="cat"><b>${c.name}</b><span class="money" style="font-size:14px">${brl0(s)} <span class="muted" style="font-weight:500">/ ${brl0(c.budget)}</span></span><div class="bar ${s>c.budget?"over":""}"><i style="width:${Math.min(100,s/c.budget*100)}%"></i></div></div>`}).join("")}</div>`;
  }
  return seg+body;
}

function caseCard(item,pending=false){
 const photo=S.casePhotos?.[item.id];
 return `<article class="shame">
 ${photo?`<img class="case-photo" src="${esc(photo)}" alt="Foto da denúncia contra ${esc(first(item.who))}" loading="lazy">`:item.hasPhoto?`<div class="case-photo-placeholder" ${S.photoErrors?.[item.id]?'':`data-photo-id="${esc(item.id)}"`}>${av(item.who,'lg')}${S.photoErrors?.[item.id]?`<button class="link" data-photo-retry="${esc(item.id)}" type="button">Tentar carregar foto</button>`:'<span class="muted">Carregando foto…</span>'}</div>`:av(item.who,'xl')}
 <h3>${esc(item.what)}</h3><div class="row" style="margin-top:10px"><b class="grow">${esc(first(item.who))}</b>${pending?'':pts(-15)}</div>
 ${pending?`<div class="fab-row" style="margin-top:14px"><button class="btn sm seal" data-judge="${esc(item.id)}" data-v="ok" type="button">Condenar (−15)</button><button class="btn sm ghost" data-judge="${esc(item.id)}" data-v="no" type="button">Absolver</button></div>`:''}
 </article>`;
}
function viewMural(){
 const list=S.shame.filter(s=>s.status==='ok').slice().reverse();
 if(S.loaded&&!S.loaded['cases-mural'])return '<h2 class="page-title">Mural da Vergonha</h2><p role="status">Carregando…</p>';
 return `<button class="link" data-go="inicio" type="button">← Início</button><h2 class="page-title">Mural da Vergonha</h2>
 ${list.length?`<div class="stack">${list.map(s=>caseCard(s)).join('')}</div>`:'<p class="muted">Ninguém no mural.</p>'}${S.muralHasMore?`<button class="btn ghost block" id="olderMural" type="button" ${S.muralLoadingOlder?'disabled':''}>${S.muralLoadingOlder?'Carregando…':'Ver mais'}</button>`:''}`;
}
function viewTribunal(){
 if(!isAdm())return '';
 const list=S.shame.filter(s=>s.status==='pend').slice().reverse();
 if(S.loaded&&!S.loaded['cases-tribunal'])return '<h2 class="page-title">Julgar denúncias</h2><p role="status">Carregando…</p>';
 return `<button class="link" data-go="inicio" type="button">← Início</button><h2 class="page-title">Julgar denúncias</h2>
 ${list.length?`<div class="stack">${list.map(s=>caseCard(s,true)).join('')}</div>`:'<p class="muted">Nenhuma denúncia pendente.</p>'}`;
}

function todayNum(){ const t=now(); const d=new Date(t).getDate(); return DAYS.some(x=>x.d===d)?d:null; }

function viewQuerido(){
  const d = dayKey();
  if(!S.querido[d]) S.querido[d] = Object.fromEntries(ALL.map(id=>[id,{}]));
  const voted = (S.qvoted[d]||[]).includes(S.me);
  const res = S.querido[d];
  const total = id => Object.values(res[id]||{}).reduce((a,b)=>a+b,0);
  const top = em => ALL.map(id=>({id,n:(res[id]||{})[em]||0})).sort((a,b)=>b.n-a.n)[0];
  const highlights = [["❤️","Mais amado"],["🐍","Mais cobra"],["🍪","Mais biscoiteiro"],["🎯","Mais alvo"]].map(([em,l])=>{const t=top(em);return t.n?`<div class="qhl">${av(t.id)}<div><div class="eyebrow">${l}</div><b>${esc(first(t.id))}</b> <span class="qn">${em} ${t.n}</span></div></div>`:""}).join("");
  const others = ALL.filter(id=>id!==S.me);
  const form = voted || !votingOpen() ? "" : `
    <div class="card"><div class="eyebrow">Votação de ${new Date().toLocaleDateString("pt-BR")}</div>
      <h2 class="qtitle">Dê um emoji para cada congressista</h2>
      <p class="muted" style="margin:6px 0 0;font-size:14px">Vote até meio-dia (São Paulo). Não preencher custa 5 pontos. As escolhas são anônimas.</p>
    </div>
    <div class="card" style="margin-top:12px;padding-block:4px">${others.map(id=>`<div class="qrow">
      <div class="row">${av(id,"sm")}<b class="grow">${esc(P[id].nick)}</b>${qDraft[id]?`<span class="qpick">${qDraft[id]}</span>`:""}</div>
      <div class="emo" role="group" aria-label="Emoji para ${esc(P[id].nick)}">${EMOJIS.map(em=>`<button type="button" data-q="${id}" data-em="${em}" aria-pressed="${qDraft[id]===em}">${em}</button>`).join("")}</div>
    </div>`).join("")}</div>
    <button class="btn seal block" style="margin-top:14px" id="qSend" type="button">Enviar votos (${Object.keys(qDraft).filter(k=>others.includes(k)).length} de ${others.length})</button>`;
  const results = `
    <div class="sec-h"><h3>Resultado de hoje</h3><span class="muted" style="font-size:13px">${S.voterCount} votantes</span></div>
    ${highlights?`<div class="card qhls">${highlights}</div>`:""}
    <div class="card" style="margin-top:12px;padding-block:4px">${ALL.slice().sort((a,b)=>((res[b]||{})["❤️"]||0)-((res[a]||{})["❤️"]||0)).map(id=>{
      const c=res[id]||{}; const chips=EMOJIS.filter(em=>c[em]).sort((a,b)=>c[b]-c[a]).map(em=>`<span class="qchip">${em}<b>${c[em]}</b></span>`).join("");
      return `<div class="qres ${id===S.me?"me-row":""}">${av(id)}<div style="min-width:0"><div class="nm">${esc(P[id].nick)}</div><div class="qchips">${chips||'<span class="muted" style="font-size:13px">sem votos ainda</span>'}</div></div><span class="muted num" style="font-size:13px">${total(id)}</span></div>`}).join("")}</div>`;
  return (!votingOpen()&&!voted?`<div class="card"><h2>Votação fechada</h2><p>De quinta, 19/11, a domingo, 22/11, da meia-noite até antes das 12h (São Paulo).</p><p class="muted">Não preencher até meio-dia: −5 pontos por dia.</p></div>`:voted?`<div class="card row"><span class="emo-strip" aria-hidden="true">✅</span><div class="grow">Seus votos de hoje foram enviados.</div></div>`:form) + results;
}

function viewFofoca(){
  return `<h2 class="page-title">Chat anônimo</h2>
  ${S.loaded&&!S.loaded.chat?'<p role="status" class="muted">Carregando mensagens…</p>':''}
  ${S.chatHasMore?`<button class="btn ghost block" id="olderChat" type="button" ${S.chatLoadingOlder?'disabled':''}>${S.chatLoadingOlder?'Carregando…':'Ver mensagens anteriores'}</button>`:''}
  <div class="chat" id="chatList">${S.chat.map(m=>`<div class="bubble ${m.mine?"mine":""}">
    <div class="who">${m.mine?"Você (anônimo)":"Anônimo"} · ${esc(m.at)}</div>
    <div>${esc(m.text)}</div>
    ${isAdm()&&!m.mine?`<button class="link del" data-del="${esc(m.id)}" type="button">apagar</button>`:""}
  </div>`).join("")}</div>
  <form class="composer" id="chatForm"><input id="chatIn" maxlength="280" autocomplete="off" placeholder="Solta a fofoca…" aria-label="Mensagem anônima"><button class="btn seal" type="submit">Enviar</button></form>`;
}

/* ===================== FOLHAS ===================== */
function sheet(html, onMount){
  const s=document.createElement("div"); s.className="scrim";
  s.innerHTML=`<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  s.addEventListener("click",e=>{ if(e.target===s||e.target.closest("[data-close]")) s.remove(); });
  document.body.appendChild(s); onMount&&onMount(s);
  return s;
}
const personOpts = (sel)=>PEOPLE.map(p=>`<option value="${p.id}" ${p.id===sel?"selected":""}>${esc(p.nick)}</option>`).join("");

function sheetPoints(neg){
 if(!isAdm())return;
 const opts=(neg?RULES.minus:RULES.plus.concat([["Jogo: 1º lugar",20],["Jogo: 2º lugar",10],["Participação",5]])).filter(o=>typeof o[1]==='number');
 sheet(`<h3>${neg?'Registrar infração':'Lançar pontos'}</h3><div class="stack">
 <label class="f">Congressista<select id="spWho">${personOpts()}</select></label>
 <label class="f">Motivo<select id="spWhy">${opts.map(([n,v])=>`<option value="${v}">${n} (${v>0?'+':''}${v})</option>`).join('')}</select></label>
 <label class="f">Pontos<input id="spVal" type="number" min="-100" max="100" step="1" inputmode="numeric"></label>
 <button class="btn seal block" id="spOk" type="button">Confirmar pontos</button><button class="btn ghost block" data-close type="button">Cancelar</button></div>`,s=>{
 const w=s.querySelector('#spWhy'),v=s.querySelector('#spVal');v.value=w.value;w.onchange=()=>v.value=w.value;
 s.querySelector('#spOk').onclick=()=>act(s.querySelector('#spOk'),async()=>{
  const d=Number(v.value);if(!Number.isInteger(d)||!d||Math.abs(d)>100)throw Error('Use pontos inteiros entre −100 e 100, diferentes de zero.');
  await backend.addPoints({who:s.querySelector('#spWho').value,d,why:w.options[w.selectedIndex].text.replace(/ \(.*\)$/,''),kind:neg?'inf':'aux'});s.remove();toast('Pontos lançados');
 });});
}
function sheetTask(){
 sheet(`<h3>Fiz uma tarefa</h3><p class="muted">Um organizador aprova antes de os pontos entrarem no placar.</p><div class="stack">
 <label class="f">Tarefa<select id="tkWhy">${RULES.plus.filter(o=>typeof o[1]==='number').map(([n,v])=>`<option value="${v}">${n} (+${v})</option>`).join('')}</select></label>
 <button class="btn block" id="tkOk" type="button">Enviar para aprovação</button><button class="btn ghost block" data-close type="button">Cancelar</button></div>`,s=>{
 s.querySelector('#tkOk').onclick=()=>act(s.querySelector('#tkOk'),async()=>{const w=s.querySelector('#tkWhy');await backend.submitTask({d:+w.value,why:w.options[w.selectedIndex].text.replace(/ \(.*\)$/,'')});s.remove();toast('Tarefa enviada para aprovação');});});
}
function sheetExpense(){
 let split=new Set(ALL);
 sheet(`<h3>Lançar gasto</h3><div class="stack">
 <label class="f">O que foi<input id="exT" maxlength="120" placeholder="Ex.: gelo e limão"></label>
 <label class="f">Valor (R$)<input id="exV" type="number" inputmode="decimal" min="0.01" max="1000000" step="0.01" placeholder="0,00"></label>
 <label class="f">Quem pagou<select id="exP">${personOpts(S.me)}</select></label>
 <label class="f">Categoria<select id="exC">${CATS.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></label>
 <div><span>Dividir entre <button class="link" id="exAll" type="button">todos / ninguém</button></span>
 <div class="pick" id="exS">${PEOPLE.map(p=>`<button type="button" data-id="${p.id}" aria-pressed="true">${av(p.id)}<span>${esc(p.nick)}</span></button>`).join('')}</div></div>
 <button class="btn seal block" id="exOk" type="button">Lançar gasto</button><button class="btn ghost block" data-close type="button">Cancelar</button></div>`,s=>{
 const sync=()=>s.querySelectorAll('#exS button').forEach(b=>b.setAttribute('aria-pressed',split.has(b.dataset.id)));
 s.querySelector('#exS').onclick=e=>{const b=e.target.closest('button');if(!b)return;const id=b.dataset.id;split.has(id)?split.delete(id):split.add(id);sync();};
 s.querySelector('#exAll').onclick=()=>{split=split.size?new Set():new Set(ALL);sync();};
 s.querySelector('#exOk').onclick=()=>act(s.querySelector('#exOk'),async()=>{
 const title=s.querySelector('#exT').value.trim(),amount=Number(s.querySelector('#exV').value.replace(',','.'));
 if(!title||!Number.isFinite(amount)||amount<=0||amount>1000000)throw Error('Preencha o gasto e um valor válido.');
 if(!split.size)throw Error('Escolha com quem dividir.');
 await backend.addExpense({title,amount,payer:s.querySelector('#exP').value,cat:s.querySelector('#exC').value,split:[...split]});s.remove();toast('Gasto lançado');
 });});
}
function sheetReport(){
 let photo='',photoJob=0;
 sheet(`<h3>Fazer denúncia</h3><div class="stack">
 <label class="f">Denunciado<select id="rpW">${PEOPLE.filter(p=>p.id!==S.me).map(p=>`<option value="${p.id}">${esc(p.nick)}</option>`).join('')}</select></label>
 <label class="f">Título da denúncia<input id="rpT" maxlength="500" placeholder="O que aconteceu?"></label>
 <label class="f">Foto (opcional)<input id="rpPhoto" type="file" accept="image/*"></label>
 <div id="rpPreview" hidden><img class="case-preview" alt="Foto anexada"><button class="link" id="rpRemove" type="button">Remover foto</button></div>
 <p class="muted" role="status" id="rpStatus" style="margin:0;font-size:13px"></p>
 <button class="btn seal block" id="rpOk" type="button">Enviar denúncia</button><button class="btn ghost block" data-close type="button">Cancelar</button></div>`,s=>{
 const input=s.querySelector('#rpPhoto'),button=s.querySelector('#rpOk'),preview=s.querySelector('#rpPreview'),status=s.querySelector('#rpStatus');
 input.onchange=async()=>{
  const job=++photoJob;photo='';preview.hidden=true;
  if(!input.files[0])return;
  button.disabled=true;status.textContent='Preparando foto…';
  try{const result=await prepareReportPhoto(input.files[0]);if(job!==photoJob)return;photo=result;preview.querySelector('img').src=photo;preview.hidden=false;status.textContent='';}
  catch(e){if(job===photoJob){input.value='';status.textContent=e.message;}}
  finally{if(job===photoJob)button.disabled=false;}
 };
 s.querySelector('#rpRemove').onclick=()=>{++photoJob;photo='';input.value='';preview.hidden=true;status.textContent='';button.disabled=false;};
 button.onclick=()=>act(button,async()=>{
  const what=s.querySelector('#rpT').value.trim();if(!what)throw Error('Preencha o título da denúncia.');
  await backend.addCase({who:s.querySelector('#rpW').value,what},photo);s.remove();toast('Denúncia enviada para julgamento');
 });});
}

function sheetMe(){
 sheet(`<div class="badge" style="margin-bottom:14px"><div class="lanyard"><span>CREDENCIAL</span><span>${isAdm()?'ORGANIZAÇÃO':'CONGRESSISTA'}</span></div>
 <div class="body row">${av(S.me,'xl')}<div><h3 style="margin:0">${esc(first(S.me))}</h3><div class="muted">${score(S.me)} pontos</div></div></div></div>
 <div class="stack">${isAdm()?`<div class="eyebrow">Painel do ADM</div>
 <button class="btn block" data-a="give" type="button">Lançar pontos</button><button class="btn ghost block" data-a="take" type="button">Registrar infração</button>
 <button class="btn ghost block" data-a="tribunal" type="button">Julgar denúncias</button><button class="btn ghost block" data-a="budget" type="button">Ajustar orçamento</button>`:''}
 <button class="btn ghost block" data-a="out" type="button">Sair / trocar de congressista</button></div>`,s=>{
 s.onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;
 if(a==='out'){act(b,async()=>{await backend.logout();s.remove();});return;}s.remove();
 if(a==='give')sheetPoints(false);if(a==='take')sheetPoints(true);if(a==='tribunal')go('tribunal');if(a==='budget')sheetBudget();};});
}
function sheetBudget(){
 if(!isAdm())return;
 sheet(`<h3>Orçamento total</h3><div class="stack"><label class="f">Valor (R$)<input id="bgV" type="number" inputmode="decimal" min="0" max="1000000" step="0.01" value="${S.budget}"></label>
 <button class="btn block" id="bgOk" type="button">Salvar</button><button class="btn ghost block" data-close type="button">Cancelar</button></div>`,s=>{
 s.querySelector('#bgOk').onclick=()=>act(s.querySelector('#bgOk'),async()=>{const budget=Number(s.querySelector('#bgV').value);if(!Number.isFinite(budget)||budget<0||budget>1000000)throw Error('Use um valor entre 0 e 1.000.000.');await backend.setBudget(budget);s.remove();toast('Orçamento atualizado');});});
}
function sheetActivity(){
 if(!isAdm())return;
 sheet(`<h3>Nova sessão</h3><div class="stack">
 <label class="f">Dia<select id="acD">${DAYS.map(d=>`<option value="${d.d}" ${d.d===day?'selected':''}>${d.wd} ${d.d}/11</option>`).join('')}</select></label>
 <label class="f">Horário<input id="acT" type="time" value="18:00"></label><label class="f">Título<input id="acN" maxlength="120"></label>
 <label class="f">Pontos (opcional)<input id="acP" type="number" min="0" max="100" step="1" inputmode="numeric"></label><label class="f">Preparação (opcional)<input id="acR" maxlength="500"></label>
 <button class="btn block" id="acOk" type="button">Adicionar à programação</button><button class="btn ghost block" data-close type="button">Cancelar</button></div>`,s=>{
 s.querySelector('#acOk').onclick=()=>act(s.querySelector('#acOk'),async()=>{const d=+s.querySelector('#acD').value,t=s.querySelector('#acT').value,title=s.querySelector('#acN').value.trim();if(!title||!t)throw Error('Preencha título e horário.');const pts=+s.querySelector('#acP').value||0;if(!Number.isInteger(pts)||pts<0||pts>100)throw Error('Use pontos inteiros entre 0 e 100.');
 const [h,m]=t.split(':').map(Number),start=new Date(`2026-11-${String(d).padStart(2,'0')}T${t}:00-03:00`).getTime();await backend.addSession({d,t,title,place:'',pts,prep:s.querySelector('#acR').value.trim(),note:'',start,end:start+90*60000});day=d;s.remove();toast('Sessão adicionada');});});
}

function stamp(){ const t=now(); return `${dayOf(t)?.wd||""} ${fmtTime(t)}`.trim(); }

/* ===================== RENDER ===================== */
const ICONS={
  inicio:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  programa:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  placar:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  contas:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
  querido:'<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  fofoca:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
};
const LABELS={inicio:"Início",programa:"Agenda",placar:"Placar",querido:"Queridômetro",contas:"Contas",fofoca:"Fofoca"};

function go(t){ if(t==="tribunal"&&!isAdm())return;tab=t; try{localStorage.setItem("xvi-tab",t);}catch(e){} render(); scrollTo({top:0}); }

function render(){
  backend.setView?.(tab);
  if(!S.ready){$('#root').innerHTML=`<div class="app login">${loader()}<h2>Conectando ao congresso…</h2><p class="muted" role="status">${esc(S.error||'Carregando seus dados.')}</p>${S.error?'<button class="btn" id="retry" type="button">Tentar novamente</button>':''}</div>`;const retry=$('#retry');if(retry)retry.onclick=()=>location.reload();return;}
  if(!S.me || !P[S.me]){ viewLogin(); return; }
  const body = ({inicio:viewInicio,programa:viewPrograma,placar:viewPlacar,querido:viewQuerido,contas:viewContas,fofoca:viewFofoca,mural:viewMural,tribunal:viewTribunal}[tab]||viewInicio)();
  $("#root").innerHTML = `<div class="app">${header()}${S.error?`<p role="alert">${esc(S.error)}</p><button class="link" id="retrySync" type="button">Tentar novamente</button>`:""}<main>${body}</main>
    </div>
    <nav class="tabs" aria-label="Seções"><div class="tabs-in">${Object.keys(LABELS).map(k=>`<button type="button" data-go="${k}" aria-label="${LABELS[k]}" ${k===tab?'aria-current="page"':""}><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg><span class="tab-label">${k==="querido"?"Queri<br>dômetro":LABELS[k]}</span></button>`).join("")}</div></nav>`;
  for(const id of busyActions){const button=document.getElementById?.(id);if(button)button.disabled=true;}
  tick();watchCasePhotos();
}

let photoObserver;
function watchCasePhotos(){
 photoObserver?.disconnect();
 if(!['mural','tribunal'].includes(tab))return;
 const nodes=[...document.querySelectorAll('[data-photo-id]')];
 if(typeof IntersectionObserver==='undefined'){nodes.slice(0,3).forEach(node=>backend.loadCasePhoto?.(node.dataset.photoId));return;}
 photoObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){photoObserver.unobserve(entry.target);backend.loadCasePhoto?.(entry.target.dataset.photoId)}},{rootMargin:'160px'});
 nodes.forEach(node=>photoObserver.observe(node));
}
function selectAgendaDay(next){
 if(next===day)return;
 const y=scrollY;day=next;render();scrollTo(0,y);
 const strip=$('.days'),selected=$(`[data-day="${day}"]`);
 if(strip&&selected)strip.scrollTo({left:strip.scrollLeft+selected.getBoundingClientRect().left-strip.getBoundingClientRect().left-(strip.clientWidth-selected.offsetWidth)/2,behavior:'smooth'});
}
bindAgendaSwipe(document,()=>tab==='programa'&&S.ready&&!!S.me,direction=>selectAgendaDay(adjacentDay(DAYS.map(d=>d.d),day,direction)));
document.addEventListener('click',e=>{
 if(e.target.closest('.scrim'))return;
 const pr=e.target.closest('[data-photo-retry]');if(pr){backend.loadCasePhoto(pr.dataset.photoRetry,true);return;}
 const g=e.target.closest('[data-go]');if(g){go(g.dataset.go);return;}
 const d=e.target.closest('[data-day]');if(d){selectAgendaDay(+d.dataset.day);return;}
 const q=e.target.closest('[data-q]');if(q){qDraft[q.dataset.q]=qDraft[q.dataset.q]===q.dataset.em?undefined:q.dataset.em;if(!qDraft[q.dataset.q])delete qDraft[q.dataset.q];const y=scrollY;render();scrollTo(0,y);return;}
 const sg=e.target.closest('[data-seg]');if(sg){contasSeg=sg.dataset.seg;render();return;}
 const task=e.target.closest('[data-task]');if(task){act(task,async()=>{await backend.reviewTask(task.dataset.task,task.dataset.approve==='yes');toast('Tarefa julgada');});return;}
 const dl=e.target.closest('[data-del]');if(dl){act(dl,async()=>{await backend.deleteChat(dl.dataset.del);toast('Mensagem apagada');});return;}
 const j=e.target.closest('[data-judge]');if(j){act(j,async()=>{await backend.judgeCase(j.dataset.judge,j.dataset.v==='ok');toast('Julgamento registrado');});return;}
 const button=e.target.closest('button'),id=button?.id;
 ({retrySync:()=>backend.retrySync(),olderChat:()=>act(button,()=>backend.loadOlderChat()),olderMural:()=>act(button,()=>backend.loadOlderMural()),meBtn:sheetMe,quickReport:sheetTask,quickExp:sheetExpense,givePts:()=>sheetPoints(false),takePts:()=>sheetPoints(true),report:sheetReport,homeReport:sheetReport,editBudget:sheetBudget,addAct:sheetActivity,
 qSend:()=>act(button,async()=>{await backend.vote({...qDraft});qDraft={};toast('Votos enviados, anonimamente');}),
 clockBtn:()=>{if(!isAdm())return;demo=!demo;render();toast(demo?'Relógio de demonstração: sexta 15:40':'Demonstração encerrada');}})[id]?.();
});

function tick(){
  const c=$("#clock"); if(c){ const t=now(); c.textContent=`${dayOf(t)?dayOf(t).wd+" "+new Date(t).getDate()+"/11":new Date(t).toLocaleDateString("pt-BR")} ${new Date(t).toLocaleTimeString("pt-BR")}`; }
  const box=$("#count"); const {nxt}=nextItem();
  if(box&&nxt){ let s=Math.max(0,Math.floor((nxt.start-now())/1000)); const dd=Math.floor(s/86400); s%=86400; const h=Math.floor(s/3600); s%=3600; const m=Math.floor(s/60); s%=60;
    const parts = dd?[[dd,"dias"],[h,"h"],[m,"min"]]:[[h,"h"],[m,"min"],[s,"seg"]];
    box.innerHTML=parts.map(([v,l])=>`<div><b>${String(v).padStart(2,"0")}</b><span>${l}</span></div>`).join(""); }
}
document.addEventListener('submit',e=>{
 if(e.target.id!=='chatForm')return;e.preventDefault();
 const input=$('#chatIn'),text=input.value.trim();if(!text)return;
 act(e.target.querySelector('button'),async()=>{await backend.sendChat(text);if($('#chatIn')?.value.trim()===text)$('#chatIn').value='';$('#chatIn')?.focus();});
});
let votingPhase=votingOpen();
setInterval(()=>{tick();const phase=votingOpen();if(phase!==votingPhase){votingPhase=phase;render();}},1000);
render();
backend.start(data=>{
 const chat=$('#chatIn'),draft=chat?.value,focused=document.activeElement===chat,position=chat?.selectionStart;
 const previous=S.me;S=data;if(!S.admin)demo=false;if(previous!==S.me)qDraft={};
 AGENDA.splice(0,AGENDA.length,...(data.agenda||[]));
 const y=scrollY;render();scrollTo(0,y);
 if(draft && $('#chatIn')){$('#chatIn').value=draft;if(focused){$('#chatIn').focus();$('#chatIn').setSelectionRange(position,position);}}
}).catch(e=>{S.ready=true;S.error=backend.errorText(e);render();});
