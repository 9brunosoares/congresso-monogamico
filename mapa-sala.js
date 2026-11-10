import { getApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {
  getDatabase, goOffline, goOnline, ref, push, set, remove, onDisconnect, serverTimestamp,
  onValue, onChildAdded, onChildChanged, onChildRemoved
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js';

const DATABASE_URL = 'https://congresso-monogamico-default-rtdb.firebaseio.com';
const ROOM = 'mapa/xvi';
const SPEECH = 'mapa/falas';
const SPEECH_MS = 5000;
const SEND_MS = 250;
const HEARTBEAT_MS = 20000;
const STALE_MS = 55000;

export function joinTravelRoom(avatar, { onPeer, onStatus, onSpeech }) {
  const db = getDatabase(getApp(), DATABASE_URL);
  const room = ref(db, ROOM);
  const speech = ref(db, SPEECH);
  const rows = new Map();
  const visiblePeers = new Map();
  const subscriptions = [];
  let open = true;
  let connected = false;
  let session;
  let epoch = 0;
  let offset = 0;
  let latest;

  function refreshPeers() {
    const cutoff = Date.now() + offset - STALE_MS;
    for (const [id, sessions] of rows) {
      let pose;
      if (connected) {
        for (const state of Object.values(sessions)) {
          if (state.t >= cutoff && (!pose || state.t > pose.t)) pose = state;
        }
      }
      if (visiblePeers.get(id) !== pose) {
        if (pose) visiblePeers.set(id, pose);
        else visiblePeers.delete(id);
        onPeer(id, pose ?? null);
      }
    }
  }

  function flush() {
    if (!session || !latest || session.pending) return;
    const now = performance.now();
    if (now - session.sent < SEND_MS) return;
    const key = Object.values(latest).join(',');
    if (session.key === key && now - session.sent < HEARTBEAT_MS) return;
    const current = session;
    current.pending = true;
    current.sent = now;
    current.key = key;
    set(current.ref, { ...latest, t: serverTimestamp() }).then(() => {
      if (session !== current) {
        // A buffered write from a previous connection can be replayed on reconnect.
        void remove(current.ref).catch(() => {});
      } else if (!connected) {
        connected = true;
        onStatus(true);
        refreshPeers();
      }
    }).catch(() => {
      if (session === current) leave();
    }).finally(() => { current.pending = false; });
  }

  function leave() {
    epoch++;
    session = null;
    connected = false;
    while (subscriptions.length) subscriptions.pop()();
    goOffline(db); // The server removes the last session via onDisconnect.
    refreshPeers();
    rows.clear();
    onStatus(false);
  }

  function enter() {
    if (!open || document.hidden || subscriptions.length) return;
    function receive(snapshot) {
      if (snapshot.key === avatar) return;
      rows.set(snapshot.key, snapshot.val());
      refreshPeers();
    }
    subscriptions.push(
      onChildAdded(room, receive, leave),
      onChildChanged(room, receive, leave),
      onChildRemoved(room, snapshot => {
        rows.delete(snapshot.key);
        if (visiblePeers.delete(snapshot.key)) onPeer(snapshot.key, null);
      }, leave),
      onChildAdded(speech, snapshot => {
        const message = snapshot.val();
        const remaining = message.t + SPEECH_MS - (Date.now() + offset);
        if (remaining > 0) onSpeech(snapshot.key, { ...message, remaining: Math.min(SPEECH_MS, remaining) });
      }),
      onChildRemoved(speech, snapshot => onSpeech(snapshot.key, null)),
      onValue(ref(db, '.info/serverTimeOffset'), snapshot => { offset = snapshot.val() ?? 0; }),
      onValue(ref(db, '.info/connected'), async snapshot => {
        const attempt = ++epoch;
        if (!snapshot.val()) {
          session = null;
          connected = false;
          refreshPeers();
          onStatus(false);
          return;
        }
        const own = push(ref(db, `${ROOM}/${avatar}`));
        try {
          await onDisconnect(own).remove();
          if (attempt !== epoch) return;
          session = { ref: own, sent: -Infinity, key: '', pending: false };
          flush();
        } catch {
          if (attempt === epoch) leave();
        }
      })
    );
    goOnline(db);
  }

  function visibility() {
    if (document.hidden) leave();
    else enter();
  }
  const interval = setInterval(() => { flush(); refreshPeers(); }, SEND_MS);
  document.addEventListener('visibilitychange', visibility);
  visibility();

  return {
    update(pose) {
      if (!open || !pose || ![pose.x, pose.y, pose.z, pose.a, pose.m].every(Number.isInteger)) return;
      latest = { x: pose.x, y: pose.y, z: pose.z, a: pose.a, m: pose.m };
      if ([pose.cx, pose.cy, pose.cz].every(Number.isInteger)) {
        Object.assign(latest, { cx: pose.cx, cy: pose.cy, cz: pose.cz });
      }
      flush();
    },
    async say(to, text) {
      const current = session;
      const message = typeof text === 'string' ? text.trim() : '';
      if (!current || !connected || !visiblePeers.has(to) || !message || message.length > 100) return false;
      const entry = push(speech);
      try {
        await onDisconnect(entry).remove();
        if (current !== session || !visiblePeers.has(to)) return false;
        await set(entry, { from: avatar, session: current.ref.key, to, text: message, t: serverTimestamp() });
        if (current !== session) {
          void remove(entry).catch(() => {});
          return false;
        }
        setTimeout(() => {
          if (current !== session) return;
          void remove(entry).then(() => {
            if (current === session) return onDisconnect(entry).cancel();
          }).catch(() => {});
        }, SPEECH_MS);
        return true;
      } catch {
        return false;
      }
    },
    close() {
      if (!open) return;
      open = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', visibility);
      leave();
    }
  };
}
