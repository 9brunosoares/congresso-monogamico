// Os controles de prévia continuam no perfil do organizador.
export const DISCOVERY_OWNER = 'bruno';
export const DISCOVERY_RELEASED = true;
export const DISCOVERY_END = Date.parse('2026-11-18T00:00:00-03:00');

export function discoveryAllowed(id) {
  return !!id && (id === DISCOVERY_OWNER || DISCOVERY_RELEASED);
}

// O progresso da descoberta fica no aparelho, por perfil.
export function createDiscovery(storage) {
  const memory = new Map();
  const key = id => 'xvi-discovery-v1-' + id;
  function read(id) {
    if (!discoveryAllowed(id)) return {};
    if (memory.has(id)) return memory.get(id);
    let value;
    try { value = JSON.parse(storage?.getItem(key(id)) || '{}'); } catch {}
    const state = value && typeof value === 'object' ? value : {};
    memory.set(id, state);
    return state;
  }
  function save(id, state) {
    memory.set(id, state);
    try { storage?.setItem(key(id), JSON.stringify(state)); } catch {}
    return state;
  }
  function record(id, event, at = Date.now()) {
    if (!discoveryAllowed(id)) return {};
    const previous = read(id), state = { ...previous };
    if (event === 'open') state.visits = Math.min(2, (Number(state.visits) || 0) + 1);
    if (event === 'programa') state.agenda = true;
    if (event === 'contas') state.accounts = true;
    if (!state.unlockedAt && at < DISCOVERY_END && state.visits >= 2 && state.agenda && state.accounts) state.unlockedAt = at;
    if (event === 'enter' && state.unlockedAt && !state.enteredAt) state.enteredAt = at;
    return JSON.stringify(state) === JSON.stringify(previous) ? previous : save(id, state);
  }
  return {
    read, record,
    portal(id, at = Date.now()) { const s = read(id); return discoveryAllowed(id) && at < DISCOVERY_END && !!s.unlockedAt && !s.enteredAt; },
    access(id, at = Date.now()) { return discoveryAllowed(id) && (!!read(id).enteredAt || this.portal(id, at)); },
    reset(id) { if (id === DISCOVERY_OWNER) return save(id, { visits: 1 }); }
  };
}
