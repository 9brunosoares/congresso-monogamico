import {P} from './roster.js?v=20261120j';
export const RETURN_NOTE='Procure o motorista para combinar o horário';
export const RETURN_CARS=[
 {driver:'nanu',people:['nanu','pelado']},
 {driver:'bruno',people:['bruno','ibrahim']},
 {driver:'felipe',people:['ob','felipe','cadu','luan']},
 {driver:'igor',people:['igor','pig','diogo','gherardi']},
 {driver:'sadano',people:['sadano']}
];
export function returnActivity(activity,id){
 const car=RETURN_CARS.find(car=>car.people.includes(id));
 if(!car||activity.d!==22||!/^volta (?:para|pra) são paulo/i.test(activity.title||''))return activity;
 const note=activity.note||RETURN_NOTE;
 return {...activity,place:`Carro de ${P[car.driver].nick}`,travelPeople:car.people.map(id=>P[id].nick).join(' · '),note,travelNote:note};
}
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
