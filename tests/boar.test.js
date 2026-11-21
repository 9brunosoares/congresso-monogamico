import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('javali: +20 uma única vez, sem Bru, concorrência e placar fechado', async () => {
  const records = new Map();
  let version = 0, failCommit = false, time = Date.parse('2026-11-21T18:00:00Z');
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
      for (let i = 0; i < 10; i++) {
        const current = version, writes = [];
        const result = await callback({ get: async ref => snapshot(ref), set: (ref, data) => writes.push([ref.path, data]) });
        if (current !== version) continue;
        if (failCommit) throw Error('Falha de rede antes de confirmar');
        for (const [ref, data] of writes) records.set(ref, data);
        if (writes.length) version++;
        return result;
      }
      throw Error('Conflito');
    }
  };
  globalThis.__boarSdk = fixture;
  try {
    const id = crypto.randomUUID();
    await fs.mkdir('.private', { recursive: true });
    const sdkPath = path.resolve(`.private/boar-sdk-${id}.mjs`), targetPath = path.resolve(`.private/boar-${id}.mjs`);
    files.push(sdkPath, targetPath);
    await fs.writeFile(sdkPath, Object.keys(fixture).map(name => `export const ${name}=(...args)=>globalThis.__boarSdk.${name}(...args);`).join('\n'));
    const source = (await fs.readFile('boar.js', 'utf8')).replace(/from 'https:\/\/www.gstatic.com\/firebasejs\/13.1.0\/firebase-(app|firestore).js'/g, `from '${pathToFileURL(sdkPath).href}'`);
    await fs.writeFile(targetPath, source);
    const api = await import(pathToFileURL(targetPath).href);

    assert.equal((await api.claimBoar('bruno')).ok, false);
    assert.equal(records.size, 0);
    let shown = 'nada';
    api.watchBoar(boar => { shown = boar; });
    accept({ data: () => undefined });
    assert.equal(shown, null);
    accept({ data: () => ({ by: 'ob', t: time }), metadata: { hasPendingWrites: true } });
    assert.equal(shown, null);

    failCommit = true;
    await assert.rejects(api.claimBoar('pig'), /rede/);
    assert.equal(records.size, 0);
    failCommit = false;

    const both = await Promise.all([api.claimBoar('ob'), api.claimBoar('igor')]);
    assert.equal(both.filter(r => r.won).length, 1);
    const winner = records.get('mapRecords/javali').by;
    const point = records.get('points/javali');
    assert.equal(point.who, winner);
    assert.equal(point.d, 20);
    assert.equal(point.kind, 'jogo');
    assert.equal(point.why, 'Acordou o javali da chácara');
    assert.equal(point.createdAt, records.get('mapRecords/javali').t);
    const again = await api.claimBoar('luan');
    assert.deepEqual([again.ok, again.won, again.boar.by], [true, false, winner]);
    assert.equal([...records.keys()].filter(key => key.startsWith('points/')).length, 1);
    accept({ data: () => records.get('mapRecords/javali') });
    assert.equal(shown.by, winner);

    records.clear();
    records.set('scoreClosures/main', { closedAt: time });
    assert.equal((await api.claimBoar('cadu')).ok, false);
    assert(!records.has('points/javali'));
  } finally {
    delete globalThis.__boarSdk;
    await Promise.all(files.map(file => fs.rm(file, { force: true })));
  }
});
