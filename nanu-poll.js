import {createNanuPollData} from './nanu-poll-data.js?v=20261121r';
import {NANU_HOST,NANU_ACTIVE_VOTERS as NANU_VOTERS,NANU_TEST_MODE,nanuQuestion,cleanNanuText,nanuCloudWords,layoutNanuCloud} from './nanu-poll-model.js?v=20261121r';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const failText=error=>error?.code==='permission-denied'?'Reabra a enquete para atualizar seu acesso.':error?.code==='unavailable'?'Confira sua conexão e tente novamente.':error?.message||'Não foi possível carregar a enquete.';

export function openNanuPoll({onClose,onError}={}){
 const api=createNanuPollData(),host=api.who===NANU_HOST;
 const dialog=document.createElement('dialog');dialog.className='nanu-poll';dialog.setAttribute('aria-labelledby','nanu-poll-title');
 const state={session:undefined,round:undefined,mine:undefined,confirmed:false,responses:undefined,choice:'',draft:'',busy:false,error:''};
 const stops={main:null,round:null,mine:null,cloud:null};let activeQuestion=0,closed=false,lastRenderedQuestion=0;
 const stop=key=>{stops[key]?.();stops[key]=null;};
 function failed(error){if(closed)return;state.error=failText(error);state.busy=false;onError?.(error);render();}
 function watchRound(){const q=activeQuestion;if(!stops.round)stops.round=api.watchRound(q,value=>{if(closed||activeQuestion!==q)return;state.round=value;render();},failed);}
 function watchCloud(){if(!stops.cloud)stops.cloud=api.watchCloud(value=>{if(closed||activeQuestion!==11)return;state.responses=value;render();},failed);}
 function syncQuestion(){
  if(closed||document.hidden)return;
  const q=state.session?.question||0;
  if(q!==activeQuestion){
   for(const key of ['round','mine','cloud'])stop(key);activeQuestion=q;
   Object.assign(state,{round:undefined,mine:undefined,confirmed:false,responses:undefined,choice:'',draft:'',error:''});
  }
  if(!nanuQuestion(q))return;
  if(host){watchRound();if(q===11)watchCloud();}
  else if(!stops.mine)stops.mine=api.watchMine(q,(value,confirmed)=>{
   if(closed||activeQuestion!==q)return;
   state.mine=value;state.confirmed=confirmed;
   if(value&&confirmed){watchRound();if(q===11)watchCloud();}
   render();
  },failed);
 }
 function resume(){
  if(closed||document.hidden)return;
  if(!stops.main)stops.main=api.watchSession(value=>{if(closed)return;state.session=value;syncQuestion();render();},failed);
  syncQuestion();
 }
 function pause(){for(const key of Object.keys(stops))stop(key);}
 function close(){
  if(closed)return;closed=true;pause();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',resize);
  dialog.close();dialog.remove();onClose?.();
 }
 function visibility(){if(document.hidden)pause();else resume();}
 function resize(){if(activeQuestion===11&&(state.mine||host))render();}
 function bars(question){
  const r=state.round;if(!r)return '<p class="muted" role="status">Carregando respostas…</p>';
  return `<div class="nanu-tally" aria-live="polite">${question.options.map((label,i)=>{
   const letter='abc'[i],count=r[letter]||0,own=state.mine?.choice===letter;
   return `<div class="nanu-result ${own?'own':''}"><div class="row"><b>${letter.toUpperCase()}.</b><span class="grow">${esc(label)}</span><strong class="num">${count} ${count===1?'voto':'votos'}</strong></div><div class="nanu-bar" aria-hidden="true"><i style="width:${Math.round(count/Math.max(1,r.total)*100)}%"></i></div>${own?'<small>Sua escolha</small>':''}</div>`;
  }).join('')}</div>`;
 }
 function cloud(){
  if(!state.responses)return '<p class="muted" role="status">Preparando a nuvem…</p>';
  const words=nanuCloudWords(state.responses),width=Math.max(260,Math.min(752,window.innerWidth-64)),height=width<450?340:420;
  const placed=layoutNanuCloud(words,width,height),colors=['var(--seal)','var(--brass)','var(--ink)','var(--good)','var(--muted)'];
  return `<div class="nanu-cloud-panel"><svg id="nanu-cloud" viewBox="0 0 ${width} ${height}" role="img" aria-label="Nuvem de palavras dos palpites enviados">${placed.map((w,i)=>`<text x="${(w.x+w.w/2).toFixed(1)}" y="${(w.y+w.h*.75).toFixed(1)}" text-anchor="middle" font-size="${w.size}" font-weight="${w.count>1?800:600}" fill="${colors[i%colors.length]}"><title>${esc(w.label)}: ${w.count} ${w.count===1?'resposta':'respostas'}</title>${esc(w.label)}</text>`).join('')}</svg></div>
   <details class="nanu-originals"><summary>Ver respostas</summary><ul>${state.responses.map(r=>`<li>${esc(r.text)}</li>`).join('')}</ul></details>`;
 }
 function body(){
  if(state.session===undefined)return '<h2 id="nanu-poll-title">Apresentação do Nanu</h2><p class="muted" role="status">Carregando…</p>';
  if(!state.session)return `<h2 id="nanu-poll-title">Quiz e palpites</h2><p class="muted">Retrospectiva do meu An*</p>${host?'<p>Todo mundo pronto?</p><button class="btn seal block" data-nanu-start type="button">Liberar primeira pergunta</button>':'<p class="muted">Aguardando o Nanu liberar a primeira pergunta.</p>'}`;
  const q=state.session.question,question=nanuQuestion(q);if(!question)return '<p class="muted">Reabra a enquete.</p>';
  let content='';
  if(host||state.mine&&state.confirmed){
   content=q===11?cloud():bars(question);
   content+=`<p class="nanu-progress num" aria-live="polite">${state.round?.total??0} de ${NANU_VOTERS.length} ${NANU_VOTERS.length===1?"resposta":"respostas"}</p>`;
   if(host&&q<11)content+=`<button class="btn seal block" data-nanu-next type="button" ${state.busy||state.round?.total!==NANU_VOTERS.length?'disabled':''}>${q===10?'Liberar última pergunta':'Próxima pergunta'}</button>${state.round?.total!==NANU_VOTERS.length?'<p class="muted nanu-wait">Aguardando todos responderem.</p>':''}`;
   else if(q<11)content+='<p class="muted nanu-wait">O Nanu libera a próxima pergunta.</p>';
  }else if(state.mine===undefined||state.mine&&!state.confirmed){content='<p class="muted" role="status">'+(state.mine?'Enviando resposta…':'Carregando sua participação…')+'</p>';}
  else if(q===11){
   content=`<form data-nanu-answer><label class="f">Seu palpite<textarea id="nanu-open-answer" maxlength="140" rows="3" placeholder="Uma palavra ou frase curta" ${state.busy?'disabled':''}>${esc(state.draft)}</textarea></label><button class="btn seal block" type="submit" ${state.busy||!cleanNanuText(state.draft)?'disabled':''}>Enviar palpite</button></form>`;
  }else{
   content=`<form data-nanu-answer><div class="nanu-options" role="group" aria-label="Alternativas">${question.options.map((label,i)=>{
    const choice='abc'[i];return `<button class="nanu-choice" type="button" data-nanu-choice="${choice}" aria-pressed="${state.choice===choice}" ${state.busy?'disabled':''}><b>${choice.toUpperCase()}.</b><span>${esc(label)}</span></button>`;
   }).join('')}</div><button class="btn seal block" type="submit" ${state.busy||!state.choice?'disabled':''}>Enviar resposta</button></form>`;
  }
  return `<div class="row nanu-question-meta"><span class="eyebrow grow">${q<=6?'Quiz':q<=10?'Palpites':'Nuvem de palavras'}</span><span class="num">${q}/11</span></div><div class="nanu-step" aria-hidden="true"><i style="width:${q/11*100}%"></i></div><h2 id="nanu-poll-title">${esc(question.text)}</h2>${content}`;
 }
 function render(){
  if(closed)return;
  const input=dialog.querySelector('#nanu-open-answer'),focused=document.activeElement===input,start=input?.selectionStart,end=input?.selectionEnd;
  const choice=document.activeElement?.dataset?.nanuChoice,originals=dialog.querySelector('.nanu-originals')?.open;
  const scroll=activeQuestion===lastRenderedQuestion?dialog.scrollTop:0;lastRenderedQuestion=activeQuestion;
  dialog.innerHTML=`<div class="nanu-shell"><header class="nanu-top"><button class="link" data-nanu-close type="button">‹ Voltar</button><span class="eyebrow">${NANU_TEST_MODE?'Ensaio · Nanu e Bru':'Apresentação do Nanu'}</span></header><section class="nanu-content">${body()}${state.error?`<div class="nanu-error" role="alert">${esc(state.error)}<button class="link" data-nanu-retry type="button">Tentar novamente</button></div>`:''}</section></div>`;
  dialog.scrollTop=scroll;
  if(focused){const next=dialog.querySelector('#nanu-open-answer');next?.focus({preventScroll:true});if(next&&start!=null)next.setSelectionRange(start,end);}
  else if(choice)dialog.querySelector(`[data-nanu-choice="${choice}"]`)?.focus({preventScroll:true});
  if(originals&&dialog.querySelector('.nanu-originals'))dialog.querySelector('.nanu-originals').open=true;
 }
 async function run(action){
  if(state.busy)return;
  if(navigator.onLine===false){state.error='Conecte-se à internet para participar.';render();return;}
  state.busy=true;state.error='';render();
  try{await action();}catch(error){failed(error);}finally{state.busy=false;if(!closed)render();}
 }
 dialog.addEventListener('click',event=>{
  if(event.target.closest('[data-nanu-close]')){close();return;}
  if(event.target.closest('[data-nanu-retry]')){state.error='';pause();resume();render();return;}
  if(event.target.closest('[data-nanu-start]'))void run(()=>api.start());
  if(event.target.closest('[data-nanu-next]'))void run(()=>api.next(activeQuestion));
  const choice=event.target.closest('[data-nanu-choice]');if(choice&&!state.busy){state.choice=choice.dataset.nanuChoice;render();}
 });
 dialog.addEventListener('input',event=>{if(event.target.id!=='nanu-open-answer')return;state.draft=event.target.value;const submit=dialog.querySelector('[type="submit"]');if(submit)submit.disabled=state.busy||!cleanNanuText(state.draft);});
 dialog.addEventListener('submit',event=>{event.preventDefault();const q=activeQuestion;void run(()=>api.answer(q,q===11?state.draft:state.choice));});
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 document.addEventListener('visibilitychange',visibility);window.addEventListener('resize',resize);
 document.body.append(dialog);render();dialog.showModal();resume();
 return {close};
}
