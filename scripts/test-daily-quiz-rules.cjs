// Serviço oficial, apenas documentos simulados. Nenhuma gravação de produção.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { context } = require('./firebase-context.cjs');
(async () => {
 const c = await context();
 try {
  const root = '/databases/(default)/documents', uid = 'quiz-test-user', names = [], tests = [];
  const add = (name, options) => { names.push(name); tests.push(sample(options)); };
  const mock = (fn, ref, value) => ({ function: fn, args: [{ exactValue: ref }], result: { value } });
  function sample({ target = 'attempt', action = 'answer', actor = 'ob', owner = uid,
   answer = 'martinez', delay = 5000, closed = false, voted = true, started = true, answered = false,
   missingPoint = false, existsPoint = false, missingAttempt = false,
   pointPatch = {}, attemptPatch = {}, method, expectation = 'ALLOW', guest = false } = {}) {
   const start = '2026-11-21T13:00:00.000Z', day = '20778';
   const time = action === 'start' ? start : new Date(Date.parse(start) + delay).toISOString();
   const before = { day, startedAt: start, ...(answered ? { answer: '', answeredAt: start } : {}) };
   const data = action === 'start' ? { day, startedAt: start, ...attemptPatch } : { ...before, answer, answeredAt: time, ...attemptPatch };
   const point = { who: actor, d: 5, kind: 'jogo', why: 'Quiz do dia · Sobrenome do OB', at: '21/11, 10:00', createdAt: time, ...pointPatch };
   const attemptPath = root + '/dailyQuizOB/' + uid, pointPath = root + '/points/quiz_ob_' + uid;
   return { expectation, request: { auth: guest ? null : { uid, token: { email: actor + '@congresso.app' } }, time,
    path: target === 'point' ? pointPath : root + '/dailyQuizOB/' + owner,
    method: method || (target === 'point' ? 'create' : action === 'start' ? 'create' : 'update'),
    resource: { data: target === 'point' ? point : data } },
    resource: { data: target === 'point' ? point : before },
    functionMocks: [mock('get', root + '/people/' + actor, { data: { uid } }),
     mock('exists', root + '/admins/' + uid, actor === 'bruno'),
     mock('exists', root + '/scoreClosures/main', closed),
     mock('get', root + '/querido/' + (attemptPatch.day || day) + '/voters/' + uid, voted ? { data: { voted: true } } : null),
     mock('exists', attemptPath, started), mock('get', attemptPath, started ? { data: before } : null),
     mock('getAfter', attemptPath, missingAttempt ? null : { data }),
     mock('exists', pointPath, existsPoint), mock('existsAfter', pointPath, !missingPoint),
     mock('getAfter', pointPath, missingPoint ? null : { data: point })], expressionReportLevel: 'FULL' };
  }
  add('inicia após voto', { action: 'start' });
  for (const extra of [{ voted: false }, { closed: true }, { owner: 'another-user' }, { guest: true },
   { attemptPatch: { day: '20777' } }, { attemptPatch: { day: '20780' } },
   { attemptPatch: { startedAt: '2026-11-21T12:59:59.000Z' } }, { attemptPatch: { answer: 'martinez' } }, { attemptPatch: { extra: true } },
   { method: 'update' }]) add('recusa início ' + JSON.stringify(extra), { action: 'start', ...extra, expectation: 'DENY' });
  for (const target of ['attempt', 'point']) {
   for (const answer of ['martinez', 'martines', 'pereira']) add('acerto pareado ' + target + answer, { target, answer });
   for (const extra of [{ delay: 7001 }, { delay: -1 }, { answered: true }, { closed: true },
    { existsPoint: true, ...(target === 'point' ? { answered: true } : {}) },
    { answer: 'santos' }, { guest: true }, { attemptPatch: { day: '20777' } },
    { attemptPatch: { startedAt: '2026-11-21T12:59:59.000Z' } }, { attemptPatch: { extra: true } },
    { attemptPatch: { answeredAt: '2026-11-21T13:00:01.000Z' } },
    { pointPatch: { d: 10 } }, { pointPatch: { who: 'pig' } }, { pointPatch: { kind: 'aux' } },
    { pointPatch: { why: 'Livre' } }, { pointPatch: { extra: true } }]) add('recusa resposta ' + target + JSON.stringify(extra), { target, ...extra, expectation: 'DENY' });
  }
  add('erro consome tentativa sem ponto', { answer: '', missingPoint: true });
  add('erro nunca concede ponto', { target: 'point', answer: '', expectation: 'DENY' });
  add('acerto sem bônus', { missingPoint: true, expectation: 'DENY' });
  add('bônus sem tentativa anterior', { target: 'point', started: false, expectation: 'DENY' });
  add('bônus sem resposta', { target: 'point', missingAttempt: true, expectation: 'DENY' });
  add('tentativa privada própria', { method: 'get' });
  for (const method of ['get', 'list', 'delete']) add('tentativa não exposta ' + method, { method, owner: 'another-user', expectation: 'DENY' });
  for (const target of ['attempt', 'point']) for (const method of ['delete', ...(target === 'point' ? ['update'] : [])]) add('imutável ' + target + method, { target, method, actor: 'bruno', expectation: 'DENY' });
  add('Bruno também participa', { actor: 'bruno' });
  const { Client } = require(path.join(c.root, 'lib/apiv2.js')), api = require(path.join(c.root, 'lib/api.js'));
  const client = new Client({ urlPrefix: api.rulesOrigin(), apiVersion: 'v1', auth: true });
  const response = await client.post('/projects/congresso-monogamico:test', { source: { files: [{ name: 'firestore.rules', content: fs.readFileSync('firestore.rules', 'utf8') }] }, testSuite: { testCases: tests } }, { skipLog: { body: true } });
  const results = response.body.testResults || [], failed = results.flatMap((result, i) => result.state === 'SUCCESS' ? [] : [{ name: names[i], ...result }]);
  fs.writeFileSync('.private/quiz-rules-report.json', JSON.stringify(response.body, null, 2));
  console.log(JSON.stringify({ total: results.length, issues: response.body.issues, failed: failed.map(({ name, state, error }) => ({ name, state, error })) }, null, 2));
  assert.equal(results.length, tests.length); assert.equal(failed.length, 0);
 } finally { await c.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
