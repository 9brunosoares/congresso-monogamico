// A orientação de instalação carrega antes de qualquer SDK ou dado do congresso.
export function isAppMode(env){
 return env.navigator.standalone===true || env.matchMedia('(display-mode: standalone)').matches;
}
export function devicePlatform(nav){
 if(/iPhone|iPad|iPod/i.test(nav.userAgent) || (nav.platform==='MacIntel' && nav.maxTouchPoints>1))return 'ios';
 return /Android/i.test(nav.userAgent)?'android':'desktop';
}
const shareIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 9H5v12h14V9h-3M12 16V2M7 7l5-5 5 5"/></svg>';
export function installationMarkup(platform,promptAvailable=false,installed=false,desktop=false){
 const ios=platform==='ios';
 const steps=ios?[
  ['Abra no Safari',`${shareIcon}Toque em Compartilhar.`],
  ['Adicione à Tela de Início','Mantenha “Abrir como App da Web” ativado, se aparecer.'],
  ['Abra Congresso pelo ícone','Na tela inicial do celular.']
 ]:[
  ['Abra no Chrome','Toque no menu ⋮.'],
  ['Instale o aplicativo','Escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.'],
  ['Abra Congresso pelo ícone','Na tela inicial ou na lista de aplicativos.']
 ];
 return `<main class="app install-page">
  <p class="install-label">CONGRESSO · INSTALAÇÃO</p>
  <h1>Você está<br>no navegador.</h1>
  <p class="install-intro">Para entrar, adicione o Congresso à tela inicial.</p>
  ${desktop?'<p class="install-desktop">Abra este link no celular.</p>':''}
  <div class="seg seg2 install-platform" role="group" aria-label="Escolha seu celular"><button type="button" data-platform="ios" aria-pressed="${ios}">iPhone / iPad</button><button type="button" data-platform="android" aria-pressed="${!ios}">Android</button></div>
  ${!ios&&promptAvailable?'<button class="btn seal block" type="button" id="installNow">Instalar Congresso</button>':''}
  <ol class="install-steps">${steps.map(([title,description],i)=>`<li><span class="install-number" aria-hidden="true">${i+1}</span><div><h2>${title}</h2><p>${description}</p></div></li>`).join('')}</ol>
  <p class="install-note">O login abre somente pelo ícone no celular.</p>
  <button type="button" class="link" id="copyInstallLink">Copiar link</button>
  <p class="install-status" role="status" id="installStatus">${installed?'Instalação concluída. Abra pelo ícone Congresso.':''}</p>
 </main>`;
}
export function initializeInstallation(env,loadApp){
 const root=env.document.querySelector('#root'),device=devicePlatform(env.navigator);
 let platform=device==='android'?'android':'ios',prompt=null,installed=false,started=false;
 const show=()=>{if(!started)root.innerHTML=installationMarkup(platform,!!prompt,installed,device==='desktop');};
 const open=()=>{
  if(started||!isAppMode(env))return false;
  started=true;
  loadApp().catch(()=>{
   root.innerHTML='<div class="app login"><h2>Não foi possível conectar.</h2><p class="muted">Confira sua internet e tente novamente.</p><button class="btn seal" id="retryApp" type="button">Tentar novamente</button></div>';
   root.querySelector('#retryApp').onclick=()=>env.location.reload();
  });
  return true;
 };
 env.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;show();});
 env.addEventListener('appinstalled',()=>{prompt=null;installed=true;show();});
 env.matchMedia('(display-mode: standalone)').addEventListener('change',()=>{open();});
 root.addEventListener('click',async event=>{
  if(started)return;
  const choice=event.target.closest('[data-platform]');
  if(choice){platform=choice.dataset.platform;show();return;}
  const button=event.target.closest('button');if(!button)return;
  if(button.id==='copyInstallLink'){
   try{await env.navigator.clipboard.writeText('https://9brunosoares.github.io/congresso-monogamico/');root.querySelector('#installStatus').textContent='Link copiado.';}
   catch{root.querySelector('#installStatus').textContent='Copie o endereço pela barra do navegador.';}
  }
  if(button.id==='installNow'&&prompt){
   const current=prompt;prompt=null;button.disabled=true;
   try{const result=await current.prompt();installed=result?.outcome==='accepted';show();}
   catch{show();root.querySelector('#installStatus').textContent='Use os passos abaixo para adicionar pelo menu do navegador.';}
  }
 });
 if(!open())show();
}
if(typeof window!=='undefined')initializeInstallation(window,()=>import('./app.js?v=20261029f'));
