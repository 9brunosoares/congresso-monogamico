import { getApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { getFirestore, doc, getDocFromServer, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import { votingKey } from './shared.js?v=20261120j';
import { quizAnswer, QUIZ_REASON, QUIZ_ROUND, QUIZ_COLLECTION, QUIZ_POINT_PREFIX, QUIZ_DAYS, QUIZ_POINTS } from './daily-quiz.js?v=20261121a';

function session() {
  const app = getApp(), user = getAuth(app).currentUser;
  if (!user) throw Error('Entre novamente para responder ao quiz.');
  return { db: getFirestore(app), uid: user.uid, who: user.email.split('@')[0] };
}

export async function quizAvailable() {
  const { db, uid } = session();
  if (!QUIZ_DAYS.includes(votingKey())) return false;
  const [attempt, closed] = await Promise.all([
    getDocFromServer(doc(db, QUIZ_COLLECTION, uid)),
    getDocFromServer(doc(db, 'scoreClosures', 'main'))
  ]);
  return !attempt.exists() && !closed.exists();
}

export async function startQuiz() {
  const { db, uid, who } = session(), day = votingKey();
  if (!QUIZ_DAYS.includes(day)) return null;
  const ref = doc(db, QUIZ_COLLECTION, uid);
  return runTransaction(db, async tx => {
    const attempt = await tx.get(ref);
    const closed = await tx.get(doc(db, 'scoreClosures', 'main'));
    const voted = await tx.get(doc(db, 'querido', day, 'voters', uid));
    if (attempt.exists() || closed.exists()) return null;
    if (!voted.exists()) throw Error('Envie os votos antes de responder ao quiz.');
    tx.set(ref, { day, startedAt: serverTimestamp() });
    return { uid, who, round: QUIZ_ROUND };
  });
}

export async function answerQuiz(token, text) {
  const { db, uid, who } = session();
  if (token.uid !== uid || token.who !== who || token.round !== QUIZ_ROUND) return { won: false };
  const answer = quizAnswer(text), ref = doc(db, QUIZ_COLLECTION, uid);
  return runTransaction(db, async tx => {
    const attempt = await tx.get(ref);
    const closed = await tx.get(doc(db, 'scoreClosures', 'main'));
    const pointRef = doc(db, 'points', QUIZ_POINT_PREFIX + uid);
    const point = await tx.get(pointRef);
    if (!attempt.exists() || 'answeredAt' in attempt.data() || point.exists() || closed.exists()) return { won: false };
    const timestamp = serverTimestamp();
    tx.update(ref, { answer, answeredAt: timestamp });
    if (answer) tx.set(pointRef, {
      who, d: QUIZ_POINTS, why: QUIZ_REASON, kind: 'jogo',
      at: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      createdAt: timestamp
    });
    return { won: !!answer };
  });
}
