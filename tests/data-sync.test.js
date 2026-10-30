import test from 'node:test';
import assert from 'node:assert/strict';
import {subscriptionPool,lazyCollections,mergeRows,photoLoader} from '../data-sync.js';

test('trocar de tela preserva consultas comuns sem abrir duplicatas',()=>{
 const opened=[],closed=[],pool=subscriptionPool(s=>{opened.push(s.key);return ()=>closed.push(s.key)});
 pool.sync([{key:'points'},{key:'expenses'}]);
 for(let i=0;i<30;i++)pool.sync([{key:'points'},{key:'expenses'}]);
 assert.deepEqual(opened,['points','expenses']);
 pool.sync([{key:'points'},{key:'expenses'},{key:'chat'}]);
 pool.sync([{key:'points'},{key:'expenses'},{key:'cases'}]);
 assert.deepEqual(opened,['points','expenses','chat','cases']);assert.deepEqual(closed,['chat']);
 pool.stop();assert.equal(pool.keys().length,0);assert.equal(closed.length,4);
});
test('home não abre chat, tarefas ou lista do mural; Tribunal é exclusivo ADM',()=>{
 assert.deepEqual(lazyCollections('inicio',true),{chat:false,tasks:false,cases:false});
 assert(lazyCollections('fofoca',false).chat);assert(!lazyCollections('fofoca',false).cases);
 assert(lazyCollections('placar',false).tasks);assert(!lazyCollections('tribunal',false).cases);assert(lazyCollections('tribunal',true).cases);
});
test('mescla páginas sem duplicar registros e preserva a ordem cronológica',()=>{
 const row=(id,time)=>({id,createdAt:{toMillis:()=>time}});
 assert.deepEqual(mergeRows([row('a',1),row('b',2)],[row('b',2),row('c',3)]).map(x=>x.id),['a','b','c']);
});
test('foto só lê sob demanda, deduplica pedidos e reutiliza cache',async()=>{
 let calls=0;const received=[];
 const loader=photoLoader(async id=>{calls++;return id},{valid:()=>true,allowed:()=>true,onValue:(id,v)=>received.push(v),onError:()=>assert.fail()});
 assert.equal(calls,0);
 await Promise.all([loader.load('foto'),loader.load('foto'),loader.load('foto')]);assert.equal(calls,1);
 await loader.load('foto');assert.equal(calls,1);assert.deepEqual(received,['foto','foto']);
 loader.clear();await loader.load('foto');assert.equal(calls,2);
});
test('fotos usam no máximo duas buscas simultâneas e descartam resultado de sessão encerrada',async()=>{
 let running=0,max=0;const release=[],values=[];
 const loader=photoLoader(id=>new Promise(resolve=>{running++;max=Math.max(max,running);release.push(()=>{running--;resolve(id)})}),{valid:()=>true,allowed:()=>true,onValue:id=>values.push(id),onError:()=>assert.fail()});
 const jobs=['a','b','c'].map(id=>loader.load(id));await Promise.resolve();assert.equal(max,2);
 loader.clear();for(const done of release)done();await Promise.all(jobs);assert.equal(values.length,0);assert.equal(max,2);
});
