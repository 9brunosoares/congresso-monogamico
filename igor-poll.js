import {createIgorPollData} from './igor-poll-data.js?v=20261121s';
import {IGOR_HOST,IGOR_VOTERS,igorQuestion,igorOptions,igorPayload,igorOptionLabel} from './igor-poll-model.js?v=20261121p';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const failText=e=>e?.code==='permission-denied'?'Reabra a enquete para atualizar seu acesso.':e?.code==='unavailable'?'Confira sua conexão e tente novamente.':e?.message||'Não foi possível carregar a enquete.';
const art=o=>o.image?`<img src="assets/igor-poll/${o.image}" alt="" width="300" height="300" loading="lazy" decoding="async">`:'';

export function openIgorPoll({onClose,onError}={}){
 const api=createIgorPollData(),host=api.who===IGOR_HOST;
 const dialog=document.createElement('dialog');dialog.className='nanu-poll igor-poll';dialog.setAttribute('aria-labelledby','igor-poll-title');
 const state={session:undefined,round:undefined,mine:undefined,confirmed:false,choice:'',year:0,busy:false,error:''};
 const stops={main:null,round:null,mine:null};let activeQuestion=0,closed=false,lastRenderedQuestion=0;
 const stop=key=>{stops[key]?.();stops[key]=null;};
 function failed(e){if(closed)return;state.error=failText(e);state.busy=false;onError?.(e);render();}
 function watchRound(){const q=activeQuestion;if(!stops.round)stops.round=api.watchRound(q,value=>{if(closed||activeQuestion!==q)return;state.round=value;render();},failed);}
 function syncQuestion(){
  if(closed||document.hidden)return;
  const q=state.session?.question||0;
  if(q!==activeQuestion){
   stop('round');stop('mine');activeQuestion=q;const question=igorQuestion(q);
   Object.assign(state,{round:undefined,mine:undefined,confirmed:false,choice:question?.min?'y'+question.min:'',year:question?.min||0,error:''});
  }
  if(!igorQuestion(q))return;
  if(host)watchRound();
  else if(!stops.mine)stops.mine=api.watchMine(q,(value,confirmed)=>{
   if(closed||activeQuestion!==q)return;
   state.mine=value;state.confirmed=confirmed;if(value&&confirmed)watchRound();render();
  },failed);
 }
 function resume(){if(closed||document.hidden)return;if(!stops.main)stops.main=api.watchSession(s=>{if(closed)return;state.session=s;syncQuestion();render();},failed);syncQuestion();}
 function pause(){for(const key of Object.keys(stops))stop(key);}
 function close(){if(closed)return;closed=true;pause();document.removeEventListener('visibilitychange',visibility);dialog.close();dialog.remove();onClose?.();}
 function visibility(){if(document.hidden)pause();else resume();}
 function results(question){
  if(!state.round)return '<p class="muted" role="status">Carregando respostas…</p>';
  const options=igorOptions(activeQuestion),counts=state.round.counts;
  const row=o=>{
   const count=counts[o.id]||0,own=state.mine?.choice===o.id;
   return `<div class="nanu-result ${own?'own':''} ${question.colors?'igor-'+o.id:''}"><div class="row">${art(o)}<span class="grow">${o.artist?`<b>${esc(o.artist)}</b><br>`:''}${esc(o.label)}</span><strong class="num">${count} ${count===1?'voto':'votos'}</strong></div><div class="nanu-bar" aria-hidden="true"><i style="width:${Math.round(count/Math.max(1,state.round.total)*100)}%"></i></div>${own?'<small>Sua escolha</small>':''}</div>`;
  };
  if(question.min){
   const visible=options.filter(o=>counts[o.id]>0||state.mine?.choice===o.id||o.id===question.special.id);
   const hidden=options.filter(o=>!visible.includes(o));
   return `<div class="nanu-tally" aria-live="polite">${visible.map(row).join('')}</div>${hidden.length?`<details class="nanu-originals"><summary>Ver todas as opções</summary>${hidden.map(row).join('')}</details>`:''}`;
  }
  return `<div class="nanu-tally" aria-live="polite">${options.map(row).join('')}</div>`;
 }
 function form(question){
  const q=activeQuestion,disabled=state.busy?'disabled':'';let fields;
  if(question.min){
   const special=state.choice===question.special.id;
   fields=`<div class="igor-range"><label for="igor-year">Daqui a</label><output id="igor-year-value" class="num" for="igor-year">${special?esc(question.special.label):state.year+' '+(state.year===1?'ano':'anos')}</output><div class="igor-range-controls"><div class="igor-range-track"><input id="igor-year" type="range" min="${question.min}" max="${question.max}" step="${question.step}" value="${state.year}" aria-valuetext="${state.year} anos" ${special||state.busy?'disabled':''}><div class="row muted num"><span class="grow">${question.min} ${question.min===1?'ano':'anos'}</span><span>${question.max} anos</span></div></div><button id="igor-special" class="nanu-choice igor-special" data-igor-special type="button" aria-pressed="${special}" ${disabled}>${esc(question.special.label)}</button></div></div>`;
  }else{
   const options=igorOptions(q),albums=!!options[0].image;
   fields=`<div class="nanu-options ${albums?'igor-albums':''}" role="group" aria-label="Alternativas">${options.map(o=>`<button class="nanu-choice ${question.colors?'igor-'+o.id:''}" type="button" data-igor-choice="${o.id}" aria-pressed="${state.choice===o.id}" ${disabled}>${art(o)}<span>${o.artist?`<b>${esc(o.artist)}</b><br>`:''}${esc(o.label)}</span></button>`).join('')}</div>`;
  }
  return `<form data-igor-answer>${fields}<button class="btn seal block" type="submit" ${state.busy||!igorPayload(q,state.choice)?'disabled':''}>Enviar resposta</button></form>`;
 }
 function body(){
  if(state.session===undefined)return '<h2 id="igor-poll-title">Apresentação do Igor</h2><p class="muted" role="status">Carregando…</p>';
  if(!state.session)return `<h2 id="igor-poll-title">Palpites do Igor</h2><p class="muted">Retrospectiva do meu An*</p>${host?'<p>Todo mundo pronto?</p><button class="btn seal block" data-igor-start type="button">Liberar primeira pergunta</button>':'<p class="muted">Aguardando o Igor liberar a primeira pergunta.</p>'}`;
  const q=state.session.question,question=igorQuestion(q);if(!question)return '<p class="muted">Reabra a enquete.</p>';
  let content;
  if(host||state.mine&&state.confirmed){
   content=results(question)+`<p class="nanu-progress num" aria-live="polite">${state.round?.total??0} de ${IGOR_VOTERS.length} respostas</p>`;
   if(host&&q<10)content+=`<button class="btn seal block" data-igor-next type="button" ${state.busy||state.round?.total!==IGOR_VOTERS.length?'disabled':''}>Próxima pergunta</button>${state.round?.total!==IGOR_VOTERS.length?'<p class="muted nanu-wait">Aguardando todos responderem.</p>':''}`;
   else if(q<10)content+='<p class="muted nanu-wait">O Igor libera a próxima pergunta.</p>';
   else if(state.round?.total===IGOR_VOTERS.length)content+='<p class="muted nanu-wait">Enquete concluída.</p>';
  }else if(state.mine===undefined||state.mine&&!state.confirmed)content='<p class="muted" role="status">'+(state.mine?'Enviando resposta…':'Carregando sua participação…')+'</p>';
  else content=form(question);
  return `<div class="row nanu-question-meta"><span class="eyebrow grow">Palpites</span><span class="num">${q}/10</span></div><div class="nanu-step" aria-hidden="true"><i style="width:${q*10}%"></i></div><h2 id="igor-poll-title">${esc(question.text)}</h2>${content}`;
 }
 function render(){
  if(closed)return;
  const focusId=document.activeElement?.id;
  const choice=document.activeElement?.dataset?.igorChoice,details=dialog.querySelector('details')?.open;
  const scroll=activeQuestion===lastRenderedQuestion?dialog.scrollTop:0;lastRenderedQuestion=activeQuestion;
  dialog.innerHTML=`<div class="nanu-shell"><header class="nanu-top"><button class="link" data-igor-close type="button">‹ Voltar</button><span class="eyebrow">Apresentação do Igor</span></header><section class="nanu-content">${body()}${state.error?`<div class="nanu-error" role="alert">${esc(state.error)}<button class="link" data-igor-retry type="button">Tentar novamente</button></div>`:''}</section></div>`;
  dialog.scrollTop=scroll;
  if(focusId)dialog.querySelector('#'+focusId)?.focus({preventScroll:true});
  else if(choice)dialog.querySelector(`[data-igor-choice="${choice}"]`)?.focus({preventScroll:true});
  if(details&&dialog.querySelector('details'))dialog.querySelector('details').open=true;
 }
 async function run(action){if(state.busy)return;if(navigator.onLine===false){state.error='Conecte-se à internet para participar.';render();return;}state.busy=true;state.error='';render();try{await action();}catch(e){failed(e);}finally{state.busy=false;if(!closed)render();}}
 dialog.addEventListener('click',event=>{
  if(event.target.closest('[data-igor-close]')){close();return;}
  if(event.target.closest('[data-igor-retry]')){state.error='';pause();resume();render();return;}
  if(event.target.closest('[data-igor-start]'))void run(()=>api.start());
  if(event.target.closest('[data-igor-next]'))void run(()=>api.next(activeQuestion));
  if(event.target.closest('[data-igor-special]')&&!state.busy){const question=igorQuestion(activeQuestion);state.choice=state.choice===question.special.id?'y'+state.year:question.special.id;render();}
  const choice=event.target.closest('[data-igor-choice]');if(choice&&!state.busy){state.choice=choice.dataset.igorChoice;render();}
 });
 dialog.addEventListener('input',event=>{
  if(event.target.id==='igor-year'){state.year=Number(event.target.value);state.choice='y'+state.year;const text=state.year+' '+(state.year===1?'ano':'anos');dialog.querySelector('#igor-year-value').textContent=text;event.target.setAttribute('aria-valuetext',text);}
  else return;
  const submit=dialog.querySelector('[type="submit"]');if(submit)submit.disabled=state.busy||!igorPayload(activeQuestion,state.choice);
 });
 dialog.addEventListener('submit',event=>{event.preventDefault();const q=activeQuestion,choice=state.choice;void run(()=>api.answer(q,choice));});
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});document.addEventListener('visibilitychange',visibility);
 document.body.append(dialog);render();dialog.showModal();resume();return {close};
}
