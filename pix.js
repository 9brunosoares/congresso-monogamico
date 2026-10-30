export const PIX_TYPES={aleatoria:'Chave aleatória',cpf:'CPF',telefone:'Celular',email:'E-mail'};
export function normalizePix(type,value){
 let key=String(value).trim();
 if(!Object.hasOwn(PIX_TYPES,type))throw Error('Escolha o tipo da chave Pix.');
 if(type==='aleatoria'){
  key=key.toLowerCase();if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(key))throw Error('Cole a chave aleatória completa, com os hífens.');
 }
 if(type==='email'){
  key=key.toLowerCase();if(key.length>77||!/^\S+@\S+\.\S+$/.test(key))throw Error('Informe um e-mail válido para a chave Pix.');
 }
 if(type==='telefone'){
  const digits=key.replace(/\D/g,'');key=key.startsWith('+')?'+'+digits:(digits.length===10||digits.length===11?'+55'+digits:'+'+digits);
  if(!/^\+[1-9][0-9]{9,14}$/.test(key))throw Error('Informe o celular com DDD e código do país.');
 }
 if(type==='cpf'){
  key=key.replace(/[.\-\s]/g,'');
  if(!/^\d{11}$/.test(key)||/^(\d)\1{10}$/.test(key))throw Error('Informe um CPF válido.');
  for(let size=9;size<=10;size++){
   let sum=0;for(let i=0;i<size;i++)sum+=Number(key[i])*(size+1-i);
   const digit=(sum*10%11)%10;if(digit!==Number(key[size]))throw Error('Informe um CPF válido.');
  }
 }
 return {type,value:key};
}
