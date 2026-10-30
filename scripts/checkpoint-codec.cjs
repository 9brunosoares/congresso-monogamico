// JSON sem perda de tipos do Firestore; não contém credenciais de conexão.
const {Timestamp,GeoPoint}=require('firebase-admin/firestore');
function encode(value){
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number')return Number.isFinite(value)?value:{$firestore:'number',value:String(value)};
 if(Buffer.isBuffer(value)||value instanceof Uint8Array)return {$firestore:'bytes',value:Buffer.from(value).toString('base64')};
 if(value instanceof Timestamp)return {$firestore:'timestamp',seconds:value.seconds,nanoseconds:value.nanoseconds};
 if(value instanceof GeoPoint)return {$firestore:'geopoint',latitude:value.latitude,longitude:value.longitude};
 if(value instanceof Date)return {$firestore:'date',value:value.toISOString()};
 if(value?.firestore&&typeof value.path==='string')return {$firestore:'reference',path:value.path};
 if(Array.isArray(value))return value.map(encode);
 if(value&&Object.getPrototypeOf(value)===Object.prototype)return {$firestore:'map',entries:Object.entries(value).map(([key,v])=>[key,encode(v)])};
 throw Error('Tipo não suportado no checkpoint: '+value?.constructor?.name);
}
function decode(value,db){
 if(value===null||typeof value!=='object')return value;
 if(Array.isArray(value))return value.map(v=>decode(v,db));
 switch(value.$firestore){
  case 'number':return Number(value.value);
  case 'bytes':return Buffer.from(value.value,'base64');
  case 'timestamp':return new Timestamp(value.seconds,value.nanoseconds);
  case 'geopoint':return new GeoPoint(value.latitude,value.longitude);
  case 'date':return new Date(value.value);
  case 'reference':if(!db)throw Error('Referência exige banco de destino.');return db.doc(value.path);
  case 'map':return Object.fromEntries(value.entries.map(([key,v])=>[key,decode(v,db)]));
  default:throw Error('Tipo inválido no checkpoint.');
 }
}
module.exports={encode,decode};
