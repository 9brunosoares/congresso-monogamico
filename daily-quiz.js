export const QUIZ_SECONDS = 5;
export const QUIZ_ROUND = 'eden';
export const QUIZ_COLLECTION = 'dailyQuizEden';
export const QUIZ_POINT_PREFIX = 'quiz_eden_';
export const QUIZ_DAYS = ['20778', '20779']; // 21 e22/11/2026, São Paulo.
export const QUIZ_POINTS = 20;
export const QUIZ_QUESTION = 'Qual é o nome do dark room da High?';
export const QUIZ_REASON = 'Quiz do dia · Dark room da High';

export function quizAnswer(value) {
  const answer = String(value ?? '').trim().toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
  return answer === 'jardim do eden' ? answer : '';
}

// Relógio monotônico: trocar de aba não pausa os cinco segundos.
export function quizSecondsLeft(startedAt, now) {
  return Math.max(0, Math.min(QUIZ_SECONDS, Math.ceil(QUIZ_SECONDS - (now - startedAt) / 1000)));
}

export function openDailyQuiz({ start, answer, onResult, onError }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'daily-quiz';
  dialog.setAttribute('aria-labelledby', 'daily-quiz-title');
  dialog.innerHTML = `<div class="quiz-intro">
    <span class="quiz-watch" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="16" cy="18" r="10"/><path d="M13 3h6M16 3v5M24 8l2-2M16 12v6l3 2"/></svg></span>
    <h2 id="daily-quiz-title">Quiz do dia</h2>
    <p>Responda a próxima pergunta em até <strong>5 segundos</strong> e ganhe <strong class="quiz-prize">+${QUIZ_POINTS} pontos</strong> no placar geral!</p>
    <button class="btn seal block" type="button" data-quiz-ready>Ok, me sinto pronto</button>
  </div>`;
  let phase = 'intro', startedAt = 0, startPromise, interval, lastAnswer = '';
  const dispose = () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', checkTime);
    dialog.close();
    dialog.remove();
  };
  const finish = (aborted = false) => {
    if (phase !== 'question') return;
    const text = aborted ? '' : lastAnswer;
    phase = 'done';
    dispose();
    // Fecha no prazo, sem depender da latência da gravação.
    void startPromise.then(token => token && answer(token, text))
      .then(result => result && onResult?.(result)).catch(onError);
  };
  function checkTime() {
    if (phase !== 'question') return;
    const remaining = quizSecondsLeft(startedAt, performance.now());
    dialog.querySelector('[data-quiz-seconds]').textContent = remaining;
    dialog.querySelector('[role="timer"]').setAttribute('aria-label', `${remaining} segundos restantes`);
    dialog.querySelector('.quiz-timer').classList.toggle('urgent', remaining <= 2);
    if (!remaining) finish();
  }
  dialog.querySelector('[data-quiz-ready]').addEventListener('click', () => {
    if (phase !== 'intro') return;
    phase = 'question';
    startedAt = performance.now();
    dialog.innerHTML = `<form class="quiz-question" autocomplete="off">
      <div class="quiz-heading"><span class="eyebrow">Quiz do dia</span><span class="quiz-prize">+${QUIZ_POINTS} pontos</span></div>
      <h2 id="daily-quiz-title">${QUIZ_QUESTION}</h2>
      <div class="quiz-response"><input aria-label="Sua resposta" placeholder="Sua resposta" maxlength="60" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="done"><span class="quiz-timer" role="timer" aria-label="5 segundos restantes"><b data-quiz-seconds>5</b><span>s</span></span></div>
    </form>`;
    // O foco pertence ao gesto do usuário para abrir o teclado no iPhone.
    dialog.querySelector('input').focus();
    dialog.querySelector('input').addEventListener('input', event => {
      if (performance.now() - startedAt <= QUIZ_SECONDS * 1000) lastAnswer = event.target.value;
      else { event.target.value = lastAnswer; finish(); }
    });
    dialog.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      finish();
    });
    startPromise = Promise.resolve().then(start);
    startPromise.then(token => {
      if (!token && phase === 'question') { phase = 'done'; dispose(); }
    }).catch(error => {
      if (phase === 'question') { phase = 'done'; dispose(); onError?.(error); }
    });
    interval = setInterval(checkTime, 80);
    document.addEventListener('visibilitychange', checkTime);
  });
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    if (phase === 'question') finish(true);
  });
  document.body.append(dialog);
  dialog.showModal();
  return { close() { if (phase === 'question') finish(true); else dispose(); } };
}
