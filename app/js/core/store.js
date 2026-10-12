// Pokrok sa ukladá na server do data/progress.json (a záložne do localStorage).
// V zdieľanej (statickej) verzii sa ukladá do prehliadača a – ak to stránka dovolí – aj do
// súkromného úložiska prihláseného používateľa (capability db: data/users/<id>/progress).
import { today } from './ui.js';
import { STATIC } from './env.js';

const LOCAL_KEY = 'fiit-trener';
let remote = null;                 // { ref } keď je k dispozícii úložisko stránky
let writing = Promise.resolve();   // zápisy do úložiska idú po jednom
const remoteListeners = new Set();
export function onRemoteLoad(fn) { remoteListeners.add(fn); }

const DEFAULT = {
  v: 1,
  stats: {},        // id cvičenia → { n, ok, streak, best, last, recent: [1,0,...] }
  daily: {},        // 'YYYY-MM-DD' → počet vyriešených úloh
  mistakes: [],     // { id, ex, title, at, prompt, given, correct, resolved }
  srs: {},          // id kartičky → { ef, ivl, reps, due, lapses }
  srsNew: {},       // 'YYYY-MM-DD' → počet nových kartičiek
  prpr: { drafts: {}, solved: {}, attempts: {}, predict: {} },
  quiz: {},         // id otázky → { n, ok, last }
  exams: [],        // { kind, title, at, score, max, secs }
  settings: {
    theme: 'auto',
    kmapOrder: 'zosit',   // 'zosit' = 00 01 11 10 · 'prednaska' = 00 10 11 01 s pruhmi
    varNames: 'ABCD',     // 'ABCD' alebo 'x1x2'
    negInputs: false,     // pri NAND/NOR: sú k dispozícii aj negované vstupy?
    sanitize: true,
    newCardsPerDay: 25,
    sound: false,
  },
};

let state = structuredClone(DEFAULT);
let saveTimer = null;
const listeners = new Set();

function merge(base, data) {
  for (const [k, v] of Object.entries(data || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) merge(base[k], v);
    else base[k] = v;
  }
  return base;
}

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch { return null; }
}

export async function load() {
  if (STATIC) {
    state = merge(structuredClone(DEFAULT), readLocal() || {});
    connectRemote(); // beží na pozadí, stránka sa vykreslí hneď
    return state;
  }
  let data = null;
  try {
    const r = await fetch('/api/progress');
    if (r.ok) data = await r.json();
  } catch {}
  if (!data || !Object.keys(data).length) {
    try { data = JSON.parse(localStorage.getItem('fiit-trener') || 'null'); } catch {}
  }
  state = merge(structuredClone(DEFAULT), data || {});
  return state;
}

export function get() { return state; }
export function settings() { return state.settings; }
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function setSaveState(cls, title) {
  const el = document.getElementById('save-state');
  if (el) { el.className = cls; el.title = title; }
}
export function save() {
  clearTimeout(saveTimer);
  setSaveState('saving', 'Ukladám…');
  saveTimer = setTimeout(flush, 700);
  listeners.forEach(fn => fn(state));
}
// prepojenie so súkromným úložiskom prihláseného používateľa (iba zdieľaná verzia)
async function connectRemote() {
  try {
    if (!window.claude?.use) return;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return;
    const id = await user.id();
    if (!id) return;
    const ref = db.doc('data/users/' + id + '/progress');
    const snap = await ref.get();
    remote = { ref };
    const remoteState = snap.exists ? JSON.parse(snap.data().json || '{}') : null;
    if (remoteState && (remoteState.savedAt || '') > (state.savedAt || '')) {
      state = merge(structuredClone(DEFAULT), remoteState);
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); } catch {}
      remoteListeners.forEach(fn => fn(state));
    } else if (state.savedAt && (!remoteState || state.savedAt > (remoteState.savedAt || ''))) {
      pushRemote();
    }
    setSaveState('', 'Uložené v prehliadači aj v tvojom úložisku stránky');
  } catch {
    remote = null;
  }
}
function pushRemote() {
  if (!remote) return;
  const body = { json: JSON.stringify(state), savedAt: state.savedAt || '' };
  writing = writing.then(() => remote && remote.ref.set(body)).catch((e) => {
    // čitateľ bez práva zápisu alebo príliš veľký dokument: ostaneme iba pri prehliadači
    if (e && (e.code === 'invalid_argument' || e.code === 'not_granted' || e.code === 'revoked' || e.code === 'quota_exceeded')) remote = null;
  });
}

export async function flush() {
  clearTimeout(saveTimer);
  if (STATIC) {
    state.savedAt = new Date().toISOString();
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); setSaveState('', remote ? 'Uložené' : 'Uložené v tomto prehliadači'); }
    catch { setSaveState('error', 'Prehliadač nedovolil uložiť pokrok (súkromné okno?)'); }
    pushRemote();
    return;
  }
  const body = JSON.stringify(state);
  try { localStorage.setItem(LOCAL_KEY, body); } catch {}
  try {
    const r = await fetch('/api/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    if (!r.ok) throw new Error();
    setSaveState('', 'Uložené');
  } catch {
    setSaveState('error', 'Server nedostupný – pokrok je uložený iba v prehliadači');
  }
}
window.addEventListener('beforeunload', () => {
  if (STATIC) { if (saveTimer) { state.savedAt = new Date().toISOString(); try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); } catch {} } return; }
  if (saveTimer) { try { navigator.sendBeacon('/api/progress', new Blob([JSON.stringify(state)], { type: 'application/json' })); } catch {} }
});

// zaznamená pokus v cvičení; mistake = { title, prompt, given, correct } pri chybe
export function record(exId, ok, mistake) {
  const s = state.stats[exId] ||= { n: 0, ok: 0, streak: 0, best: 0, last: null, recent: [] };
  s.n++; if (ok) s.ok++;
  s.streak = ok ? s.streak + 1 : 0;
  s.best = Math.max(s.best, s.streak);
  s.last = new Date().toISOString();
  s.recent = [...s.recent, ok ? 1 : 0].slice(-20);
  const d = today();
  state.daily[d] = (state.daily[d] || 0) + 1;
  if (!ok && mistake) {
    state.mistakes.unshift({ id: Math.random().toString(36).slice(2, 10), ex: exId, at: new Date().toISOString(), resolved: false, ...mistake });
    state.mistakes = state.mistakes.slice(0, 400);
  }
  save();
}
export function statOf(exId) { return state.stats[exId] || { n: 0, ok: 0, streak: 0, best: 0, recent: [] }; }
// odhad zvládnutia 0..1 z posledných pokusov
export function mastery(exId) {
  const r = statOf(exId).recent;
  if (!r.length) return 0;
  const w = r.slice(-10);
  return w.reduce((a, b) => a + b, 0) / Math.max(5, w.length);
}

let themeSetByApp = false;
export function applyTheme() {
  const t = state.settings.theme;
  // v zdieľanej verzii tému pri „auto“ určuje prehliadač alebo claude.ai – jeho atribút data-theme nemažeme
  if (t === 'auto') { if (!STATIC || themeSetByApp) document.documentElement.removeAttribute('data-theme'); themeSetByApp = false; return; }
  themeSetByApp = true;
  document.documentElement.setAttribute('data-theme', t);
}

export function exportJSON() { return JSON.stringify(state, null, 1); }
export function importJSON(text) { state = merge(structuredClone(DEFAULT), JSON.parse(text)); save(); }
export function reset() { state = structuredClone(DEFAULT); save(); }
