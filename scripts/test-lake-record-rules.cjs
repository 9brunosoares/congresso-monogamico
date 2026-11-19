// Avalia somente documentos simulados no serviço oficial de regras.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { context } = require('./firebase-context.cjs');

(async () => {
 const c = await context();
 try {
  const root = '/databases/(default)/documents', uid = 'lake-test-user';
  const recordPath = root + '/mapRecords/latinhas', tests = [], names = [];
  const add = (name, sample) => { names.push(name); tests.push(sample); };
  const mock = (fn, ref, value) => ({ function: fn, args: [{ exactValue: ref }], result: { value } });
  function sample({ target = 'record', actor = 'ob', before = 26, pts = 27, closed = false,
                    pointPatch = {}, recordPatch = {}, method, time = '2026-11-19T15:00:00.000Z',
                    missingPoint = false, missingRecord = false, existsPoint = false, expectation = 'ALLOW' } = {}) {
   const record = { by: actor, pts, t: time, ...recordPatch };
   const point = { who: actor, d: 15, kind: 'jogo', why: `Recorde da represa · ${pts} pontos`, at: '19/11, 12:00', createdAt: time, ...pointPatch };
   const pointPath = root + '/points/lake_' + pts;
   return { expectation, request: { auth: { uid, token: { email: actor + '@congresso.app' } }, time,
    path: target === 'record' ? recordPath : pointPath,
    method: method || (target === 'record' && before ? 'update' : 'create'),
    resource: { data: target === 'record' ? record : point } },
    resource: { data: target === 'record' ? { by: 'igor', pts: before, t: '2026-11-18T15:00:00.000Z' } : point },
    functionMocks: [mock('get', root + '/people/' + actor, { data: { uid } }),
     mock('exists', root + '/admins/' + uid, actor === 'bruno'),
     mock('exists', root + '/scoreClosures/main', closed),
     mock('exists', recordPath, !!before), mock('get', recordPath, { data: { by: 'igor', pts: before } }),
     mock('getAfter', recordPath, missingRecord ? null : { data: record }),
     mock('exists', pointPath, existsPoint), mock('getAfter', pointPath, missingPoint ? null : { data: point })],
    expressionReportLevel: 'FULL' };
  }
  for (const target of ['record', 'point']) {
   add('primeiro recorde ' + target, sample({ target, before: 0 }));
   add('recorde superado ' + target, sample({ target }));
   add('mesmo autor pode superar ' + target, sample({ target, actor: 'igor' }));
   for (const options of [{ closed: true }, { actor: 'bruno' }, { pts: 26 }, { pts: 25 }, { pts: 0 }, { pts: 1000 }, { pts: 27.5 },
    { pointPatch: { d: 16 } }, { pointPatch: { who: 'pig' } }, { pointPatch: { kind: 'aux' } },
    { pointPatch: { extra: true } }, { pointPatch: { why: 'Livre' } },
    { recordPatch: { by: 'pig' } }, { recordPatch: { extra: true } },
    { recordPatch: { t: '2026-11-18T15:00:00.000Z' } }, { time: '2026-11-18T02:59:59.999Z' }]) {
    add('recusa dados ' + target + JSON.stringify(options), sample({ target, ...options, expectation: 'DENY' }));
   }
   const guest = sample({ target, expectation: 'DENY' }); guest.request.auth = null; add('visitante ' + target, guest);
   const unbound = sample({ target, expectation: 'DENY' }); unbound.functionMocks[0].result.value.data.uid = 'other'; add('conta sem vínculo ' + target, unbound);
  }
  add('recorde sem bônus', sample({ missingPoint: true, expectation: 'DENY' }));
  add('ponto sem avanço', sample({ target: 'point', missingRecord: true, expectation: 'DENY' }));
  add('bônus pré-existente', sample({ existsPoint: true, expectation: 'DENY' }));
  for (const method of ['update', 'delete']) add('bônus imutável ' + method, sample({ target: 'point', method, actor: 'bruno', expectation: 'DENY' }));
  add('recorde sem exclusão', sample({ method: 'delete', expectation: 'DENY' }));
  for (const target of ['record', 'point']) add('membro lê ' + target, sample({ target, method: 'get' }));
  const { Client } = require(path.join(c.root, 'lib/apiv2.js')), api = require(path.join(c.root, 'lib/api.js'));
  const client = new Client({ urlPrefix: api.rulesOrigin(), apiVersion: 'v1', auth: true });
  const response = await client.post('/projects/congresso-monogamico:test', {
   source: { files: [{ name: 'firestore.rules', content: fs.readFileSync('firestore.rules', 'utf8') }] },
   testSuite: { testCases: tests }
  }, { skipLog: { body: true } });
  const results = response.body.testResults || [];
  const failed = results.flatMap((result, index) => result.state === 'SUCCESS' ? [] : [{ name: names[index], ...result }]);
  fs.writeFileSync('.private/lake-rules-report.json', JSON.stringify(response.body, null, 2));
  console.log(JSON.stringify({ total: results.length, issues: response.body.issues, failed }, null, 2));
  assert.equal(results.length, tests.length); assert.equal(failed.length, 0);
 } finally { await c.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
