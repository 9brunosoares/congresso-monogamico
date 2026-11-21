// Avalia somente documentos simulados no serviço oficial de regras (javali da chácara, +20 uma vez).
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { context } = require('./firebase-context.cjs');

(async () => {
 const c = await context();
 try {
  const root = '/databases/(default)/documents', uid = 'boar-test-user';
  const boarPath = root + '/mapRecords/javali', pointPath = root + '/points/javali', tests = [], names = [];
  const add = (name, sample) => { names.push(name); tests.push(sample); };
  const mock = (fn, ref, value) => ({ function: fn, args: [{ exactValue: ref }], result: { value } });
  function sample({ target = 'boar', actor = 'ob', closed = false, pointPatch = {}, boarPatch = {}, method = 'create',
                    time = '2026-11-21T18:00:00.000Z', existsBoar = false, existsPoint = false,
                    missingPoint = false, missingBoar = false, expectation = 'ALLOW' } = {}) {
   const boar = { by: actor, t: time, ...boarPatch };
   const point = { who: actor, d: 20, kind: 'jogo', why: 'Acordou o javali da chácara', at: '21/11, 15:00', createdAt: time, ...pointPatch };
   return { expectation, request: { auth: { uid, token: { email: actor + '@congresso.app' } }, time,
    path: target === 'boar' ? boarPath : pointPath, method,
    resource: { data: target === 'boar' ? boar : point } },
    resource: { data: target === 'boar' ? boar : point },
    functionMocks: [mock('get', root + '/people/' + actor, { data: { uid } }),
     mock('exists', root + '/admins/' + uid, actor === 'bruno' || actor === 'igor'),
     mock('exists', root + '/scoreClosures/main', closed),
     mock('exists', boarPath, existsBoar), mock('getAfter', boarPath, missingBoar ? null : { data: boar }),
     mock('exists', pointPath, existsPoint), mock('getAfter', pointPath, missingPoint ? null : { data: point })],
    expressionReportLevel: 'FULL' };
  }
  for (const target of ['boar', 'point']) {
   add('acorda o javali ' + target, sample({ target }));
   add('ADM também pode acordar ' + target, sample({ target, actor: 'igor' }));
   for (const options of [{ closed: true }, { actor: 'bruno' }, { existsBoar: true }, { existsPoint: true },
    { pointPatch: { d: 21 } }, { pointPatch: { who: 'pig' } }, { pointPatch: { kind: 'aux' } }, { pointPatch: { why: 'Livre' } },
    { pointPatch: { extra: true } }, { pointPatch: { createdAt: '2026-11-21T17:00:00.000Z' } },
    { boarPatch: { by: 'pig' } }, { boarPatch: { extra: true } }, { boarPatch: { t: '2026-11-21T17:00:00.000Z' } },
    { time: '2026-11-18T02:59:59.999Z' }]) {
    add('recusa ' + target + JSON.stringify(options), sample({ target, ...options, expectation: 'DENY' }));
   }
   const guest = sample({ target, expectation: 'DENY' }); guest.request.auth = null; add('visitante ' + target, guest);
   const unbound = sample({ target, expectation: 'DENY' }); unbound.functionMocks[0].result.value.data.uid = 'other'; add('conta sem vínculo ' + target, unbound);
   for (const method of ['update', 'delete']) add(target + ' imutável ' + method, sample({ target, method, actor: 'igor', existsBoar: true, existsPoint: true, expectation: 'DENY' }));
   add('membro lê ' + target, sample({ target, method: 'get' }));
  }
  add('javali sem bônus', sample({ missingPoint: true, expectation: 'DENY' }));
  add('bônus sem javali', sample({ target: 'point', missingBoar: true, expectation: 'DENY' }));
  const { Client } = require(path.join(c.root, 'lib/apiv2.js')), api = require(path.join(c.root, 'lib/api.js'));
  const client = new Client({ urlPrefix: api.rulesOrigin(), apiVersion: 'v1', auth: true });
  const response = await client.post('/projects/congresso-monogamico:test', {
   source: { files: [{ name: 'firestore.rules', content: fs.readFileSync('firestore.rules', 'utf8') }] },
   testSuite: { testCases: tests }
  }, { skipLog: { body: true } });
  const results = response.body.testResults || [];
  const failed = results.flatMap((result, index) => result.state === 'SUCCESS' ? [] : [{ name: names[index], ...result }]);
  fs.mkdirSync('.private', { recursive: true });
  fs.writeFileSync('.private/boar-rules-report.json', JSON.stringify(response.body, null, 2));
  console.log(JSON.stringify({ total: results.length, issues: response.body.issues, failed }, null, 2));
  assert.equal(results.length, tests.length); assert.equal(failed.length, 0);
 } finally { await c.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
