import test from 'node:test';
import assert from 'node:assert/strict';
import {bindAgendaSwipe,adjacentDay} from '../agenda-gesture.js';
function gesture(){
 const handlers={},days=[18,19,20,21,22];let current=19,active=true;
 const doc={documentElement:{clientWidth:390},addEventListener(name,fn){handlers[name]=fn}};
 bindAgendaSwipe(doc,()=>active,direction=>{current=adjacentDay(days,current,direction)});
 const target={closest:selector=>selector==='.agenda-swipe'?{}:null};
 const event=(x,y,time)=>({target,touches:[{clientX:x,clientY:y}],changedTouches:[{clientX:x,clientY:y}],timeStamp:time});
 return {handlers,event,get day(){return current},set day(value){current=value},set active(value){active=value},swipe(x1,y1,x2,y2){handlers.touchstart(event(x1,y1,0));handlers.touchmove(event(x2,y2,150));const end=event(x2,y2,300);end.touches=[];handlers.touchend(end)}};
}
test('deslizar à esquerda avança e à direita volta sem circular nos extremos',()=>{
 const g=gesture();g.swipe(250,200,100,205);assert.equal(g.day,20);g.swipe(100,200,250,205);assert.equal(g.day,19);
 g.day=18;g.swipe(100,200,250,200);assert.equal(g.day,18);g.day=22;g.swipe(250,200,100,200);assert.equal(g.day,22);
});
test('rolagem vertical, toque curto, gesto cancelado e outras telas não trocam dia',()=>{
 const g=gesture();g.swipe(200,200,180,400);assert.equal(g.day,19);g.swipe(200,200,180,205);assert.equal(g.day,19);
 g.handlers.touchstart(g.event(250,200,0));g.handlers.touchcancel();const end=g.event(100,200,200);end.touches=[];g.handlers.touchend(end);assert.equal(g.day,19);
 g.active=false;g.swipe(250,200,100,200);assert.equal(g.day,19);
});
test('gestos nas bordas e múltiplos dedos não trocam dia',()=>{
 const g=gesture();g.swipe(10,200,150,200);assert.equal(g.day,19);g.swipe(380,200,150,200);assert.equal(g.day,19);
 const start=g.event(250,200,0);start.touches.push({clientX:200,clientY:220});g.handlers.touchstart(start);
 const end=g.event(100,200,300);end.touches=[];g.handlers.touchend(end);assert.equal(g.day,19);
});
