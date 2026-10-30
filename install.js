// A orientação de instalação carrega antes de qualquer SDK ou dado do congresso.
export function isAppMode(env){
 return env.navigator.standalone===true || env.matchMedia('(display-mode: standalone)').matches;
}
export function devicePlatform(nav){
 if(/iPhone|iPad|iPod/i.test(nav.userAgent) || (nav.platform==='MacIntel' && nav.maxTouchPoints>1))return 'ios';
 return /Android/i.test(nav.userAgent)?'android':'desktop';
}
const shareIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 9H5v12h14V9h-3M12 16V2M7 7l5-5 5 5"/></svg>';
const addIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 7v10M7 12h10"/></svg>';
export function installationMarkup(platform,promptAvailable=false,installed=false,desktop=false){
 const ios=platform==='ios';
 const steps=ios?[
  ['Abra no Safari','Abra este link no Safari do seu iPhone. Se veio pelo WhatsApp ou Instagram, use o menu para abrir no navegador.','Safari'],
  ['Toque em Compartilhar','Procure o quadrado com a seta para cima. Dependendo da versão do Safari, ele fica dentro do menu da página.',shareIcon+'Compartilhar'],
  ['Adicione à Tela de Início','Escolha “Adicionar à Tela de Início”. Se aparecer “Abrir como App da Web”, deixe ativado. Depois toque em “Adicionar”.',addIcon+'Adicionar à Tela de Início'],
  ['Abra pelo novo ícone','Volte à tela inicial do celular e toque em Congresso. Sua credencial abre por lá.','home']
 ]:[
  ['Abra no Chrome','Abra este link no Chrome do seu Android. Se veio pelo WhatsApp ou Instagram, use o menu para abrir no navegador.','Chrome'],
  ['Abra o menu ⋮','Toque nos três pontos do navegador. Escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.','⋮ Menu do Chrome'],
  ['Confirme a instalação','Toque em “Instalar” ou confirme “Adicionar”. O nome e as opções podem variar conforme o celular.',addIcon+'Instalar aplicativo'],
  ['Abra pelo novo ícone','Na tela inicial ou na lista de aplicativos, toque em Congresso para abrir sua credencial.','home']
 ];
 return `<main class="app install-page">
  <section class="badge install-badge"><div class="lanyard"><span>XVI CONGRESSO</span><span>18—22 NOV</span></div><div class="body">
   <div class="install-brand"><img src="icon-192.png" width="64" height="64" alt="Ícone do Congresso"><span class="eyebrow">Sua credencial<br>sempre à mão</span></div>
   <h1>O Congresso,<br>na sua <em>tela inicial.</em></h1>
   <p class="muted">Adicione o aplicativo ao celular. Depois, abra pelo ícone Congresso para entrar.</p>
  </div></section>
  ${desktop?'<p class="install-desktop">Está no computador? Abra este endereço no celular e siga os passos abaixo.</p>':''}
  <div class="seg seg2 install-platform" role="group" aria-label="Escolha seu celular"><button type="button" data-platform="ios" aria-pressed="${ios}">iPhone / iPad</button><button type="button" data-platform="android" aria-pressed="${!ios}">Android</button></div>
  ${!ios&&promptAvailable?'<button class="btn seal block" type="button" id="installNow">Instalar Congresso</button><p class="muted install-small">Ou siga o passo a passo abaixo.</p>':''}
  <ol class="install-steps">${steps.map(([title,description,action],i)=>`<li><span class="install-number" aria-hidden="true">${i+1}</span><div><h2>${title}</h2><p>${description}</p>${action==='home'?'<div class="install-home"><img src="icon-192.png" width="44" height="44" alt=""><span>Congresso</span><span class="install-arrow" aria-hidden="true">↗</span></div>':`<div class="install-action">${action}</div>`}</div></li>`).join('')}</ol>
  <div class="card install-finish"><b>Já adicionou?</b><p>Saia do navegador e abra <strong>Congresso</strong> pelo ícone no celular. O login aparece no aplicativo.</p></div>
  <div class="install-link"><span>9brunosoares.github.io/congresso-monogamico/</span><button type="button" class="link" id="copyInstallLink">Copiar link</button></div>
  <p class="install-small muted" role="status" id="installStatus">${installed?'Instalação concluída. Agora abra Congresso pelo ícone no celular.':''}</p>
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
if(typeof window!=='undefined')initializeInstallation(window,()=>import('./app.js?v=20261029c'));
