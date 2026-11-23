const W=720,H=960,ink='#18142b',paper='#fff5de',melon='#ff685b',lime='#dfff46',violet='#ac91ff',pink='#ffa1ca';
const themes=[[violet,ink,lime],[pink,ink,melon],[lime,ink,violet],[melon,ink,pink],[ink,lime,melon],[violet,ink,lime],[paper,ink,pink],[lime,ink,violet]];
const titles=['Sua credencial','Queridômetro','Seu momento XVI','Placar geral','Tempo de tela','Fofoca anônima','A foto que fica','Seu card'];
export const slides=titles;
const num=n=>n.toLocaleString('pt-BR');
export function screenTime(minutes){return num(Math.floor(minutes/60))+' h '+String(minutes%60).padStart(2,'0')+' min';}

export function summary(i,d){
 const {nick,emoji,points,rank,minutes,title,memory}=d;
 const leaders=emoji.leaders.join(' ');
 const emojiResult=leaders?leaders+' · '+emoji.count+(emoji.leaders.length>1?' de cada':' recebidos'):'Sem destaque nesta edição';
 return [
  nick+' · Cinco dias, treze congressistas. Esta edição é sua.',
  d.guess===null?'Qual emoji marcou seu XVI?':emojiResult,
  title+' '+memory,
  rank+'º lugar no placar geral, com '+num(points)+' pontos.',
  'Tempo de tela: '+screenTime(minutes)+'. Mais tempo de tela, mais diversão.',
  '35 mensagens na Fofoca durante a viagem. O pico foi domingo, 22/11, das 9h às 10h: quatro mensagens.',
  d.id==='diogo'?'Diogo, dez pontos no Quiz dos Especialistas. Que bom que você estava lá.':'Retrospectiva do Meu An*. Que bom que você estava lá, '+nick+'.',
  nick+' · '+rank+'º lugar · '+num(points)+' pontos · '+emojiResult+' · '+screenTime(minutes)+' · '+title
 ][i];
}

// Draw the actual poster, including the keepsake. The same canvas supplies the PNG.
export function paintPoster(canvas,i,d){
 const g=canvas.getContext('2d');const [bg,fg,accent]=themes[i];
 g.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);g.fillStyle=bg;g.fillRect(0,0,W,H);
 const font=(s,weight=800)=>weight+' '+s+'px "Bricolage Grotesque",Arial,sans-serif';
 function type(str,x,y,size,color=fg,limit=640,weight=800){
  g.font=font(size,weight);
  while(size>14&&g.measureText(str).width>limit)g.font=font(--size,weight);
  g.fillStyle=color;g.fillText(str,x,y);
 }
 function mono(str,x,y,color=fg,size=20){g.font='bold '+size+'px "JetBrains Mono",monospace';g.fillStyle=color;g.fillText(str,x,y);}
 function copy(str,x,y,width,size=35,color=fg){
  g.font=font(size,600);g.fillStyle=color;let line='';
  for(const word of str.split(' ')){
   const next=line?line+' '+word:word;
   if(line&&g.measureText(next).width>width){g.fillText(line,x,y);y+=size*1.18;line=word;}else line=next;
  }
  g.fillText(line,x,y);
 }
 function orbit(x,y,r,angle,col,n=12){
  g.save();g.translate(x,y);g.rotate(angle);g.strokeStyle=col;g.lineWidth=5;
  for(let j=0;j<n;j++){g.beginPath();g.ellipse(0,0,r+j*12,r*.30+j*8,0,0,Math.PI*2);g.stroke();}
  g.restore();
 }
 function burst(x,y,r,col){
  g.fillStyle=col;g.beginPath();for(let j=0;j<32;j++){const t=j*Math.PI/16,rr=j%2?r*.66:r;
   const px=x+Math.cos(t)*rr,py=y+Math.sin(t)*rr;if(j)g.lineTo(px,py);else g.moveTo(px,py);}
  g.closePath();g.fill();
 }
 function photo(img,x,y,w,h,profile=false){
  g.fillStyle=accent;g.fillRect(x,y,w,h);
  if(!img){type(d.nick,x+14,y+h*.55,60,ink,w-28);return;}
  let sx=0,sy=0,sw=img.naturalWidth,sh=img.naturalHeight;
  if(profile&&d.frame){const [ow,oh,ox,oy,side]=d.frame;sx=ox*sw/ow;sy=oy*sh/oh;sw=side*sw/ow;sh=side*sh/oh;}
  const ratio=w/h;if(sw/sh>ratio){sx+=(sw-sh*ratio)/2;sw=sh*ratio;}else{sy+=(sh-sw/ratio)*.33;sh=sw/ratio;}
  g.drawImage(img,sx,sy,sw,sh,x,y,w,h);
 }
 function yearTag(){mono('XVI   /   2026',38,54);mono('COMORG',585,54);}
 function footer(label){g.fillStyle=fg;g.fillRect(38,887,644,2);mono(label,38,926,fg,16);mono(String(i+1).padStart(2,'0')+' / 08',594,926,fg,16);}
 function smallPortrait(x,y,r){g.save();g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.clip();photo(d.avatar,x-r,y-r,r*2,r*2,true);g.restore();}
 yearTag();
 if(i===0){
  orbit(355,445,155,-.42,ink,15);burst(576,283,86,lime);
  type('CONGRESSO',36,166,95);type('Wrapped',30,291,155);
  smallPortrait(353,484,116);type(d.nick,37,760,148);copy('Cinco dias. Treze congressistas. Esta edição é sua.',41,812,640,31);
 }else if(i===1){
  type('Queridômetro',36,166,93);
  if(d.guess===null){orbit(555,481,163,-.9,melon,15);type('?',46,596,470);type('Qual emoji',36,760,72);type('marcou seu XVI?',36,838,77);}
  else{
   const leaders=d.emoji.leaders.join(' ');burst(550,405,140,melon);
   type(leaders||'—',35,470,167,fg,650);type(d.emoji.count+'×',32,662,166);
   copy(!leaders?'Sem destaque nesta edição.':d.emoji.leaders.length>1?'Empate no topo. Essa foi a contagem de cada emoji.':d.emoji.leaders.includes(d.guess)?'Acertou. Você conhece a sua reputação.':'Esse emoji marcou seu congresso.',40,728,630,33);
   const first=d.emoji.days[0],last=d.emoji.days.at(-1);
   if(first&&last&&first!==last){type(first.day+'/11  '+first.leaders.join('')+'     →     '+last.day+'/11  '+last.leaders.join(''),40,842,31,fg,640,600);}
  }
 }else if(i===2){
  orbit(628,242,116,-.7,violet);mono('SEU MOMENTO XVI',40,134);
  const words=d.title.split(' ');let y=294,line='';g.font=font(81);
  for(const word of words){const next=(line+' '+word).trim();if(line&&g.measureText(next).width>615){type(line,38,y,81);line=word;y+=84;}else line=next;}type(line,38,y,81);
  g.fillStyle=ink;g.fillRect(0,567,W,297);copy(d.memory,40,636,630,39,paper);
 }else if(i===3){
  type('Placar geral',37,166,101);orbit(565,483,172,-.57,pink,14);
  type(d.rank+'º',21,591,360,ink);type('lugar',42,682,103);
  g.fillStyle=ink;g.fillRect(39,750,642,95);type(num(d.points)+' pontos',60,817,64,paper,592);
 }else if(i===4){
  type('Tempo de tela',38,164,96);orbit(610,510,210,-.86,'#553e76',18);
  type(num(Math.floor(d.minutes/60))+' h',27,480,208,lime);
  type(String(d.minutes%60).padStart(2,'0')+' min',38,598,105,melon);
  type('Mais tempo de tela,',38,763,67,lime);type('mais diversão.',38,838,76,lime);
 }else if(i===5){
  type('Plantão da',37,164,101);type('fofoca',33,287,148);
  orbit(612,558,138,.65,lime,15);type('09h',30,573,225);
  mono('DOMINGO   /   22 NOV',42,633);
  copy('Quatro mensagens entre 9h e 10h. Foi a hora mais falante das 35 mensagens da viagem.',42,731,636,38);
 }else if(i===6){
  mono(d.id==='diogo'?'QUIZ DOS ESPECIALISTAS':'RETROSPECTIVA DO MEU AN*',40,130);
  g.save();g.translate(355,439);g.rotate(-.045);g.fillStyle=ink;g.fillRect(-220,-266,452,552);
  photo(d.presentation||d.avatar,-211,-257,422,511,!d.presentation);g.restore();
  type('Que bom que',38,786,76);type('você estava lá.',38,855,80);
 }else{
  type('Congresso Wrapped',38,131,63);orbit(601,326,100,-.48,violet,12);
  smallPortrait(538,330,102);type(d.nick,32,380,142,ink,380);
  g.fillStyle=ink;g.fillRect(0,454,W,117);type(d.rank+'º lugar',36,530,77,lime,332);type(num(d.points)+' pts',400,529,58,paper,278);
  mono('QUERIDÔMETRO',40,633);mono('TEMPO DE TELA',374,633);
  type(d.emoji.leaders.join(' ')||'—',38,704,62,ink,293);type(screenTime(d.minutes),371,698,45,ink,307);
  copy(d.title,40,777,640,36);mono('MAIS TEMPO DE TELA, MAIS DIVERSÃO.',40,856,ink,17);
 }
 footer(i===7?'XVI CONGRESSO MONOGÂMICO':'18—22 NOV   /   VARGEM, SP');
}

