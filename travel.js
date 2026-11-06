export const CARS=[
 {day:18,period:'À noite',driver:'igor',people:['igor','pig','pelado'],note:'Mantimentos no carro.'},
 {day:18,period:'À noite',driver:'nanu',people:['nanu','cadu','ob','diogo'],note:'Carro alugado.'},
 {day:19,period:'À noite',driver:'bruno',people:['bruno','ibrahim'],note:''},
 {day:20,period:'De manhã',driver:'felipe',people:['felipe','gherardi','luan'],note:''}
];
export function departureFor(id,day){return CARS.find(c=>c.day===day&&c.people.includes(id))||null;}
