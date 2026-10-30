import test from 'node:test';
import assert from 'node:assert/strict';
import {isAppMode,devicePlatform,installationMarkup,initializeInstallation} from '../install.js';

function harness({standalone=false,apple=false,userAgent='iPhone',platform='iPhone',maxTouchPoints=1}={}){
 const listeners={},root={innerHTML:'',addEventListener(name,fn){listeners['root:'+name]=fn},querySelector(){return {textContent:'',onclick:null}}};
 let loads=0,reloads=0;
 const media={matches:standalone,addEventListener(name,fn){listeners['media:'+name]=fn}};
 const env={navigator:{standalone:apple,userAgent,platform,maxTouchPoints,clipboard:{writeText:async()=>{}}},matchMedia:()=>media,document:{querySelector:()=>root},addEventListener(name,fn){listeners[name]=fn},location:{reload(){reloads++}}};
 initializeInstallation(env,async()=>{loads++});
 return {env,root,listeners,media,get loads(){return loads},get reloads(){return reloads}};
}
test('modo navegador mostra tutorial sem carregar o app; modo instalado entra direto',()=>{
 const browser=harness();assert.equal(browser.loads,0);assert(browser.root.innerHTML.includes('Adicione à Tela de Início'));assert(!browser.root.innerHTML.includes('loginForm'));
 assert.equal(harness({standalone:true}).loads,1);assert.equal(harness({apple:true}).loads,1);
 assert(!isAppMode(browser.env));
});
test('identifica iPad com agente de desktop e oferece instruções dos dois sistemas',async()=>{
 assert.equal(devicePlatform({userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:5}),'ios');
 assert.equal(devicePlatform({userAgent:'Android',platform:'Linux',maxTouchPoints:1}),'android');
 const h=harness({userAgent:'Android'});assert(h.root.innerHTML.includes('Abra no Chrome'));
 await h.listeners['root:click']({target:{closest(selector){return selector==='[data-platform]'?{dataset:{platform:'ios'}}:null}}});
 assert(h.root.innerHTML.includes('Abra no Safari'));assert.equal(h.loads,0);
 assert(installationMarkup('ios').includes('Abrir como App da Web'));assert(!installationMarkup('ios').includes('id="installNow"'));
});
test('instalar ou declarar instalado não libera o navegador; abrir no modo app carrega uma vez',async()=>{
 const h=harness({userAgent:'Android'});let prompted=0;
 h.listeners.beforeinstallprompt({preventDefault(){},async prompt(){prompted++;return {outcome:'accepted'}}});
 assert(h.root.innerHTML.includes('id="installNow"'));
 await h.listeners['root:click']({target:{closest(selector){return selector==='button'?{id:'installNow'}:null}}});
 assert.equal(prompted,1);assert.equal(h.loads,0);
 h.listeners.appinstalled();assert(h.root.innerHTML.includes('Instalação concluída'));assert.equal(h.loads,0);
 h.media.matches=true;h.listeners['media:change']();h.listeners['media:change']();assert.equal(h.loads,1);
});
