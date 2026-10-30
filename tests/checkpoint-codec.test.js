import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{encode,decode}=require('../scripts/checkpoint-codec.cjs');
const {Timestamp,GeoPoint}=require('firebase-admin/firestore');
test('checkpoint preserva timestamps com nanos, bytes, referências e mapas sem colisão',()=>{
 const db={doc:path=>({path,firestore:db})};
 const source={stamp:new Timestamp(1793332800,123456789),point:new GeoPoint(-23.55,-46.63),bytes:Buffer.from([0,255,1]),ref:db.doc('expenses/example'),nested:{before:{amountCents:264000},after:{split:['bruno','pig']}},literal:{$firestore:'timestamp',seconds:4},values:[null,true,'teste',NaN,Infinity,-Infinity]};
 const encoded=encode(source),decoded=decode(JSON.parse(JSON.stringify(encoded)),db);
 assert(decoded.stamp.isEqual(source.stamp));assert(decoded.point.isEqual(source.point));assert(decoded.bytes.equals(source.bytes));assert.equal(decoded.ref.path,source.ref.path);
 assert.deepEqual(decoded.literal,source.literal);assert.deepEqual(decoded.nested,source.nested);assert(Number.isNaN(decoded.values[3]));assert.equal(decoded.values[4],Infinity);
 assert.deepEqual(encode(decoded),encoded);
});
