import {P} from './roster.js?v=20261120j';
import {rankingCandidates,rankingOpen,RANKING_END,validRanking,presentationPhoto} from './presentation-ranking-model.js?v=20261122a';
import {createPresentationRankingData} from './presentation-ranking-data.js?v=20261122a';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function openPresentationRanking({onClose,onError}={}){
 const api=createPresentationRankingData(),key='xvi-presentation-draft-'+api.who,dialog=document.createElement('dialog');
 dialog.className='presentation-ranking';dialog.setAttribute('aria-labelledby','presentation-title');
 let order=rankingCandidates(api.who),loading=true,busy=false,saved=null,eligible=false,error='',preview=null,result=null,closed=false;
 try{const draft=JSON.parse(localStorage.getItem(key));if(validRanking(api.who,draft))order=draft;else shuffle();}catch{shuffle();}
 function shuffle(){for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}}
 function remember(){try{localStorage.setItem(key,JSON.stringify(order));}catch{}}
 function close(){if(closed)return;closed=true;clearInterval(timer);dialog.close();dialog.remove();onClose?.();}
 function render(focus){
  if(closed)return;const scroll=dialog.scrollTop;
  let body;
  if(loading)body='<p role="status">Carregando sua participação…</p>';
  else if(Date.now()>=RANKING_END)body='<p>A votação encerrou ao meio-dia.</p>'+(result?`<p class="muted">${result.voters} rankings recebidos · índice de preferência de 0 a 100.</p><ol class="presentation-results">${result.rows.map(r=>`<li><b>${r.rank?r.rank+'º':'—'} · ${esc(r.name)}</b><span>${r.score.toFixed(1).replace('.',',')}${r.prize?' · +'+r.prize+' pts':''}</span></li>`).join('')}</ol><p class="muted">Empatados recebem o mesmo prêmio. Duas apresentações em 1º deixam a próxima em 3º.</p>`:'<p class="muted">Nenhum resultado disponível.</p>');
  else if(saved)body='<div class="card"><h3>Ranking enviado!</h3><p>Seu voto foi salvo. O resultado e os prêmios serão apurados ao meio-dia.</p></div><ol class="presentation-saved">'+saved.order.map(id=>'<li>'+esc(P[id].nick)+'</li>').join('')+'</ol>';
  else if(!eligible)body='<p>Preencha o Queridômetro de hoje para ordenar as apresentações.</p>';
  else body=`<p>Da melhor para a que você menos gostou. Use as setas ou escolha uma posição. Toque na foto para ampliar.</p><ol class="presentation-list">${order.map((id,i)=>`<li><span class="presentation-position num">${i+1}</span><button class="presentation-photo" data-presentation-photo="${id}" aria-label="Ampliar foto de ${esc(P[id].nick)}" type="button"><img src="${presentationPhoto(id)}" alt="Apresentação de ${esc(P[id].nick)}" width="72" height="86"></button><div class="grow"><b>${esc(P[id].nick)}</b><label class="presentation-select">Posição <select data-presentation-position="${id}" aria-label="Posição de ${esc(P[id].nick)}" ${busy?'disabled':''}>${order.map((_,j)=>`<option value="${j}" ${i===j?'selected':''}>${j+1}º</option>`).join('')}</select></label></div><div class="presentation-arrows"><button type="button" data-presentation-move="${id}" data-step="-1" aria-label="Subir ${esc(P[id].nick)}" ${busy||i===0?'disabled':''}>↑</button><button type="button" data-presentation-move="${id}" data-step="1" aria-label="Descer ${esc(P[id].nick)}" ${busy||i===order.length-1?'disabled':''}>↓</button></div></li>`).join('')}</ol><button class="btn seal block" data-presentation-send type="button" ${busy?'disabled':''}>${busy?'Enviando…':'Enviar ranking'}</button><p class="muted">A ordem inicial é aleatória. A apuração usa todas as posições, ajustadas à quantidade de apresentações avaliadas, e a média recebida por cada uma.</p>`;
  dialog.innerHTML=`<div class="presentation-shell"><header class="row"><span class="eyebrow grow">Retrospectiva do Meu An*</span><button class="link" data-presentation-close type="button">Fechar</button></header><h2 id="presentation-title">${saved?'Seu ranking':'Ordene as apresentações'}</h2>${body}${error?`<p role="alert" class="presentation-error">${esc(error)}</p><button class="link" data-presentation-retry type="button">Tentar novamente</button>`:''}${preview?`<div class="presentation-preview"><button class="btn" data-presentation-preview-close type="button">Voltar ao ranking</button><img src="${presentationPhoto(preview)}" alt="Apresentação de ${esc(P[preview].nick)}"></div>`:''}</div>`;
  dialog.scrollTop=scroll;if(focus)dialog.querySelector(focus)?.focus({preventScroll:true});
 }
 function move(id,next){if(busy)return;const i=order.indexOf(id);if(i<0||next<0||next>=order.length)return;order.splice(i,1);order.splice(next,0,id);remember();render(`[data-presentation-position="${id}"]`);}
 async function load(){error='';loading=true;render();try{const state=await api.load();saved=state.saved;eligible=state.eligible;if(Date.now()>=RANKING_END){result=await api.results();await api.finalize();}}catch(e){error=e.code==='permission-denied'?'Não foi possível acessar a votação. Reabra o app e tente novamente.':e.message;onError?.(e);}finally{loading=false;render();}}
 dialog.addEventListener('click',e=>{
  if(e.target.closest('[data-presentation-close]'))return close();
  if(e.target.closest('[data-presentation-preview-close]')){preview=null;return render();}
  const photo=e.target.closest('[data-presentation-photo]');if(photo){preview=photo.dataset.presentationPhoto;return render();}
  const button=e.target.closest('[data-presentation-move]');if(button)return move(button.dataset.presentationMove,order.indexOf(button.dataset.presentationMove)+Number(button.dataset.step));
  if(e.target.closest('[data-presentation-retry]'))return void load();
  if(e.target.closest('[data-presentation-send]')&&!busy){busy=true;error='';render();void api.send(order).then(value=>{saved=value;try{localStorage.removeItem(key);}catch{}}).catch(err=>{error=err.code==='permission-denied'?'Não foi possível enviar. Confira se o prazo encerrou ou se já enviou em outro aparelho. Seu Queridômetro está salvo.':err.message;onError?.(err);}).finally(()=>{busy=false;render();});}
 });
 dialog.addEventListener('change',e=>{if(e.target.matches('[data-presentation-position]'))move(e.target.dataset.presentationPosition,Number(e.target.value));});
 dialog.addEventListener('cancel',e=>{e.preventDefault();if(preview){preview=null;render();}else close();});
 let open=rankingOpen();const timer=setInterval(()=>{const next=rankingOpen();if(next!==open){open=next;void load();}},1000);
 document.body.append(dialog);render();dialog.showModal();void load();return {close};
}
