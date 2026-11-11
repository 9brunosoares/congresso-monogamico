import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiscovery,DISCOVERY_END} from '../discovery.js';
import {ALL} from '../roster.js';

const before=DISCOVERY_END-86400000;
function storage(){const values=new Map();return {getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};}

test('descoberta exige as duas abas e um segundo acesso; persiste após recarregar',()=>{
 const disk=storage();let d=createDiscovery(disk);
 d.record('bruno','open',before);d.record('bruno','programa',before);d.record('bruno','contas',before);
 assert(!d.portal('bruno',before));assert(!d.access('bruno',before));
 d=createDiscovery(disk);d.record('bruno','open',before);
 assert(d.portal('bruno',before));assert(d.access('bruno',before));
 assert(!d.read('bruno').enteredAt);
 d.record('bruno','enter',before);
 d=createDiscovery(disk);assert(!d.portal('bruno',before));assert(d.access('bruno',DISCOVERY_END+1));
});

test('todos os perfis logados podem descobrir, com Agenda e Contas obrigatórias',()=>{
 const d=createDiscovery(storage());
 for(const id of ALL){
  d.record(id,'open',before);d.record(id,'open',before);d.record(id,'programa',before);
  assert(!d.portal(id,before));d.record(id,'contas',before);
  assert(d.portal(id,before));assert(d.access(id,before));
 }
 for(const event of ['open','open','programa','contas'])d.record(null,event,before);
 assert(!d.portal(null,before));assert(!d.access(null,before));
});

test('18/11 encerra novos portões, mas quem já entrou mantém acesso no perfil',()=>{
 const d=createDiscovery(storage());
 for(const event of ['open','open','programa','contas'])d.record('bruno',event,before);
 assert(d.portal('bruno',DISCOVERY_END-1));assert(!d.portal('bruno',DISCOVERY_END));assert(!d.access('bruno',DISCOVERY_END));
 d.record('bruno','enter',before);assert(d.access('bruno',DISCOVERY_END));
 d.reset('bruno');for(const event of ['open','programa','contas'])d.record('bruno',event,DISCOVERY_END);
 assert(!d.read('bruno').unlockedAt);
});

test('reinício da prévia é isolado; armazenamento indisponível mantém o app funcionando',()=>{
 const d=createDiscovery({getItem(){throw Error();},setItem(){throw Error();}});
 for(const event of ['open','open','programa','contas','enter'])d.record('bruno',event,before);
 assert(d.access('bruno',before));d.reset('ob');assert(d.access('bruno',before));
 d.reset('bruno');assert(!d.access('bruno',before));assert.equal(d.read('bruno').visits,1);
});
