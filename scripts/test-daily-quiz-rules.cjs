// Serviço oficial, apenas documentos simulados. Nenhuma gravação de produção.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { context } = require('./firebase-context.cjs');
(async () => {
 const c = await context();
 try {
  const root = '/databases/(default)/documents', uid = 'quiz-test-user', names = [], tests = [];
  const mock = (fn, ref, value) => ({ function: fn, args: [{ exactValue: ref }], result: { value } });
  const rounds=[
   {id:'OB',collection:'dailyQuizOB',prefix:'quiz_ob_',points:5,reason:'Quiz do dia · Sobrenome do OB',answers:['martinez','martines','pereira'],day:'20777',otherDay:'20778',start:'2026-11-20T13:00:00.000Z'},
   {id:'High',collection:'dailyQuizEden',prefix:'quiz_eden_',points:20,reason:'Quiz do dia · Dark room da High',answers:['jardim do eden'],day:'20778',otherDay:'20777',start:'2026-11-21T13:00:00.000Z'}
  ];
  for(const round of rounds){
  const add = (name, options) => { names.push(round.id+' · '+name); tests.push(sample(options)); };
  function sample({ target = 'attempt', action = 'answer', actor = 'ob', owner = uid,
   answer = round.answers[0], delay = 5000, closed = false, voted = true, started = true, answered = false,
   missingPoint = false, existsPoint = false, missingAttempt = false,
   pointPatch = {}, attemptPatch = {}, method, expectation = 'ALLOW', guest = false,
   startAt=round.start,day=round.day } = {}) {
   const start = startAt;
   const time = action === 'start' ? start : new Date(Date.parse(start) + delay).toISOString();
   const before = { day, startedAt: start, ...(answered ? { answer: '', answeredAt: start } : {}) };
   const data = action === 'start' ? { day, startedAt: start, ...attemptPatch } : { ...before, answer, answeredAt: time, ...attemptPatch };
   const point = { who: actor, d: round.points, kind: 'jogo', why: round.reason, at: round.id==='OB'?'20/11, 10:00':'21/11, 10:00', createdAt: time, ...pointPatch };
   const attemptPath = root + '/' + round.collection + '/' + uid, pointPath = root + '/points/' + round.prefix + uid;
   return { expectation, request: { auth: guest ? null : { uid, token: { email: actor + '@congresso.app' } }, time,
    path: target === 'point' ? pointPath : root + '/' + round.collection + '/' + owner,
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
   { attemptPatch: { day: round.otherDay } }, { attemptPatch: { day: '20780' } },
   { attemptPatch: { startedAt: '2026-11-21T12:59:59.000Z' } }, { attemptPatch: { answer: 'martinez' } }, { attemptPatch: { extra: true } },
   { method: 'update' }]) add('recusa início ' + JSON.stringify(extra), { action: 'start', ...extra, expectation: 'DENY' });
  for (const target of ['attempt', 'point']) {
   for (const answer of round.answers) add('acerto pareado ' + target + answer, { target, answer });
   for (const extra of [{ delay: 7001 }, { delay: -1 }, { answered: true }, { closed: true },
    { existsPoint: true, ...(target === 'point' ? { answered: true } : {}) },
    { answer: 'santos' }, { guest: true }, { attemptPatch: { day: round.otherDay } },
    { attemptPatch: { startedAt: '2026-11-21T12:59:59.000Z' } }, { attemptPatch: { extra: true } },
    { attemptPatch: { answeredAt: '2026-11-21T13:00:01.000Z' } },
    { pointPatch: { d: round.points===5?20:5 } }, { pointPatch: { who: 'pig' } }, { pointPatch: { kind: 'aux' } },
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
  for(const target of ['attempt','point'])add('limite exato de transporte '+target,{target,delay:7000});
  if(round.id==='OB'){
   add('não inicia rodada antiga em21/11',{action:'start',startAt:'2026-11-21T13:00:00.000Z',day:'20778',expectation:'DENY'});
  }else{
   add('não inicia rodada High antes de21/11',{action:'start',startAt:'2026-11-20T13:00:00.000Z',day:'20777',expectation:'DENY'});
   add('pode iniciar após voto de22/11',{action:'start',startAt:'2026-11-22T13:00:00.000Z',day:'20779'});
   for(const target of ['attempt','point']){
    add('acerto de22/11 '+target,{target,startAt:'2026-11-22T13:00:00.000Z',day:'20779'});
    add('resposta anterior não vale no novo quiz '+target,{target,answer:'martinez',expectation:'DENY'});
    add('bônus errado da rodada anterior '+target,{target,pointPatch:{d:5,why:'Quiz do dia · Sobrenome do OB'},expectation:'DENY'});
   }
  }
  }
  const { Client } = require(path.join(c.root, 'lib/apiv2.js')), api = require(path.join(c.root, 'lib/api.js'));
  const client = new Client({ urlPrefix: api.rulesOrigin(), apiVersion: 'v1', auth: true });
  const response = await client.post('/projects/congresso-monogamico:test', { source: { files: [{ name: 'firestore.rules', content: fs.readFileSync('firestore.rules', 'utf8') }] }, testSuite: { testCases: tests } }, { skipLog: { body: true } });
  const results = response.body.testResults || [], failed = results.flatMap((result, i) => result.state === 'SUCCESS' ? [] : [{ name: names[i], ...result }]);
  fs.writeFileSync('.private/quiz-rules-report.json', JSON.stringify(response.body, null, 2));
  console.log(JSON.stringify({ total: results.length, issues: response.body.issues, failed: failed.map(({ name, state, error }) => ({ name, state, error })) }, null, 2));
  assert.equal(results.length, tests.length); assert.equal(failed.length, 0);
 } finally { await c.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
