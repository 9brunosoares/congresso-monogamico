const motifs=['record','bloom','fold','race','dial','signal','print','record'];
export const beats=[
 ['#ab94ff','#20162c','#deff50',''],['#ffb1db','#33102d','#fb5b32','Seu emoji é…'],
 ['#ddff50','#202017','#9082ff','Lembra dessa?'],['#ff7451','#261527','#ffbcde','Sua posição no placar…'],
 ['#231735','#e6ff63','#f595d8','Somando os minutos…'],['#99a5ff','#211839','#eaff5e','Quando a fofoca ferveu?'],
 ['#fff0da','#281b2e','#fd674d','Uma última lembrança…'],['#dcff48','#191429','#a88afc','']
];
const fmt=n=>n.toLocaleString('pt-BR');
function portrait(d){
 if(!d.avatar)return '<span class="ws-initial">'+d.nick[0]+'</span>';
 let style='';
 if(d.frame){const [w,h,x,y,size]=d.frame;style='width:'+w/size*100+'%;height:'+h/size*100+'%;left:'+(-x/size*100)+'%;top:'+(-y/size*100)+'%;';}
 return '<img alt="" src="'+d.avatar.src+'" style="'+style+'">';
}
function artwork(i){return '<div aria-hidden="true" class="ws-motif ws-'+motifs[i]+'"><i></i><i></i><i></i></div>';}
export function sceneMarkup(i,d){
 const leads=d.emoji.leaders,first=d.emoji.days[0],last=d.emoji.days.at(-1);
 let content;
 switch(i){
  case 0:content=`<div class="ws-cover-title"><span>Congresso</span><b>Wrapped</b></div><div class="ws-disc-portrait">${portrait(d)}</div><div class="ws-sign"><strong>${d.nick}</strong><p>Cinco dias. Treze congressistas.<br>Esta edição é sua.</p></div>`;break;
  case 1:
   if(d.guess===null){content='<div class="ws-question-mark" aria-hidden="true">?</div><h2 class="ws-lower">Qual emoji<br>marcou seu XVI?</h2>';break;}
   content=`<div class="ws-stack"><div class="ws-emoji">${leads.join(' ')||'—'}</div><strong class="ws-number">${d.emoji.count}×</strong><p>${!leads.length?'Sem destaque nesta edição.':leads.length>1?'Empate no topo. Essa foi a contagem de cada emoji.':leads.includes(d.guess)?'Acertou. Você conhece a sua reputação.':'Esse emoji marcou seu congresso.'}</p>${first&&last&&first!==last?`<small>${first.day}/11  ${first.leaders.join('')}　→　${last.day}/11  ${last.leaders.join('')}</small>`:''}</div>`;break;
  case 2:content='<div class="ws-stack ws-memory"><h2>'+d.title+'</h2><p>'+d.memory+'</p></div>';break;
  case 3:content='<div class="ws-stack"><strong class="ws-number ws-rank">'+d.rank+'º</strong><h2>lugar</h2><p class="ws-ticket">'+fmt(d.points)+' pontos</p></div>';break;
  case 4:content=`<div class="ws-stack"><strong class="ws-clock">${Math.floor(d.minutes/60)}<em>h</em><br><span>${String(d.minutes%60).padStart(2,'0')} min</span></strong><p>Mais tempo de tela,<br><b>mais diversão.</b></p></div>`;break;
  case 5:content='<div class="ws-stack"><strong class="ws-number">09h</strong><small>DOMINGO　22 NOV</small><p>Quatro mensagens entre 9h e 10h. Foi a hora mais falante das 35 mensagens da viagem.</p></div>';break;
  case 6:content=`<div class="ws-print"><div class="ws-photo">${d.presentation?'<img alt="" src="'+d.presentation.src+'">':portrait(d)}</div><small>${d.id==='diogo'?'QUIZ DOS ESPECIALISTAS':'RETROSPECTIVA DO MEU AN*'}</small></div><h2 class="ws-photo-title">Que bom que<br>você estava lá.</h2>`;break;
  default:return '';
 }
 return artwork(i)+'<div class="ws-content">'+content+'</div>';
}
const leadIns=[[],['🍪','🐍','🎯'],['X','XV','XVI'],['03','02','01'],['00:00','00:59','01:00'],['·','··','···'],['▧','▨','▩']];
export function beatMark(scene,beat){return leadIns[scene][beat];}
export function anticipation(i){return artwork(i)+'<div class="ws-pending"><div class="ws-count" aria-hidden="true">'+beatMark(i,0)+'</div><h2>'+beats[i][3]+'</h2></div>';}
export function introMarkup(){return artwork(0)+'<div class="ws-content"><div class="ws-cover-title"><span>Congresso</span><b>Wrapped</b></div><span class="ws-year">XVI</span></div>';}

