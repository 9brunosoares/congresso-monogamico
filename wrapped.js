import {EMOJIS,P} from './roster.js?v=20261120j';
import {keepsakes} from './wrapped-model.js?v=20261123d';
import {slides,paintPoster,summary} from './wrapped-poster.js?v=20261123b';

function photo(src){
 return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src;});
}

export function openWrapped({id,rank,points,onClose,loadEmoji}){
 const dialog=document.createElement('dialog');
 dialog.className='xvi-wrapped';dialog.setAttribute('aria-label','Congresso XVI Wrapped');
 dialog.innerHTML=`<div class="wrap-shell">
  <header class="wrap-top"><b>XVI WRAPPED</b><span class="wrap-index"></span><button type="button" data-wrap="close" aria-label="Fechar retrospectiva">✕</button></header>
  <div class="wrap-bars" aria-hidden="true">${slides.map(()=>'<i></i>').join('')}</div>
  <div class="wrap-art"><canvas width="1080" height="1440" role="img"></canvas></div>
  <div class="wrap-state" role="status">Preparando sua retrospectiva…</div>
  <div class="wrap-choices" aria-label="Seu palpite"></div>
  <footer class="wrap-actions"><button type="button" data-wrap="prev" aria-label="Etapa anterior">←</button><button type="button" data-wrap="next">Avançar →</button></footer>
 </div>`;
 document.body.append(dialog);dialog.showModal();
 const get=s=>dialog.querySelector(s),canvas=get('canvas'),state=get('.wrap-state'),choices=get('.wrap-choices'),actions=get('.wrap-actions');
 let step=0,closed=false,ready=false,png=null,fileUrl='',generation=0;
 const [minutes,title,memory]=keepsakes[id];
 const data={id,nick:P[id].nick,frame:P[id].frame,minutes,title,memory,rank,points,guess:null};
 function close(){
  if(closed)return;closed=true;generation++;if(fileUrl)URL.revokeObjectURL(fileUrl);
  dialog.close();dialog.remove();onClose();
 }
 function advance(delta){
  if(!ready)return;
  if(delta>0&&step===1&&data.guess===null)data.guess='';
  else step=Math.min(slides.length-1,Math.max(0,step+delta));
  render();
 }
 function render(){
  if(closed)return;
  const token=++generation;
  paintPoster(canvas,step,data);canvas.setAttribute('aria-label',summary(step,data));
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)canvas.animate?.([{opacity:.45,transform:'translateY(7px) scale(.99)'},{opacity:1,transform:'none'}],{duration:240});
  get('.wrap-index').textContent=slides[step]+' · '+(step+1)+'/8';
  [...dialog.querySelectorAll('.wrap-bars i')].forEach((bar,j)=>bar.classList.toggle('lit',j<=step));
  const pendingGuess=step===1&&data.guess===null;
  choices.innerHTML=pendingGuess?EMOJIS.map(e=>`<button type="button" data-emoji="${e}" aria-label="Escolher ${e}">${e}</button>`).join(''):'';
  choices.hidden=!pendingGuess;
  const last=step===slides.length-1;
  state.textContent=summary(step,data);state.classList.add('wrap-sr');
  get('[data-wrap="prev"]').disabled=step===0;
  actions.querySelector('[data-wrap="download"]')?.remove();
  const next=get('[data-wrap="next"]');next.disabled=last;next.textContent=last?'Preparando card…':pendingGuess?'Revelar sem palpite →':'Avançar →';
  if(last){
   png=null;
   canvas.toBlob(blob=>{
    if(closed||token!==generation)return;
    if(!blob){next.textContent='Gerar novamente';next.disabled=false;return;}
    png=new File([blob], 'XVI-Wrapped-'+data.nick+'.png',{type:'image/png'});
    if(fileUrl)URL.revokeObjectURL(fileUrl);fileUrl=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=fileUrl;a.download=png.name;a.dataset.wrap='download';a.textContent='Salvar PNG';actions.insertBefore(a,next);
    next.textContent=navigator.canShare?.({files:[png]})?'Compartilhar card ↗':'Concluir';next.disabled=false;
   },'image/png');
  }
 }
 async function load(){
  state.classList.remove('wrap-sr');state.textContent='Preparando sua retrospectiva…';actions.hidden=true;choices.hidden=true;canvas.hidden=true;
  try{
   const [emoji,avatar,presentation]=await Promise.all([loadEmoji(id),photo('img/'+id+'.jpg'),id==='diogo'?null:photo('assets/presentations/'+id+'.webp'),document.fonts?.ready]);
   if(closed)return;Object.assign(data,{emoji,avatar,presentation});ready=true;actions.hidden=false;canvas.hidden=false;render();
  }catch{if(!closed){state.innerHTML='Não foi possível carregar o Wrapped. <button type="button" data-wrap="retry">Tentar novamente</button>';}}
 }
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();advance(e.key==='ArrowLeft'?-1:1);}});
 dialog.addEventListener('click',async e=>{
  const el=e.target.closest('button');if(!el||el.disabled)return;
  if(el.dataset.emoji){data.guess=el.dataset.emoji;render();get('[data-wrap="next"]').focus();return;}
  switch(el.dataset.wrap){
   case 'close':close();break;
   case 'retry':void load();break;
   case 'prev':advance(-1);break;
   case 'next':
    if(step!==slides.length-1){advance(1);break;}
    if(!png){render();break;}
    if(!navigator.canShare?.({files:[png]})){close();break;}
    try{await navigator.share({files:[png],title:'Meu Congresso XVI Wrapped'});}
    catch(err){if(err.name!=='AbortError'){state.classList.remove('wrap-sr');state.textContent='Use Salvar PNG para enviar a imagem.';}}
  }
 });
 void load();return {close};
}

