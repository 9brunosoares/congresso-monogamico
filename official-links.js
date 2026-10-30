export const EMPTY_OFFICIAL_LINKS={albumUrl:'',playlistUrl:'',mapUrl:'',airbnbUrl:'',address:'',wifiName:'',wifiPassword:''};
export function normalizeOfficialLinks(input){
 const result={};
 for(const [field,max] of Object.entries({albumUrl:2000,playlistUrl:2000,mapUrl:2000,airbnbUrl:2000,address:300,wifiName:80,wifiPassword:120})){
  const raw=String(input[field]??''),value=field==='wifiPassword'?raw:raw.trim();
  if(value.length>max)throw Error('Um dos campos excedeu o limite permitido.');
  if(field.endsWith('Url')&&value){
   let url;try{url=new URL(value)}catch{throw Error('Informe um link HTTPS válido.');}
   if(url.protocol!=='https:'||!url.hostname||url.username||url.password||/[\s<>"\x00-\x1f]/.test(value))throw Error('Informe um link HTTPS válido.');
  }
  result[field]=value;
 }
 return result;
}
