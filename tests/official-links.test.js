import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeOfficialLinks,EMPTY_OFFICIAL_LINKS} from '../official-links.js';
test('links oficiais aceitam HTTPS, removem espaços das URLs e preservam senha exata',()=>{
 const data=normalizeOfficialLinks({...EMPTY_OFFICIAL_LINKS,albumUrl:' https://photos.app.goo.gl/example ',playlistUrl:'https://open.spotify.com/playlist/example?pt=example',wifiPassword:' senha com espaços '});
 assert.equal(data.albumUrl,'https://photos.app.goo.gl/example');assert.equal(data.wifiPassword,' senha com espaços ');assert(data.playlistUrl.endsWith('?pt=example'));
 for(const url of ['javascript:alert(1)','http://example.com','https://user:pass@example.com','https://example.com/"x','https://example.com/ x'])assert.throws(()=>normalizeOfficialLinks({...EMPTY_OFFICIAL_LINKS,mapUrl:url}));
 assert.throws(()=>normalizeOfficialLinks({...EMPTY_OFFICIAL_LINKS,wifiPassword:'x'.repeat(121)}));
});
