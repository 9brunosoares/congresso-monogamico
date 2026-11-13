export function openTravelMap(avatar, onClose, { onReady } = {}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'travel-map';
  dialog.setAttribute('aria-label', 'Simule a viagem');
  dialog.innerHTML = `
    <div class="travel-toolbar">
      <button class="travel-back" type="button" autofocus>‹ Voltar</button>
      <span class="travel-status" role="status"></span>
    </div>
    <div class="travel-content">
      <iframe class="travel-frame" title="Mapa 3D da chácara"></iframe>
      <div class="travel-loading" role="status">
        <span class="union-loader" aria-hidden="true"><span class="jewel-ring ring-left"><i class="gem"></i></span><span class="jewel-ring ring-right"><i class="gem"></i></span><span class="lock"><i class="shackle"></i><i class="lock-body"><b class="keyhole"></b></i></span></span>
        Carregando a chácara…
      </div>
    </div>`;
  const frame = dialog.querySelector('iframe');
  const loading = dialog.querySelector('.travel-loading');
  const status = dialog.querySelector('.travel-status');
  let active = true;
  let ready = false;
  let room;
  let latestPose;
  let timer = setTimeout(showError, 25000);

  function send(type, data) {
    if (active) frame.contentWindow?.postMessage({ channel: 'congresso-mapa', type, ...data }, location.origin);
  }

  function showError() {
    clearTimeout(timer);
    loading.textContent = 'Não foi possível abrir o mapa.';
  }

  function close() {
    if (!active) return;
    frame.contentWindow?.saveTravelPosition?.();
    active = false;
    clearTimeout(timer);
    window.removeEventListener('message', receive);
    window.removeEventListener('pagehide', close);
    room?.close();
    dialog.close();
    dialog.remove();
    onClose();
  }

  async function joinRoom() {
    status.textContent = 'Conectando…';
    try {
      const { joinTravelRoom } = await import('./mapa-sala.js?v=20261113b');
      if (!active) return;
      room = joinTravelRoom(avatar, {
        onPeer: (id, pose) => send('peer', { id, pose }),
        onSpeech: (id, message) => send('speech', { id, message }),
        onSun: sunset => send('sun', { sunset }),
        onBall: (ball, age) => send('ball', { ball, age }),
        onRecord: record => send('record', { record }),
        onStatus: online => {
          status.textContent = online ? 'Ao vivo' : 'Modo solo';
          send('online', { online });
        }
      });
      if (latestPose) room.update(latestPose);
    } catch {
      if (active) status.textContent = 'Modo solo';
    }
  }

  function receive(event) {
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    const message = event.data;
    if (message?.channel !== 'congresso-mapa') return;
    if (message.type === 'ready' && !ready) {
      ready = true;
      clearTimeout(timer);
      loading.hidden = true;
      send('start', { avatar });
      onReady?.();
      frame.focus();
      void joinRoom();
    } else if (message.type === 'pose' && ready) {
      latestPose = message.pose;
      room?.update(latestPose);
    } else if (message.type === 'say' && ready) {
      void Promise.resolve(room?.say(message.to, message.text))
        .then(ok => send('say-result', { request: message.request, ok: !!ok }));
    } else if (message.type === 'record' && ready) {
      room?.record(message.pts);
    } else if (message.type === 'ball' && ready) {
      room?.kick(message.ball);
    } else if (message.type === 'toggle-sun' && ready) {
      void Promise.resolve(room?.toggleSun())
        .then(ok => send('toggle-sun-result', { ok: !!ok }));
    } else if (message.type === 'close') {
      close();
    } else if (message.type === 'error' && !ready) {
      showError();
    }
  }

  dialog.querySelector('button').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  window.addEventListener('message', receive);
  window.addEventListener('pagehide', close);
  frame.src = './mapa/index.html?v=20261113b';
  document.body.append(dialog);
  dialog.showModal();
  return { close };
}
