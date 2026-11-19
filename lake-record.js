import { getApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {
  getFirestore, doc, onSnapshot, runTransaction, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

export const LAKE_RECORD_START = Date.parse('2026-11-18T00:00:00-03:00');
export const LAKE_RECORD_BONUS = 15;
export const LAKE_RECORD_TESTER = 'bruno';

export function officialLakeRecord(data) {
  const time = data?.t?.toMillis?.() ?? data?.t;
  return data && data.by !== LAKE_RECORD_TESTER && Number.isInteger(data.pts)
    && data.pts >= 1 && data.pts <= 999 && time >= LAKE_RECORD_START
    ? { by: data.by, pts: data.pts, t: time } : null;
}

export function watchLakeRecord(onRecord, onError) {
  const db = getFirestore(getApp());
  return onSnapshot(doc(db, 'mapRecords', 'latinhas'), snapshot => {
    if (!snapshot.metadata?.hasPendingWrites) onRecord(officialLakeRecord(snapshot.data()));
  }, onError);
}

export async function submitLakeRecord(avatar, pts) {
  if (avatar === LAKE_RECORD_TESTER || Date.now() < LAKE_RECORD_START) return { ok: false };
  if (!Number.isInteger(pts) || pts < 1 || pts > 999) return { ok: false };
  const db = getFirestore(getApp());
  const recordRef = doc(db, 'mapRecords', 'latinhas');
  const pointRef = doc(db, 'points', `lake_${pts}`);
  return runTransaction(db, async transaction => {
    const record = await transaction.get(recordRef);
    const closed = await transaction.get(doc(db, 'scoreClosures', 'main'));
    if (closed.exists()) return { ok: false, retryable: false, message: 'O placar já foi encerrado.' };
    const current = officialLakeRecord(record.data());
    if (current && pts <= current.pts) return { ok: true, won: false, record: current };
    const receipt = await transaction.get(pointRef);
    if (receipt.exists()) throw Error('Esta marca já foi contabilizada.');
    const stamp = serverTimestamp();
    transaction.set(recordRef, { by: avatar, pts, t: stamp });
    transaction.set(pointRef, {
      who: avatar, d: LAKE_RECORD_BONUS, kind: 'jogo',
      why: `Recorde da represa · ${pts} pontos`,
      at: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo',
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      createdAt: stamp
    });
    return { ok: true, won: true, pts };
  });
}
