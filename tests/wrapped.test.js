import test from 'node:test';
import assert from 'node:assert/strict';
import {ALL,EMOJIS} from '../roster.js';
import {emojiStory,keepsakes} from '../wrapped-model.js';
import {screenTime,summary} from '../wrapped-poster.js';

test('Wrapped soma emojis recebidos nas rodadas existentes e preserva empates',()=>{
 const rounds=[{day:20,counts:{ob:2}},{day:21,counts:{ob:32}},{day:22,counts:{bruno:1}}];
 const story=emojiStory(rounds,'ob');
 assert.deepEqual(story.leaders,EMOJIS.slice(0,2));
 assert.equal(story.count,2);
 assert.deepEqual(story.days.map(d=>d.day),[20,21]);
 assert.deepEqual(emojiStory(rounds,'diogo'),{count:0,leaders:[],days:[]});
});
test('só reserva o coração quando ele lidera para a maioria do grupo',()=>{
 const counts=Object.fromEntries(ALL.map((id,i)=>[id,i<6?18:32]));
 counts.bruno=20;
 const rounds=[{day:20,counts}];
 assert.deepEqual(emojiStory(rounds,'ob').leaders,['❤️']);
 counts[ALL[6]]=18;
 const winner=emojiStory(rounds,'bruno');
 assert.deepEqual(winner.leaders,['❤️']);assert.equal(winner.count,4);
 const other=emojiStory(rounds,'ob');
 assert.deepEqual(other.leaders,['💔']);assert.equal(other.count,1);
 assert.deepEqual(other.days,[{day:20,leaders:['💔']}]);
});
test('os 13 têm lembranças e tempos de tela distintos, inclusive no resumo compartilhável',()=>{
 assert.deepEqual(Object.keys(keepsakes).sort(),[...ALL].sort());
 const minutes=ALL.map(id=>keepsakes[id][0]);assert.equal(new Set(minutes).size,13);
 for(const id of ALL){
  const [minutes,title,memory]=keepsakes[id];assert(Number.isInteger(minutes)&&minutes>0&&minutes<24*60);assert(title&&memory);
  const data={id,nick:id,emoji:{leaders:['❤️'],count:4},points:87,rank:2,minutes,title,memory};
  const card=summary(7,data);assert(card.includes('2º lugar'));assert(card.includes('87 pontos'));assert(card.includes(screenTime(minutes)));assert(summary(4,data).includes(screenTime(minutes)));assert.doesNotMatch(card+' '+summary(4,data),/fictíci|inventad/i);
 }
});

