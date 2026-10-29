export const PEOPLE = [
  {id:"bruno", nick:"Bruno", admin:true, frame:[583,280,50,7,260]},
  {id:"ob", nick:"OB"},
  {id:"luan", nick:"Luan"},
  {id:"igor", nick:"Igor", admin:true},
  {id:"pig", nick:"Pig", admin:true},
  {id:"pelado", nick:"Pelado"},
  {id:"kirk", nick:"Kirk", frame:[1179,337,96,165,120]},
  {id:"gherardi", nick:"Gherardi"},
  {id:"nanu", nick:"Nanu"},
  {id:"sadano", nick:"Sadano", frame:[875,286,49,20,258]},
  {id:"ibrahim", nick:"Ibrahim", frame:[1179,337,96,12,120]},
  {id:"cadu", nick:"Cadu"},
  {id:"diogo", nick:"Diogo"},
  {id:"felipe", nick:"Felipe", frame:[489,316,49,35,256]},
];
export const ALL = PEOPLE.map(p=>p.id);
export const P = Object.fromEntries(PEOPLE.map(p=>[p.id,p]));
export const EMOJIS = ["❤️","💔","🐍","🤮","🧳","🍪","🤥","🎯"];


