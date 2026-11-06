export const CARS=[
 {day:18,period:'À noite',driver:'igor',people:['igor','pig','pelado'],note:'Mantimentos no carro.'},
 {day:18,period:'À noite',driver:'nanu',people:['nanu','cadu','ob','diogo'],note:'Carro alugado.'},
 {day:19,period:'À noite',driver:'bruno',people:['bruno','ibrahim'],note:''},
 {day:20,period:'De manhã',driver:'felipe',people:['felipe','gherardi','luan'],note:''}
];
export function departureFor(id,day){return CARS.find(c=>c.day===day&&c.people.includes(id))||null;}
export function departure(id){const car=CARS.find(c=>c.people.includes(id));return car?{...car,time:car.day===20?'08:00':'20:00',start:Date.parse(`2026-11-${car.day}T${car.day===20?'08':'20'}:00:00-03:00`)}:null;}
export function availableDay(id){return departure(id)?.day||18;}
export function agendaFor(items,id){const d=departure(id);return d?items.filter(a=>a.start>=d.start):items;}
export function votePeople(ids,day){return day===19?ids.filter(id=>!['bruno','ibrahim','felipe','gherardi','luan'].includes(id)):ids;}
