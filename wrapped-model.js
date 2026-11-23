import {decodeTally} from './shared.js?v=20261122e';
import {ALL,EMOJIS} from './roster.js?v=20261120j';

// Tempo de tela e lembrança de cada edição pessoal.
export const keepsakes = {
 bruno:[60480,'O congresso coube no seu bolso.','Você fez o app. Depois precisou de um app para contar o que aconteceu no app.'],
 cadu:[48967,'O javali era de verdade.','Tinha um javali escondido no aplicativo. Você achou um na vida real. A COMORG pagou 10 pontos.'],
 diogo:[31746,'Diploma duplo.','Dez pontos na lona. Dez no Quiz dos Especialistas. Currículo igualmente forte na teoria e na prática.'],
 felipe:[43219,'O palco foi seu.','Você levou o primeiro lugar no ranking das apresentações. Dessa vez, a retrospectiva que entrou para a história foi a sua.'],
 gherardi:[53984,'O presente era nosso.','O app chegou no seu aniversário. Você devolveu o presente com o segundo lugar nas apresentações.'],
 ibrahim:[28633,'Em doses de vinte.','Sua retrospectiva foi em doses. Na lona e no Quiz dos Especialistas, sua dose foi a mesma: 20 pontos em cada.'],
 igor:[79123,'O futuro está anotado.','Você guardou os palpites do grupo para conferir com o tempo. Agora é só esperar até 2030. Ou mais cem anos.'],
 luan:[36858,'Quem acordou o javali?','Você. O javali virtual saiu do sono, foi atrás de você e deixou 20 pontos no seu placar.'],
 nanu:[88141,'O amor virou estatística.','Quarenta e um candidatos, onze perguntas e um congresso inteiro tentando explicar por que você não namora.'],
 ob:[42112,'A Matrix caiu na lona.','Você levou os reptilianos para o telão e saiu da dinâmica da lona com 20 pontos. Duas realidades bem documentadas.'],
 pelado:[57137,'O galo também pontuou.','A lona rendeu 20 pontos. A briga de galo rendeu outros 5. O departamento de esportes agradece.'],
 pig:[67321,'A lona tinha contramão.','Todo mundo sabia descer. Você subiu pela lona e ainda ganhou 5 pontos por isso.'],
 sadano:[38999,'A chave estava com você.','Você encontrou a chave da cozinha. A casa voltou a funcionar e o achado rendeu 3 pontos.']
};

function leaders(tally,choices){
 const count=Math.max(...choices.map(e=>tally[e]));
 return {count,leaders:count?choices.filter(e=>tally[e]===count):[]};
}

function profileTallies(rounds,id){
 const totals=Object.fromEntries(EMOJIS.map(e=>[e,0]));
 const days=[];
 for(const {day,counts} of rounds){
  const tally=decodeTally(counts?.[id]||0);
  for(const e of EMOJIS)totals[e]+=tally[e];
  days.push({day,tally});
 }
 return {totals,days};
}

export function emojiStory(rounds,id){
 const heart='❤️';
 const profiles=ALL.map(person=>({person,...profileTallies(rounds,person)}));
 const common=profiles.filter(p=>leaders(p.totals,EMOJIS).leaders.includes(heart)).length>ALL.length/2;
 const mostHearts=profiles.reduce((best,p)=>p.totals[heart]>best.totals[heart]?p:best);
 const choices=common?(mostHearts.person===id?[heart]:EMOJIS.filter(e=>e!==heart)):EMOJIS;
 const profile=profiles.find(p=>p.person===id);
 const days=profile.days.map(({day,tally})=>({day,leaders:leaders(tally,choices).leaders})).filter(d=>d.leaders.length);
 return {...leaders(profile.totals,choices),days};
}

