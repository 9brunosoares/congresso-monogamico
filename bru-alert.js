export const BRU_ALERT_KEY = 'xvi-bru-javali-20261120-v1';

function showBruAlert() {
  const dialog = document.createElement('dialog');
  dialog.className = 'bru-alert';
  dialog.setAttribute('role', 'alertdialog');
  dialog.setAttribute('aria-labelledby', 'bru-alert-title');
  dialog.setAttribute('aria-describedby', 'bru-alert-message');
  dialog.innerHTML = `<div class="bru-alert-copy">
    <h2 id="bru-alert-title" tabindex="-1">⚠️ Alerta da defesa civil:</h2>
    <p id="bru-alert-message">Um javali selvagem escapou essa manhã do zoológico municipal.<br>Abriguem-se em locais seguros e não saiam de casa.</p>
    <p class="bru-alert-signature">Prefeitura de Vargem/SP</p>
  </div><button type="button">OK</button>`;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    dialog.close();
    dialog.remove();
  };
  dialog.querySelector('button').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  document.body.append(dialog);
  dialog.showModal();
  dialog.querySelector('h2').focus();
  return close;
}

// Uma exibição por perfil/aparelho. Não abre consultas nem escreve no Firebase.
export function createBruAlert({ storage, show = showBruAlert,
  blocked = () => !!document.querySelector('dialog[open], .scrim'),
  schedule = setTimeout, unschedule = clearTimeout } = {}) {
  let state = {}, timer = null, shown = false, close;
  const seen = () => {
    try { return shown || storage?.getItem(BRU_ALERT_KEY) === '1'; } catch { return shown; }
  };
  const eligible = () => state.me === 'bruno' && state.ready && !state.hidden && !seen();
  const cancel = () => { if (timer !== null) unschedule(timer); timer = null; };
  const fire = () => {
    timer = null;
    if (!eligible()) return;
    // Não interrompe o cronômetro do quiz nem outra janela já aberta.
    if (blocked()) { timer = schedule(fire, 250); return; }
    close = show();
    shown = true;
    try { storage?.setItem(BRU_ALERT_KEY, '1'); } catch {}
  };
  return {
    update(next) {
      const previous = state.me;
      state = next;
      if (previous !== state.me) { cancel(); close?.(); close = null; }
      if (!eligible()) { cancel(); return; }
      if (timer === null) timer = schedule(fire, 5000);
    }
  };
}
