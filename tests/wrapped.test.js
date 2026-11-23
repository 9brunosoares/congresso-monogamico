import test from 'node:test';
import assert from 'node:assert/strict';
import {ALL,EMOJIS} from '../roster.js';
import {emojiStory,keepsakes} from '../wrapped-model.js';
import {fakeTime,summary} from '../wrapped-poster.js';

test('Wrapped soma emojis recebidos nas rodadas existentes e preserva empates',()=>{
 const rounds=[{day:20,counts:{ob:2}},{day:21,counts:{ob:32}},{day:22,counts:{bruno:1}}];
 const story=emojiStory(rounds,'ob');
 assert.deepEqual(story.leaders,EMOJIS.slice(0,2));
 assert.equal(story.count,2);
 assert.deepEqual(story.days.map(d=>d.day),[20,21]);
 assert.deepEqual(emojiStory(rounds,'diogo'),{count:0,leaders:[],days:[]});
});
test('os 13 têm lembranças e tempos fictícios distintos, inclusive no resumo compartilhável',()=>{
 assert.deepEqual(Object.keys(keepsakes).sort(),[...ALL].sort());
 const minutes=ALL.map(id=>keepsakes[id][0]);assert.equal(new Set(minutes).size,13);
 for(const id of ALL){
  const [minutes,title,memory]=keepsakes[id];assert(minutes>5*24*60);assert(title&&memory);
  const data={id,nick:id,emoji:{leaders:['❤️'],count:4},points:87,rank:2,minutes,title,memory};
  const card=summary(7,data);assert(card.includes('2º lugar'));assert(card.includes('87 pontos'));assert(card.includes(fakeTime(minutes)+' fictícios'));
 }
});

