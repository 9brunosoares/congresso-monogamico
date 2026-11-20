import { getApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { getFirestore, doc, getDocFromServer, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import { votingKey } from './shared.js?v=20261120a';
import { quizAnswer, QUIZ_REASON } from './daily-quiz.js?v=20261120c';

function session() {
  const app = getApp(), user = getAuth(app).currentUser;
  if (!user) throw Error('Entre novamente para responder ao quiz.');
  return { db: getFirestore(app), uid: user.uid, who: user.email.split('@')[0] };
}

export async function quizAvailable() {
  const { db, uid } = session();
  const [attempt, closed] = await Promise.all([
    getDocFromServer(doc(db, 'dailyQuizOB', uid)),
    getDocFromServer(doc(db, 'scoreClosures', 'main'))
  ]);
  return !attempt.exists() && !closed.exists();
}

export async function startQuiz() {
  const { db, uid, who } = session(), day = votingKey();
  const ref = doc(db, 'dailyQuizOB', uid);
  return runTransaction(db, async tx => {
    const attempt = await tx.get(ref);
    const closed = await tx.get(doc(db, 'scoreClosures', 'main'));
    const voted = await tx.get(doc(db, 'querido', day, 'voters', uid));
    if (attempt.exists() || closed.exists()) return null;
    if (!voted.exists()) throw Error('Envie os votos antes de responder ao quiz.');
    tx.set(ref, { day, startedAt: serverTimestamp() });
    return { uid, who };
  });
}

export async function answerQuiz(token, text) {
  const { db, uid, who } = session();
  if (token.uid !== uid || token.who !== who) return { won: false };
  const answer = quizAnswer(text), ref = doc(db, 'dailyQuizOB', uid);
  return runTransaction(db, async tx => {
    const attempt = await tx.get(ref);
    const closed = await tx.get(doc(db, 'scoreClosures', 'main'));
    const pointRef = doc(db, 'points', `quiz_ob_${uid}`);
    const point = await tx.get(pointRef);
    if (!attempt.exists() || 'answeredAt' in attempt.data() || point.exists() || closed.exists()) return { won: false };
    const timestamp = serverTimestamp();
    tx.update(ref, { answer, answeredAt: timestamp });
    if (answer) tx.set(pointRef, {
      who, d: 5, why: QUIZ_REASON, kind: 'jogo',
      at: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      createdAt: timestamp
    });
    return { won: !!answer };
  });
}
