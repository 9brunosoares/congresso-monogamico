import {EMOJIS,P} from './roster.js?v=20261120j';
import {keepsakes} from './wrapped-model.js?v=20261123d';
import {slides,paintPoster,summary} from './wrapped-poster.js?v=20261123b';
import {beats,sceneMarkup,anticipation,introMarkup,beatMark} from './wrapped-scenes.js?v=20261123e';
import {wrappedSound} from './wrapped-sound.js?v=20261123e';

function photo(src){
 return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src;});
}

export function openWrapped({id,rank,points,onClose,loadEmoji}){
 const dialog=document.createElement('dialog');
 dialog.className='xvi-wrapped';dialog.setAttribute('aria-label','Congresso XVI Wrapped');
 dialog.innerHTML=`<div class="wrap-shell">
  <header class="wrap-head"><div class="wrap-bars" aria-hidden="true">${slides.map(()=>'<i></i>').join('')}</div>
  <div class="wrap-top"><b>XVI WRAPPED</b><span class="wrap-index"></span><button data-wrap="audio" hidden></button><button data-wrap="pause" hidden></button><button data-wrap="close" aria-label="Fechar retrospectiva">✕</button></div></header>
  <div class="wrap-stage"><div class="wrap-scene"></div><canvas class="wrap-card" width="1080" height="1440" role="img" hidden></canvas></div>
  <div class="wrap-bottom"><div class="wrap-state" role="status"></div><div class="wrap-choices" aria-label="Seu palpite" hidden></div><footer class="wrap-actions"></footer></div>
 </div>`;
 document.body.append(dialog);dialog.showModal();
 const get=s=>dialog.querySelector(s),shell=get('.wrap-shell'),canvas=get('canvas'),scene=get('.wrap-scene'),state=get('.wrap-state'),choices=get('.wrap-choices'),actions=get('.wrap-actions');
 const control=name=>get('[data-wrap="'+name+'"]');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const score=wrappedSound(),bars=[...dialog.querySelectorAll('.wrap-bars i')];
 const [minutes,title,memory]=keepsakes[id];
 const data={id,nick:P[id].nick,frame:P[id].frame,minutes,title,memory,rank,points,guess:null};
 let step=-1,ready=false,closed=false,paused=false,sound=false,pending=false,elapsed=0,lastTick=0,frame=0,token=0,audioRequest=0;
 let fileUrl='',png=null,ownsFullscreen=false,outroDone=false;
 const last=()=>step===slides.length-1;
 const guessing=()=>step===1&&data.guess===null;
 const running=()=>!closed&&!paused&&!document.hidden&&step>=0;
 function announce(message,visible=false){state.textContent=message;state.classList.toggle('wrap-sr',!visible);}
 function button(name,label,aria){return '<button type="button" data-wrap="'+name+'"'+(aria?' aria-label="'+aria+'"':'')+'>'+label+'</button>';}
 function controls(){
  control('audio').hidden=control('pause').hidden=step<0;
  for(const [name,label,glyph,pressed] of [['audio',sound?'Silenciar':'Ativar som',sound?'Som':'Mudo',sound],['pause',paused?'Continuar':'Pausar',paused?'▶':'Ⅱ',paused]]){
   const el=control(name);el.textContent=glyph;el.setAttribute('aria-label',label);el.setAttribute('aria-pressed',String(pressed));
  }
  shell.dataset.paused=String(paused||document.hidden);
 }
 async function syncAudio(){
  const request=++audioRequest;
  if(!sound||!running()||outroDone){score.silence();return;}
  if(!await score.start()&&request===audioRequest&&!closed){sound=false;controls();}
 }
 function close(){
  if(closed)return;closed=true;token++;audioRequest++;cancelAnimationFrame(frame);score.close();
  document.removeEventListener('visibilitychange',visibility);
  if(fileUrl)URL.revokeObjectURL(fileUrl);
  if(ownsFullscreen&&document.fullscreenElement===document.documentElement)document.exitFullscreen().catch(()=>{});
  dialog.close();dialog.remove();onClose();
 }
 function art(markup){
  scene.innerHTML=markup;scene.classList.remove('is-new');void scene.offsetWidth;scene.classList.add('is-new');
 }
 function reveal(){
  pending=false;elapsed=0;score.scene(step,false);score.cue(last()?'final':'reveal');
  art(sceneMarkup(step,data));announce(summary(step,data));
 }
 function card(generation){
  png=null;paintPoster(canvas,step,data);canvas.setAttribute('aria-label',summary(step,data));
  canvas.toBlob(blob=>{
   if(closed||token!==generation)return;
   const next=control('next');next.disabled=false;
   if(!blob){next.textContent='Gerar novamente';return;}
   png=new File([blob],'XVI-Wrapped-'+data.nick+'.png',{type:'image/png'});
   fileUrl=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=fileUrl;a.download=png.name;a.dataset.wrap='download';a.textContent='Salvar PNG';actions.insertBefore(a,next);
   next.textContent=navigator.canShare?.({files:[png]})?'Compartilhar card ↗':'Concluir';
  },'image/png');
 }
 function screen(){
  const generation=++token;
  if(fileUrl){URL.revokeObjectURL(fileUrl);fileUrl='';}
  if(outroDone){outroDone=false;void syncAudio();}
  elapsed=0;lastTick=0;const [bg,ink,accent]=beats[step];
  for(const [name,value] of Object.entries({bg,ink,accent}))dialog.style.setProperty('--'+name,value);
  get('.wrap-index').textContent=slides[step]+' · '+(step+1)+'/8';
  bars.forEach((b,j)=>{b.className=j<step?'lit':j===step?'current':'';});shell.style.setProperty('--progress',last()?1:0);
  choices.innerHTML=guessing()?EMOJIS.map(e=>'<button type="button" data-emoji="'+e+'" aria-label="Escolher '+e+'">'+e+'</button>').join(''):'';
  choices.hidden=!guessing();scene.hidden=last();canvas.hidden=!last();
  actions.innerHTML=button('prev','←','Etapa anterior')+button('next',last()?'Preparando card…':guessing()?'Revelar sem palpite →':'Avançar →');
  control('prev').disabled=step===0;control('next').disabled=last();
  pending=!reduced&&!guessing()&&!!beats[step][3];score.scene(step,pending);
  if(last()){score.cue('final');announce(summary(step,data));card(generation);}
  else if(pending){art(anticipation(step));announce(beats[step][3]);score.cue('build');}
  else{art(sceneMarkup(step,data));announce(summary(step,data));score.cue('flip');}
  controls();schedule();
 }
 function advance(delta){
  if(!ready||step<0)return;
  if(delta>0&&pending){reveal();return;}
  if(delta>0&&guessing())data.guess='';
  else{const dest=Math.min(7,Math.max(0,step+delta));if(dest===step)return;step=dest;}
  screen();
 }
 function tick(now){
  frame=0;if(!running())return;
  elapsed+=lastTick?Math.min(now-lastTick,150):0;lastTick=now;
  if(pending){
   const beat=Math.min(2,Math.floor(elapsed/475)),number=beatMark(step,beat);
   const counter=get('.ws-count');if(counter&&counter.textContent!==number){counter.textContent=number;score.cue(beat===1?'two':'one');}
   if(elapsed>=1425)reveal();
  }else if(last()){
   if(elapsed>=2300){outroDone=true;score.silence();return;}
  }else if(!guessing()&&!reduced){
   const duration=step===2||step===6?9500:7500;
   shell.style.setProperty('--progress',Math.min(1,elapsed/duration));
   if(elapsed>=duration){advance(1);return;}
  }
  schedule();
 }
 function schedule(){
  if(!frame&&running()&&!guessing()&&!outroDone&&(last()||!reduced||pending))frame=requestAnimationFrame(tick);
 }
 function visibility(){
  cancelAnimationFrame(frame);frame=0;lastTick=0;controls();void syncAudio();schedule();
 }
 function play(withSound){
  if(!ready||step>=0)return;
  step=0;sound=withSound;void syncAudio();
  // The installed mobile app already occupies the viewport. Browsers can opt into native fullscreen.
  if(!matchMedia('(display-mode: standalone)').matches&&!navigator.standalone&&!document.fullscreenElement&&document.fullscreenEnabled){
   document.documentElement.requestFullscreen().then(()=>{
    if(closed){if(document.fullscreenElement===document.documentElement)document.exitFullscreen().catch(()=>{});}
    else ownsFullscreen=true;
   }).catch(()=>{});
  }
  screen();control('next').focus({preventScroll:true});
 }
 async function load(){
  art(introMarkup());announce('Preparando sua retrospectiva…',true);actions.innerHTML='';
  try{
   const [emoji,avatar,presentation]=await Promise.all([loadEmoji(id),photo('img/'+id+'.jpg'),id==='diogo'?null:photo('assets/presentations/'+id+'.webp'),document.fonts?.ready]);
   if(closed)return;Object.assign(data,{emoji,avatar,presentation});ready=true;
   announce('Seu Congresso Wrapped está pronto.');
   actions.innerHTML=button('silent','Sem som')+button('play','▶　Dar play com som');
  }catch{if(!closed){announce('Não foi possível carregar o Wrapped.',true);actions.innerHTML=button('retry','Tentar novamente');}}
 }
 let touchStart=null;
 scene.addEventListener('touchstart',e=>{touchStart=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
 scene.addEventListener('touchcancel',()=>{touchStart=null;});
 scene.addEventListener('touchend',e=>{
  if(!touchStart)return;
  const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;touchStart=null;
  if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)advance(dx<0?1:-1);
 },{passive:true});
 document.addEventListener('visibilitychange',visibility);
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('keydown',e=>{
  if(step>=0&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();advance(e.key==='ArrowLeft'?-1:1);}
 });
 dialog.addEventListener('click',async e=>{
  const el=e.target.closest('button');if(!el||el.disabled)return;
  if(el.dataset.emoji){data.guess=el.dataset.emoji;screen();control('next').focus();return;}
  switch(el.dataset.wrap){
   case 'close':close();break;
   case 'retry':void load();break;
   case 'silent':case 'play':play(el.dataset.wrap==='play');break;
   case 'audio':sound=!sound;controls();void syncAudio();break;
   case 'pause':paused=!paused;visibility();break;
   case 'prev':advance(-1);break;
   case 'next':
    if(!last()){advance(1);break;}
    if(!png){screen();break;}
    if(!navigator.canShare?.({files:[png]})){close();break;}
    try{await navigator.share({files:[png],title:'Meu Congresso XVI Wrapped'});}
    catch(err){if(err.name!=='AbortError')announce('Use Salvar PNG para enviar a imagem.',true);}
  }
 });
 void load();return {close};
}

