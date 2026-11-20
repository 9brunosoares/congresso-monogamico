import test from 'node:test';
import assert from 'node:assert/strict';
import {createBruAlert,BRU_ALERT_KEY} from '../bru-alert.js';
import {ALL} from '../roster.js';

function fixture(values=new Map()) {
  const timers=new Map();let serial=0,displayed=0,closed=0,isBlocked=false;
  const options={storage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)},
    show:()=>{displayed++;return()=>{closed++;};},blocked:()=>isBlocked,
    schedule:(fn,ms)=>{const id=++serial;timers.set(id,{fn,ms});return id;},unschedule:id=>timers.delete(id)};
  return {alert:createBruAlert(options),values,timers,options,
    get displayed(){return displayed;},get closed(){return closed;},
    block(value){isBlocked=value;},fire(){const [id,timer]=timers.entries().next().value;timers.delete(id);timer.fn();}};
}
const bru={me:'bruno',ready:true,hidden:false};

test('alerta está disponível aos 13 perfis, com cinco segundos e exibição única por perfil',()=>{
  const f=fixture();
  for(const me of ['desconhecido','bru',null])f.alert.update({...bru,me});
  assert.equal(f.timers.size,0);
  f.alert.update({...bru,ready:false});assert.equal(f.timers.size,0);
  for(const [index,me] of ALL.entries()){
    const state={...bru,me};f.alert.update(state);const id=[...f.timers.keys()][0];
    assert.equal(f.timers.get(id).ms,5000);assert.equal(f.displayed,index);
    f.alert.update(state);assert.equal([...f.timers.keys()][0],id);
    f.fire();assert.equal(f.displayed,index+1);
    assert.equal(f.values.get(me==='bruno'?BRU_ALERT_KEY:`${BRU_ALERT_KEY}:${me}`),'1');
    f.alert.update(state);assert.equal(f.timers.size,0);
    const reopened=fixture(f.values);reopened.alert.update(state);assert.equal(reopened.timers.size,0);
  }
});

test('ocultar ou trocar de conta cancela a espera sem consumir o aviso',()=>{
  const f=fixture();f.alert.update(bru);f.alert.update({...bru,hidden:true});
  assert.equal(f.timers.size,0);assert.equal(f.values.size,0);
  f.alert.update(bru);assert.equal([...f.timers.values()][0].ms,5000);
  f.alert.update({...bru,me:null});assert.equal(f.timers.size,0);
  f.alert.update(bru);f.fire();assert.equal(f.displayed,1);
  f.alert.update({...bru,me:'igor'});assert.equal(f.closed,1);
  assert.equal([...f.timers.values()][0].ms,5000);f.fire();assert.equal(f.displayed,2);
  f.alert.update(bru);assert.equal(f.timers.size,0);
});

test('quem já viu como Bru não repete e não bloqueia outro perfil no mesmo aparelho',()=>{
  const f=fixture(new Map([[BRU_ALERT_KEY,'1']]));
  f.alert.update(bru);assert.equal(f.timers.size,0);
  f.alert.update({...bru,me:'igor'});f.fire();assert.equal(f.displayed,1);
  assert.equal(f.values.get(`${BRU_ALERT_KEY}:igor`),'1');
  f.alert.update({...bru,me:'pig'});assert.equal(f.timers.size,1);
});

test('espera o quiz/janela atual fechar e respeita uma exibição já feita em outra aba',()=>{
  const f=fixture();f.block(true);f.alert.update(bru);f.fire();
  assert.equal(f.displayed,0);assert.equal(f.values.size,0);assert.equal([...f.timers.values()][0].ms,250);
  f.block(false);f.fire();assert.equal(f.displayed,1);
  const other=fixture();other.alert.update(bru);other.values.set(BRU_ALERT_KEY,'1');other.fire();assert.equal(other.displayed,0);
});

test('armazenamento indisponível mantém uma exibição na sessão sem quebrar o app',()=>{
  const f=fixture();const alert=createBruAlert({...f.options,storage:{getItem(){throw Error('bloqueado');},setItem(){throw Error('bloqueado');}}});
  alert.update(bru);f.fire();assert.equal(f.displayed,1);alert.update(bru);assert.equal(f.timers.size,0);
});
