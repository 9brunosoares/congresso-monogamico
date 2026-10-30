export function swipeDirection(start,end){
 const dx=end.x-start.x,dy=end.y-start.y;
 return end.time-start.time<=900 && Math.abs(dx)>=60 && Math.abs(dx)>Math.abs(dy)*1.5 ? (dx<0?1:-1):0;
}
export function adjacentDay(days,current,direction){
 const index=days.indexOf(current);
 return index<0?current:days[Math.max(0,Math.min(days.length-1,index+direction))];
}
export function bindAgendaSwipe(doc,isActive,onSwipe){
 let start=null;
 doc.addEventListener('touchstart',event=>{
  start=null;
  if(!isActive()||event.touches.length!==1||!event.target.closest('.agenda-swipe')||event.target.closest('button,a,input,select,textarea,.scrim'))return;
  const touch=event.touches[0],width=doc.documentElement.clientWidth;
  // As bordas ficam livres para os gestos do sistema.
  if(touch.clientX<24||touch.clientX>width-24)return;
  start={x:touch.clientX,y:touch.clientY,time:event.timeStamp};
 },{passive:true});
 doc.addEventListener('touchmove',event=>{
  if(!start)return;
  if(event.touches.length!==1){start=null;return;}
  const touch=event.touches[0],dx=Math.abs(touch.clientX-start.x),dy=Math.abs(touch.clientY-start.y);
  // Uma rolagem que começou na vertical nunca troca o dia ao terminar.
  if(dy>12&&dy>dx)start=null;
 },{passive:true});
 doc.addEventListener('touchcancel',()=>{start=null;},{passive:true});
 doc.addEventListener('touchend',event=>{
  const began=start;start=null;
  if(!began||!isActive()||event.touches.length||event.changedTouches.length!==1)return;
  const touch=event.changedTouches[0],direction=swipeDirection(began,{x:touch.clientX,y:touch.clientY,time:event.timeStamp});
  if(direction)onSwipe(direction);
 },{passive:true});
}
