// Migra somente a última marca da represa e seu bônus, com backup privado.
const fs = require('node:fs'), path = require('node:path');
const { context } = require('./firebase-context.cjs');
const { Timestamp } = require('firebase-admin/firestore');

(async () => {
 const c = await context();
 try {
  const { ALL } = await import('../roster.js');
  const { Client } = require(path.join(c.root, 'lib/apiv2.js'));
  const rest = new Client({ urlPrefix: 'https://congresso-monogamico-default-rtdb.firebaseio.com', apiVersion: '', auth: true });
  const { body: legacy } = await rest.get('/mapa/recordeLatinhas.json', { skipLog: { body: true } });
  const start = Date.parse('2026-11-18T00:00:00-03:00');
  const valid = legacy && ALL.includes(legacy.by) && legacy.by !== 'bruno' && Number.isInteger(legacy.pts)
   && legacy.pts >= 1 && legacy.pts <= 999 && Number.isFinite(legacy.t) && legacy.t >= start && legacy.t <= Date.now();
  console.log(JSON.stringify({ eligibleLegacy: !!valid, legacy: valid ? legacy : null, apply: process.argv.includes('--apply') }));
  if (!valid || !process.argv.includes('--apply')) return;
  const recordRef = c.db.doc('mapRecords/latinhas'), pointRef = c.db.doc('points/lake_' + legacy.pts);
  const [previousRecord, previousPoint] = await c.db.getAll(recordRef, pointRef);
  fs.mkdirSync('.private', { recursive: true });
  fs.writeFileSync(path.join('.private', 'lake-migration-' + Date.now() + '.json'), JSON.stringify({
   legacy, record: previousRecord.data() || null, point: previousPoint.data() || null
  }, null, 2));
  const result = await c.db.runTransaction(async transaction => {
   const record = await transaction.get(recordRef);
   const point = await transaction.get(pointRef);
   const closed = await transaction.get(c.db.doc('scoreClosures/main'));
   if (record.exists) return 'Recorde oficial já inicializado; nenhum dado alterado.';
   if (closed.exists) throw Error('O placar já foi encerrado.');
   if (point.exists) throw Error('Bônus existente sem recorde oficial; verificar antes de migrar.');
   const stamp = Timestamp.fromMillis(legacy.t);
   transaction.create(recordRef, { by: legacy.by, pts: legacy.pts, t: stamp });
   transaction.create(pointRef, { who: legacy.by, d: 15, kind: 'jogo',
    why: `Recorde da represa · ${legacy.pts} pontos`,
    at: new Date(legacy.t).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    createdAt: stamp });
   return 'Recorde oficial e bônus de 15 pontos gravados juntos.';
  });
  console.log(result);
 } finally { await c.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
