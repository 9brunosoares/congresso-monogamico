import test from 'node:test';
import assert from 'node:assert/strict';
import {createChatColors} from '../chat-colors.js';
const key=n=>n.toString(16).padStart(32,'0');

test('14 autores têm cores distintas e estáveis ao receber mensagens e paginar',()=>{
 const colors=createChatColors(()=>.9),assigned=Array.from({length:14},(_,i)=>colors.forKey(key(i+1)));
 assert.equal(new Set(assigned.map(c=>c.light)).size,14);
 assert.equal(new Set(assigned.map(c=>c.dark)).size,14);
 for(let i=13;i>=0;i--)assert.deepEqual(colors.forKey(key(i+1)),assigned[i]);
 for(const invalid of [undefined,null,'','bruno','<script>','z'.repeat(32)])assert.equal(colors.forKey(invalid),null);
});
test('nova abertura refaz o sorteio; cor não é derivada da identidade',()=>{
 let roll=.999;const colors=createChatColors(()=>roll),before=colors.forKey(key(1));
 roll=0;colors.reset();assert.notDeepEqual(colors.forKey(key(1)),before);
 const anotherViewer=createChatColors(()=>.999);assert.notDeepEqual(anotherViewer.forKey(key(1)),colors.forKey(key(1)));
});
