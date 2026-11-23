// Original 112 BPM score. One audio clock drives the groove; scene cues play on demand.
export function wrappedSound(){
 let ctx,bus,noise,interval,next=0,pulse=0,chapter=0,building=false,version=0;
 const chords=[[50,57,60,65],[46,53,57,62],[53,60,64,69],[48,55,58,64]];
 const melody=[0,null,2,null,null,1,3,null,2,null,null,0,null,3,null,1];
 const frequency=note=>440*2**((note-69)/12);
 function tone(at,note,length,level,wave='sine',endHz){
  const osc=ctx.createOscillator(),amp=ctx.createGain();
  osc.type=wave;osc.frequency.setValueAtTime(frequency(note),at);
  if(endHz)osc.frequency.exponentialRampToValueAtTime(endHz,at+length);
  amp.gain.setValueAtTime(.0001,at);amp.gain.exponentialRampToValueAtTime(level,at+.009);
  amp.gain.exponentialRampToValueAtTime(.0001,at+length);
  osc.connect(amp).connect(bus);osc.start(at);osc.stop(at+length+.01);
  osc.onended=()=>{osc.disconnect();amp.disconnect();};
 }
 function hiss(at,length,hz,level){
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),amp=ctx.createGain();
  src.buffer=noise;filter.type='highpass';filter.frequency.value=hz;
  amp.gain.setValueAtTime(level,at);amp.gain.exponentialRampToValueAtTime(.0001,at+length);
  src.connect(filter).connect(amp).connect(bus);src.start(at);src.stop(at+length);
  src.onended=()=>{src.disconnect();filter.disconnect();amp.disconnect();};
 }
 function groove(){
  if(ctx.state!=='running')return;
  if(next<ctx.currentTime)next=ctx.currentTime+.025;
  while(next<ctx.currentTime+.15){
   const n=pulse%16,bar=Math.floor(pulse/16),chord=chords[bar%4];
   if(!building){
    if(n%4===0)tone(next,43,.19,.53,'sine',40);
    if(n===4||n===12)hiss(next,.12,1200,.27);
    if([0,3,6,10,14].includes(n))tone(next,chord[0]-12+(n===14?12:0),.23,.31,'triangle');
    if(n===2||n===10)chord.forEach((v,i)=>tone(next+i*.008,v+12,.43,.073,'triangle'));
    const degree=melody[(n+bar%2*2)%16];
    if(degree!==null&&chapter!==6)tone(next,chord[degree]+24,.18,.07);
   }else if(n%4===0){tone(next,chord[0],.32,.20);}
   if(n%4===2||(!building&&n===15))hiss(next,n===14?.13:.046,6100,.15);
   next+=60/112/4;pulse++;
  }
 }
 function silence(){
  version++;clearInterval(interval);interval=null;
  if(ctx&&ctx.state!=='closed'){bus.gain.cancelScheduledValues(ctx.currentTime);bus.gain.value=0;void ctx.suspend().catch(()=>{});}
 }
 async function start(){
  const id=++version;
  try{
   if(!ctx){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;
    ctx=new Audio();bus=ctx.createGain();bus.gain.value=0;bus.connect(ctx.destination);
    noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.4),ctx.sampleRate);
    const samples=noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
   }
   await ctx.resume();if(id!==version||ctx.state!=='running')return false;
   bus.gain.setTargetAtTime(.31,ctx.currentTime,.025);
   if(!interval){next=ctx.currentTime+.03;groove();interval=setInterval(groove,60);}
   return true;
  }catch{return false;}
 }
 function cue(kind){
  if(!interval||ctx.state!=='running')return;
  const at=ctx.currentTime+.015;
  if(kind==='build'||kind==='two'||kind==='one'){
   const pitch={build:65,two:69,one:74}[kind];tone(at,pitch,.18,.24,'triangle');return;
  }
  if(kind==='reveal'&&chapter===3){tone(at,46,.32,.48,'sine',38);hiss(at,.16,1900,.22);}
  if(kind==='reveal'&&chapter===6){hiss(at,.045,2200,.32);hiss(at+.07,.06,2600,.16);return;}
  if(kind==='flip'){hiss(at,.09,2900,.18);return;}
  const notes=kind==='final'?[62,65,69,74,77]:[69,76];
  notes.forEach((v,i)=>tone(at+i*.078,v,kind==='final'?.7:.38,.23));
 }
 return {start,silence,cue,scene(i,pending){chapter=i;building=pending;},
  close(){silence();if(ctx)void ctx.close().catch(()=>{});}};
}

