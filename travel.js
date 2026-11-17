export const CARS=[
 {day:18,period:'À noite',driver:'nanu',time:'19:00',people:['nanu','cadu','ob','pig'],note:'Carro alugado.'},
 {day:19,period:'À noite',driver:'igor',time:'20:00',people:['igor','diogo'],note:'Comidas'},
 {day:19,period:'À noite',driver:'bruno',time:'20:00',people:['bruno','ibrahim','pelado'],note:'Aperóis'},
 {day:20,period:'De manhã',driver:'felipe',time:'08:00',people:['felipe','gherardi','luan'],note:'Espumantes'},
 {day:null,driver:'sadano',people:['sadano'],note:'Cervejas'}
];
export function carFor(id){return CARS.find(car=>car.people.includes(id))||null;}
export function departureFor(id,day){const car=carFor(id);return car?.day===day?car:null;}
export function departure(id){
 const car=carFor(id);
 if(!car?.day)return null;
 return {...car,start:Date.parse(`2026-11-${car.day}T${car.time}:00-03:00`)};
}
export function availableDay(id){return departure(id)?.day||18;}
export function agendaFor(items,id){const d=departure(id);return d?items.filter(a=>a.start>=d.start):items;}
export function votePeople(ids,day){return day===19?ids.filter(id=>availableDay(id)<day):ids;}
