import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('recorde oficial: corte da viagem, bônus atômico, reenvio, concorrência e fechamento', async () => {
  const records = new Map();
  let version = 0, failCommit = false, calls = 0, time = Date.parse('2026-11-17T15:00:00Z');
  const originalNow = Date.now;
  const files = [];
  const snapshot = ref => {
    const data = records.get(ref.path);
    return { exists: () => data !== undefined, data: () => data && { ...data } };
  };
  let accept;
  const fixture = {
    getApp: () => ({}), getFirestore: () => ({}),
    doc: (db, ...parts) => ({ path: parts.join('/') }),
    serverTimestamp: () => time,
    onSnapshot: (ref, callback) => { accept = callback; return () => {}; },
    runTransaction: async (db, callback) => {
      calls++;
      for (let i = 0; i < 10; i++) {
        const current = version, writes = [];
        const result = await callback({
          get: async ref => snapshot(ref),
          set: (ref, data) => writes.push([ref.path, data])
        });
        if (current !== version) continue;
        if (failCommit) throw Error('Falha de rede antes de confirmar');
        for (const [ref, data] of writes) records.set(ref, data);
        if (writes.length) version++;
        return result;
      }
      throw Error('Conflito');
    }
  };
  globalThis.__lakeSdk = fixture;
  try {
    Date.now = () => time;
    const id = crypto.randomUUID();
    await fs.mkdir('.private', { recursive: true });
    const sdkPath = path.resolve(`.private/lake-sdk-${id}.mjs`);
    const targetPath = path.resolve(`.private/lake-backend-${id}.mjs`);
    files.push(sdkPath, targetPath);
    await fs.writeFile(sdkPath, Object.keys(fixture).map(name => `export const ${name}=(...args)=>globalThis.__lakeSdk.${name}(...args);`).join('\n'));
    const source = (await fs.readFile('lake-record.js', 'utf8')).replace(/from 'https:\/\/www.gstatic.com\/firebasejs\/13.1.0\/firebase-(app|firestore).js'/g, `from '${pathToFileURL(sdkPath).href}'`);
    await fs.writeFile(targetPath, source);
    const api = await import(pathToFileURL(targetPath).href);
    assert.deepEqual(await api.submitLakeRecord('ob', 10), { ok: false });
    assert.equal(calls, 0);
    time = api.LAKE_RECORD_START;
    for (const pts of [-1, 0, 1000, 2.5]) assert.equal((await api.submitLakeRecord('ob', pts)).ok, false);
    assert.equal((await api.submitLakeRecord('bruno', 999)).ok, false);
    let displayed;
    api.watchLakeRecord(record => { displayed = record; });
    accept({ data: () => ({ by: 'ob', pts: 99, t: time - 1 }) });
    assert.equal(displayed, null);
    accept({ data: () => ({ by: 'ob', pts: 99, t: time }), metadata: { hasPendingWrites: true } });
    assert.equal(displayed, null);
    accept({ data: () => ({ by: 'ob', pts: 99, t: time }) });
    assert.equal(displayed.pts, 99);
    assert.equal((await api.submitLakeRecord('ob', 10)).won, true);
    assert.equal(records.get('points/lake_10').d, 15);
    assert.equal(records.get('points/lake_10').createdAt, records.get('mapRecords/latinhas').t);
    assert.equal((await api.submitLakeRecord('ob', 10)).won, false);
    assert.equal((await api.submitLakeRecord('igor', 9)).won, false);
    assert.equal((await api.submitLakeRecord('ob', 20)).won, true);
    const concurrent = await Promise.all([api.submitLakeRecord('igor', 30), api.submitLakeRecord('luan', 30)]);
    assert.equal(concurrent.filter(result => result.won).length, 1);
    assert.equal([...records.keys()].filter(key => key.startsWith('points/')).length, 3);
    failCommit = true;
    await assert.rejects(api.submitLakeRecord('pig', 40), /rede/);
    assert.equal(records.get('mapRecords/latinhas').pts, 30);
    assert(!records.has('points/lake_40'));
    failCommit = false;
    assert.equal((await api.submitLakeRecord('pig', 40)).won, true);
    assert.equal((await api.submitLakeRecord('pig', 40)).won, false);
    records.set('scoreClosures/main', { closedAt: time });
    assert.equal((await api.submitLakeRecord('igor', 50)).ok, false);
    assert.equal(records.get('mapRecords/latinhas').pts, 40);
    assert(!records.has('points/lake_50'));
  } finally {
    Date.now = originalNow;
    delete globalThis.__lakeSdk;
    await Promise.all(files.map(file => fs.rm(file, { force: true })));
  }
});
