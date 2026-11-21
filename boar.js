import { getApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {
  getFirestore, doc, onSnapshot, runTransaction, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

// Javali da chácara: o primeiro congressista que passa por cima dele ganha +20, uma única vez no total.
export const BOAR_BONUS = 20;
export const BOAR_TESTER = 'bruno';
export const BOAR_WHY = 'Acordou o javali da chácara';

export function officialBoar(data) {
  const time = data?.t?.toMillis?.() ?? data?.t;
  return data && typeof data.by === 'string' && data.by !== BOAR_TESTER && Number.isFinite(time)
    ? { by: data.by, t: time } : null;
}

export function watchBoar(onBoar, onError) {
  const db = getFirestore(getApp());
  return onSnapshot(doc(db, 'mapRecords', 'javali'), snapshot => {
    if (!snapshot.metadata?.hasPendingWrites) onBoar(officialBoar(snapshot.data()));
  }, onError);
}

export async function claimBoar(avatar) {
  if (!avatar || avatar === BOAR_TESTER) return { ok: false, retryable: false };
  const db = getFirestore(getApp());
  const boarRef = doc(db, 'mapRecords', 'javali');
  const pointRef = doc(db, 'points', 'javali');
  return runTransaction(db, async transaction => {
    const boar = await transaction.get(boarRef);
    const closed = await transaction.get(doc(db, 'scoreClosures', 'main'));
    if (boar.exists()) return { ok: true, won: false, boar: officialBoar(boar.data()) };
    if (closed.exists()) return { ok: false, retryable: false, message: 'O placar já foi encerrado.' };
    const receipt = await transaction.get(pointRef);
    if (receipt.exists()) throw Error('O javali já foi contabilizado.');
    const stamp = serverTimestamp();
    transaction.set(boarRef, { by: avatar, t: stamp });
    transaction.set(pointRef, {
      who: avatar, d: BOAR_BONUS, kind: 'jogo', why: BOAR_WHY,
      at: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo',
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      createdAt: stamp
    });
    return { ok: true, won: true };
  });
}
