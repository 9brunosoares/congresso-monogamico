import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { quizAnswer, quizSecondsLeft, QUIZ_POINTS, QUIZ_QUESTION } from '../daily-quiz.js';
import { votingKey } from '../shared.js';

test('quiz High: resposta com e sem acento, maiúsculas, espaços e limite de cinco segundos', () => {
  for (const value of ['Jardim do Éden', 'jardim do eden', ' JARDIM DO ÉDEN ', 'jardim  do   éden', 'Jardim do E\u0301den', 'Éden', 'eden', ' EDEN ', 'E\u0301den']) assert.equal(quizAnswer(value), 'jardim do eden');
  for (const value of ['', 'Jardim Eden', 'Martinez', 'Martines', 'Pereira', null, '<script>']) assert.equal(quizAnswer(value), '');
  assert.equal(QUIZ_POINTS,20);assert.equal(QUIZ_QUESTION,'Qual é o nome do dark room da High?');
  assert.equal(quizSecondsLeft(1000, 1000), 5);
  assert.equal(quizSecondsLeft(1000, 1999), 5);
  assert.equal(quizSecondsLeft(1000, 2000), 4);
  assert.equal(quizSecondsLeft(1000, 5999), 1);
  assert.equal(quizSecondsLeft(1000, 6000), 0);
  assert.equal(quizSecondsLeft(1000, 90000), 0);
});

test('quiz High: nova rodada independente, voto prévio, bônus20 atômico, concorrência e troca de conta', async () => {
  const records = new Map(), files = [];
  let revision = 0, failCommit = false, user = { uid: 'uid-ob', email: 'ob@congresso.app' };
  const time = Date.parse('2026-11-21T10:00:00-03:00'), savedNow = Date.now;
  const snap = ref => { const data = records.get(ref.path); return { exists: () => data !== undefined, data: () => data && { ...data } }; };
  const sdk = {
    getApp: () => ({}), getAuth: () => ({ currentUser: user }), getFirestore: () => ({}),
    doc: (db, ...parts) => ({ path: parts.join('/') }), getDocFromServer: async ref => snap(ref),
    serverTimestamp: () => time,
    runTransaction: async (db, callback) => {
      for (let tries = 0; tries < 10; tries++) {
        const current = revision, writes = [];
        const result = await callback({ get: async ref => snap(ref),
          set: (ref, data) => writes.push([ref.path, data]),
          update: (ref, data) => writes.push([ref.path, { ...records.get(ref.path), ...data }]) });
        if (current !== revision) continue;
        if (failCommit) throw Error('Sem conexão');
        for (const [key, data] of writes) records.set(key, data);
        if (writes.length) revision++;
        return result;
      }
      throw Error('Conflito');
    }
  };
  globalThis.__quizSdk = sdk;
  try {
    Date.now = () => time;
    await fs.mkdir('.private', { recursive: true });
    const suffix = crypto.randomUUID(), sdkFile = path.resolve(`.private/quiz-sdk-${suffix}.mjs`), dataFile = path.resolve(`.private/quiz-data-${suffix}.mjs`);
    files.push(sdkFile, dataFile);
    await fs.writeFile(sdkFile, Object.keys(sdk).map(name => `export const ${name}=(...args)=>globalThis.__quizSdk.${name}(...args);`).join('\n'));
    await fs.writeFile(dataFile, (await fs.readFile('daily-quiz-data.js', 'utf8'))
      .replace(/from 'https:\/\/www.gstatic.com\/firebasejs\/13.1.0\/firebase-(app|auth|firestore).js'/g, `from '${pathToFileURL(sdkFile).href}'`)
      .replace(/from '\.\//g, "from '../"));
    const api = await import(pathToFileURL(dataFile).href);
    const login = who => { user = { uid: 'uid-' + who, email: who + '@congresso.app' }; records.set(`querido/${votingKey()}/voters/${user.uid}`, { voted: true }); };
    Date.now=()=>Date.parse('2026-11-20T10:00:00-03:00');
    assert.equal(await api.quizAvailable(),false);assert.equal(await api.startQuiz(),null);
    Date.now=()=>time;
    const legacyAttempt={day:'20777',startedAt:time-86400000,answer:'martinez',answeredAt:time-86400000+1000};
    const legacyPoint={who:'ob',d:5,kind:'jogo',why:'Quiz do dia · Sobrenome do OB',createdAt:legacyAttempt.answeredAt};
    records.set('dailyQuizOB/uid-ob',{...legacyAttempt});records.set('points/quiz_ob_uid-ob',{...legacyPoint});
    assert.equal(await api.quizAvailable(), true);
    await assert.rejects(api.startQuiz(), /votos/);
    login('ob');
    const starts = await Promise.all([api.startQuiz(), api.startQuiz()]);
    assert.equal(starts.filter(Boolean).length, 1);
    assert.equal(await api.quizAvailable(), false);
    const token = starts.find(Boolean);
    failCommit = true;
    await assert.rejects(api.answerQuiz(token, 'Jardim do Éden'), /conexão/);
    assert(!records.has('points/quiz_eden_uid-ob'));
    assert(!('answeredAt' in records.get('dailyQuizEden/uid-ob')));
    failCommit = false;
    assert.equal((await api.answerQuiz({...token,round:'ob'},'Jardim do Éden')).won,false);
    const answers = await Promise.all([api.answerQuiz(token, 'Jardim do Éden'), api.answerQuiz(token, ' Éden ')]);
    assert.equal(answers.filter(result => result.won).length, 1);
    assert.equal(records.get('points/quiz_eden_uid-ob').d, 20);
    assert.equal(records.get('points/quiz_eden_uid-ob').createdAt, records.get('dailyQuizEden/uid-ob').answeredAt);
    assert.equal((await api.answerQuiz(token, 'jardim do eden')).won, false);
    assert.equal(await api.startQuiz(), null);
    for (const [who, text] of [['igor', 'EDEN'], ['pig', 'eden'], ['gherardi', 'Éden'], ['bruno', ' JARDIM  DO ÉDEN ']]) {
      login(who); const next = await api.startQuiz();
      assert.equal((await api.answerQuiz(next, text)).won, true);
      assert.equal(records.get(`points/quiz_eden_uid-${who}`).d, 20);
      assert.equal(records.get(`dailyQuizEden/uid-${who}`).answer,'jardim do eden');
    }
    login('nanu'); const wrong = await api.startQuiz();
    assert.equal((await api.answerQuiz(wrong, 'Santos')).won, false);
    assert.equal(records.get('dailyQuizEden/uid-nanu').answer, '');
    assert(!records.has('points/quiz_eden_uid-nanu'));
    assert.equal((await api.answerQuiz(wrong, 'jardim do eden')).won, false);
    login('luan'); const switched = await api.startQuiz();
    login('cadu'); assert.equal((await api.answerQuiz(switched, 'jardim do eden')).won, false);
    assert.deepEqual(records.get('dailyQuizOB/uid-ob'),legacyAttempt);
    assert.deepEqual(records.get('points/quiz_ob_uid-ob'),legacyPoint);
    records.set('scoreClosures/main', { closedAt: time });
    assert.equal(await api.quizAvailable(), false);
    assert.equal(await api.startQuiz(), null);
    user = null; await assert.rejects(api.quizAvailable(), /novamente/);
  } finally {
    Date.now = savedNow; delete globalThis.__quizSdk;
    await Promise.all(files.map(file => fs.rm(file, { force: true })));
  }
});
