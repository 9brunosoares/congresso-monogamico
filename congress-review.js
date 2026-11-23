import {REVIEW_TOPICS,REVIEW_SUGGESTION,validReview,reviewSummary} from './congress-review-model.js?v=20261122n';
import {createCongressReviewData} from './congress-review-data.js?v=20261122n';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function openCongressReview({admin=false,onClose,onReviewed,api=createCongressReviewData()}={}){
 const dialog=document.createElement('dialog');dialog.className='congress-review';dialog.setAttribute('aria-labelledby','review-title');
 const ratings={};let text='',loading=true,busy=false,saved=false,error='',loadFailed=false,results=null,closed=false;
 function close(){if(closed)return;closed=true;dialog.close();dialog.remove();onClose?.();}
 function render(){
  if(closed)return;const scroll=dialog.scrollTop;
  let body=loading?'<p role="status">Carregando a pesquisa…</p>':loadFailed?'<p>Não foi possível carregar. Feche e reabra a pesquisa.</p>':saved?'<div class="review-thanks"><span aria-hidden="true">✦</span><h3>Obrigado por fazer parte.</h3><p>Sua avaliação foi enviada anonimamente. A COMORG agradece!</p></div>':`<p class="muted">Seis notas e espaço para sugestões. Suas respostas não levam seu nome.</p><p class="review-scale">1 estrela: ruim · 5 estrelas: excelente</p><form id="review-form">${REVIEW_TOPICS.map((t,i)=>`<fieldset class="review-topic"><legend><span class="num">0${i+1}</span> ${t.title}</legend><p class="muted">${t.detail}</p><div class="review-stars" role="group" aria-label="${t.title}">${[1,2,3,4,5].map(n=>`<button type="button" data-review-rate="${t.id}" data-value="${n}" aria-label="${t.title}: ${n} ${n===1?'estrela':'estrelas'}" aria-pressed="${ratings[t.id]===n}" class="${ratings[t.id]>=n?'filled':''}" ${busy?'disabled':''}><span aria-hidden="true">★</span></button>`).join('')}</div><button class="review-na" type="button" data-review-rate="${t.id}" data-value="0" aria-pressed="${ratings[t.id]===0}" ${busy?'disabled':''}>Não se aplica</button></fieldset>`).join('')}<label class="review-suggestion" for="review-text">${REVIEW_SUGGESTION}<small class="muted">Opcional · até 1.500 caracteres</small><textarea id="review-text" rows="5" maxlength="1500" placeholder="A COMORG está ouvindo…" ${busy?'disabled':''}>${esc(text)}</textarea></label><p class="muted review-privacy">As notas são somadas, sem guardar suas escolhas individuais. Sugestões chegam sem identificação; evite se identificar no texto. Um comprovante separado apenas impede envios repetidos.</p><button class="btn seal block" id="review-send" type="submit" ${busy?'disabled':''}>${busy?'Enviando…':'Enviar avaliação'}</button></form>`;
  if(!loading&&admin)body+=`<button class="btn ghost block review-results-button" data-review-results type="button" ${busy?'disabled':''}>${results?'Atualizar resultados':'Ver resultados · COMORG'}</button>`;
  if(results)body+=`<section class="review-results"><h3>O que a turma achou</h3><p class="muted">${results.voters} ${results.voters===1?'avaliação recebida':'avaliações recebidas'} · respostas anônimas</p>${reviewSummary(results).map(t=>`<div class="review-result"><b>${t.title}</b><strong class="num">${t.average===null?'—':t.average.toFixed(1).replace('.',',')}<small> / 5</small></strong><p class="muted">${t.rated} notas · ${t.counts[0]} não se aplica</p><div class="review-counts">${t.counts.slice(1).map((n,i)=>`<span>${i+1}★ <b>${n}</b></span>`).join('')}</div></div>`).join('')}<h3>Sugestões</h3>${Object.values(results.suggestions).length?Object.values(results.suggestions).map(s=>`<blockquote>${esc(s.text)}</blockquote>`).join(''):'<p class="muted">Nenhuma sugestão por enquanto.</p>'}</section>`;
  dialog.innerHTML=`<div class="review-shell"><header class="row"><span class="eyebrow grow">XVI Congresso · avaliação</span><button class="link" type="button" data-review-close>Fechar</button></header><h2 id="review-title">Como foi pra você?</h2>${body}<p class="review-error" role="alert">${esc(error)}</p></div>`;dialog.scrollTop=scroll;
 }
 async function load(){loading=true;error='';render();try{saved=await api.load();if(saved&&!closed)onReviewed?.();}catch{error='Não foi possível carregar. Feche e reabra a pesquisa.';}finally{loading=false;if(error)loadFailed=true;render();}}
 dialog.addEventListener('click',e=>{
  if(e.target.closest('[data-review-close]'))return close();
  const rate=e.target.closest('[data-review-rate]');if(rate&&!busy){text=dialog.querySelector('#review-text')?.value||'';ratings[rate.dataset.reviewRate]=Number(rate.dataset.value);error='';render();dialog.querySelector(`[data-review-rate="${rate.dataset.reviewRate}"][data-value="${rate.dataset.value}"]`)?.focus({preventScroll:true});}
  if(e.target.closest('[data-review-results]')&&!busy){busy=true;error='';render();void api.results().then(value=>{results=value;}).catch(()=>{error='Não foi possível carregar os resultados. Tente novamente.';}).finally(()=>{busy=false;render();});}
 });
 dialog.addEventListener('input',e=>{if(e.target.id==='review-text')text=e.target.value;});
 dialog.addEventListener('submit',e=>{
  e.preventDefault();if(busy||saved||loading)return;text=dialog.querySelector('#review-text').value;
  if(!validReview(ratings,text)){error='Avalie os seis temas ou marque Não se aplica.';render();dialog.querySelector('.review-error')?.scrollIntoView({block:'nearest'});return;}
  busy=true;error='';render();void api.send({...ratings},text).then(()=>{saved=true;text='';dialog.scrollTop=0;onReviewed?.();}).catch(()=>{error='Não foi possível enviar. Suas escolhas continuam aqui; confira a conexão e tente novamente.';}).finally(()=>{busy=false;render();});
 });
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 document.body.append(dialog);render();dialog.showModal();void load();return {close};
}
