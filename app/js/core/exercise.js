// Spoločný rámec pre cvičenia: generátor úlohy → kontrola → riešenie → štatistika a denník chýb.
//
// Modul cvičenia: { id, title, icon, desc, intro, modes: [{ id, label, desc, levels?, gen(opts) → Task }] }
// Task: { el: Node, check(): Result, solution(): Node|string, summary: { title, prompt }, given?(): string,
//         focus?(), noSolution?: bool }
// Result: { ok: bool, score?: 0..1, feedback: Node|string, correct?: string }
import { h, mount, renderMath, toast } from './ui.js';
import * as store from './store.js';

export function exerciseView(view, mod, params = []) {
  const modeId = params[0] && mod.modes.find(m => m.id === params[0]) ? params[0] : mod.modes[0].id;
  let mode = mod.modes.find(m => m.id === modeId);
  const lvlKey = 'lvl.' + mod.id;
  let level = 1;
  try { level = Number(sessionStorage.getItem(lvlKey) || 1); } catch {}
  const session = { n: 0, ok: 0 };

  const tabs = h('div.ex-tabs');
  const levelBox = h('div.level-pick');
  const statsBox = h('div.ex-stats');
  const card = h('div.card');
  const modeDesc = h('p.muted.small');

  function renderTabs() {
    mount(tabs, mod.modes.map(m => h('button', {
      class: m.id === mode.id ? 'active' : '',
      onclick: () => { location.hash = `#/${mod.route || 'ppi/' + mod.id}/${m.id}`; },
    }, m.label, masteryDot(mod.id + '.' + m.id))));
  }
  function renderLevel() {
    if (!mode.levels) { mount(levelBox); return; }
    mount(levelBox, h('span.muted.small', 'Náročnosť:'), h('div.seg', [1, 2, 3].map(l => h('button.small', {
      class: l === level ? 'active' : '', onclick: () => { level = l; try { sessionStorage.setItem(lvlKey, l); } catch {} renderLevel(); next(); },
    }, ['ľahká', 'stredná', 'ťažká'][l - 1]))));
  }
  function renderStats() {
    const st = store.statOf(mod.id + '.' + mode.id);
    mount(statsBox,
      h('span', 'Teraz: ', h('b', `${session.ok}/${session.n}`)),
      h('span', 'Séria: ', h('b', st.streak)),
      h('span', 'Celkovo: ', h('b', st.n ? Math.round(100 * st.ok / st.n) + ' %' : '–'), ` z ${st.n}`));
  }

  let task = null, checked = false, recorded = false;
  const feedback = h('div.ex-feedback');
  const solutionBox = h('div.ex-solution');
  const btnCheck = h('button.primary', { onclick: () => check() }, 'Skontrolovať');
  const btnSol = h('button', { onclick: () => showSolution() }, 'Ukázať riešenie');
  const btnNext = h('button', { onclick: () => next() }, 'Ďalší príklad →');

  function next() {
    checked = false; recorded = false;
    mount(feedback); mount(solutionBox);
    try {
      task = mode.gen({ level, settings: store.settings() });
    } catch (e) {
      console.error(e);
      task = { el: h('div.callout.bad', 'Nepodarilo sa vygenerovať úlohu: ' + e.message), check: () => ({ ok: false, feedback: '' }), solution: () => '' };
    }
    btnSol.classList.toggle('hidden', !!task.noSolution);
    mount(card, h('div.ex-prompt', task.el), feedback, solutionBox, h('div.ex-actions', btnCheck, btnSol, btnNext, h('span.spacer'),
      h('span.kbd-hint', h('kbd', 'Enter'), ' skontrolovať · ', h('kbd', '⌥'), h('kbd', '→'), ' ďalší')));
    renderMath(card);
    setTimeout(() => (task.focus ? task.focus() : card.querySelector('input:not([type=checkbox]),textarea,select')?.focus()), 30);
  }

  function check() {
    if (!task) return;
    let res;
    try { res = task.check(); } catch (e) { console.error(e); res = { ok: false, feedback: 'Chyba pri kontrole: ' + e.message }; }
    if (res.incomplete) { mount(feedback, h('div.callout.warn', res.feedback)); return; }
    checked = true;
    const box = h('div.callout', { class: res.ok ? 'ok' : (res.score > 0 ? 'warn' : 'bad') });
    box.append(h('div.callout-title', res.ok ? pickPraise() : res.score > 0 ? `Čiastočne správne (${Math.round(res.score * 100)} %)` : 'Ešte nie'));
    if (res.feedback) box.append(typeof res.feedback === 'string' ? h('div', { html: res.feedback }) : res.feedback);
    mount(feedback, box);
    renderMath(feedback);
    if (!recorded) {
      recorded = true;
      session.n++; if (res.ok) session.ok++;
      store.record(mod.id + '.' + mode.id, res.ok, res.ok ? null : {
        title: `${mod.title} – ${mode.label}`,
        prompt: task.summary?.prompt || '',
        given: task.given ? task.given() : '',
        correct: res.correct || task.summary?.correct || '',
        route: `#/${mod.route || 'ppi/' + mod.id}/${mode.id}`,
      });
      renderStats(); renderTabs();
    }
    if (res.ok) btnNext.focus();
  }

  function showSolution() {
    if (!task || task.noSolution) return;
    const s = task.solution();
    mount(solutionBox, h('div.card.flat', { style: { background: 'var(--panel-2)' } }, h('h3', 'Riešenie'), typeof s === 'string' ? h('div', { html: s }) : s));
    renderMath(solutionBox);
    if (!recorded) {
      recorded = true; session.n++;
      store.record(mod.id + '.' + mode.id, false, {
        title: `${mod.title} – ${mode.label}`, prompt: task.summary?.prompt || '', given: '(pozrel som riešenie)', correct: task.summary?.correct || '',
        route: `#/${mod.route || 'ppi/' + mod.id}/${mode.id}`,
      });
      renderStats(); renderTabs();
    }
  }

  const onKey = (e) => {
    if (!document.body.contains(card)) { document.removeEventListener('keydown', onKey); return; }
    if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); next(); return; }
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON' && card.contains(e.target)) {
      e.preventDefault();
      if (checked && feedback.querySelector('.callout.ok')) next(); else check();
    }
  };
  document.addEventListener('keydown', onKey);

  mount(view,
    h('div.ex-head', h('div', h('h1', mod.icon ? mod.icon + ' ' : '', mod.title), mod.intro ? h('div.ex-intro', mod.intro) : null)),
    tabs, h('div.row', { style: { marginBottom: '12px' } }, levelBox, h('span.spacer'), statsBox),
    mode.desc ? modeDesc : null, card);
  if (mode.desc) modeDesc.innerHTML = mode.desc;
  renderTabs(); renderLevel(); renderStats(); next();
}

function masteryDot(id) {
  const st = store.statOf(id);
  if (!st.n) return null;
  const m = store.mastery(id);
  return h('span.badge', { class: m >= .8 ? 'ok' : m >= .5 ? 'warn' : 'bad', style: { marginLeft: '4px' } }, Math.round(m * 100) + '%');
}

const PRAISE = ['Správne!', 'Výborne!', 'Presne tak.', 'Super, sedí to.', 'Správne – tak ďalej!'];
const pickPraise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

export { toast };
