// Prehľad PPI a simulácie testov
import { h, mount, meter, renderMath, confirmDialog, toast } from '../core/ui.js';
import * as store from '../core/store.js';
import sustavy from './sustavy.js';
import boole from './boole.js';
import kmapy from './kmapy.js';
import nandnor from './nandnor.js';
import dekoder from './dekoder.js';
import klopne from './klopne.js';
import automaty from './automaty.js';
import synteza from './synteza.js';
import { pastExams } from '../prpr/index.js';
import { STATIC } from '../core/env.js';

export const MODULES = [sustavy, boole, kmapy, nandnor, dekoder, klopne, automaty, synteza];
export const moduleById = (id) => MODULES.find(m => m.id === id);

export function moduleMastery(m) {
  const vals = m.modes.map(md => store.mastery(m.id + '.' + md.id));
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export const EXAMS = {
  ppi2cv4: {
    title: 'PPI – pamäťové prvky a automaty (CV4)', kind: 'ppi-test2-cv4', minutes: 40,
    note: 'Podľa cvičenia 4: udalosti a hrany PO, príkazy JK, graf → tabuľka, odozva automatu, návrh zo slovného opisu a kódovanie stavov.',
    parts: [
      { mod: 'klopne', mode: 'udalosti', level: 2, points: 1.5 },
      { mod: 'klopne', mode: 'hrany', level: 2, points: 1.5 },
      { mod: 'automaty', mode: 'graf', level: 2, points: 1.5 },
      { mod: 'automaty', mode: 'simulacia', level: 2, points: 1.5 },
      { mod: 'automaty', mode: 'navrh', level: 2, points: 2 },
      { mod: 'synteza', mode: 'kodovanie', level: 2, points: 2 },
    ],
  },
  ppi2: {
    title: 'PPI TEST 2 – dekóder', kind: 'ppi-test2', minutes: 40,
    note: 'Skupinová minimalizácia, prevodník kódov, porovnanie DNF/KNF a bezhazardná forma. Hodnotí sa až po odovzdaní.',
    parts: [
      { mod: 'dekoder', mode: 'skupinova', level: 2, points: 3 },
      { mod: 'dekoder', mode: 'prevodnik', level: 2, points: 3 },
      { mod: 'dekoder', mode: 'porovnanie', level: 2, points: 2 },
      { mod: 'kmapy', mode: 'hazard', level: 2, points: 2 },
    ],
  },
  ppi3: {
    title: 'PPI TEST 3 – stavový automat', kind: 'ppi-test3', minutes: 40,
    note: 'Návrh automatu, odozva, syntéza s preklápacími obvodmi a časový priebeh.',
    parts: [
      { mod: 'automaty', mode: 'navrh', level: 2, points: 3 },
      { mod: 'automaty', mode: 'simulacia', level: 2, points: 2 },
      { mod: 'synteza', mode: 'funkcie', level: 2, points: 3 },
      { mod: 'klopne', mode: 'priebeh', level: 2, points: 2 },
    ],
  },
  ppi1: {
    title: 'PPI opakovanie TEST 1 – Boole a K-mapy', kind: 'ppi-test1', minutes: 30,
    note: 'Sústavy, zjednodušenie výrazu, MDNF/MKNF a NAND realizácia.',
    parts: [
      { mod: 'sustavy', mode: 'kody', level: 2, points: 2 },
      { mod: 'boole', mode: 'zjednodus', level: 2, points: 2 },
      { mod: 'kmapy', mode: 'mdnf', level: 2, points: 2 },
      { mod: 'kmapy', mode: 'mknf', level: 2, points: 2 },
      { mod: 'nandnor', mode: 'nand', level: 2, points: 2 },
    ],
  },
};

export function ppiIndex(view) {
  mount(view,
    h('div.ex-head', h('div', h('h1', '🔌 Princípy počítačového inžinierstva'), h('div.ex-intro', 'Každé cvičenie generuje nové príklady a kontroluje odpoveď. Percentá ukazujú úspešnosť v posledných pokusoch.'))),
    h('h2', 'Simulácie testov'),
    h('div.grid.cols-3', Object.entries(EXAMS).map(([id, e]) => {
      const last = store.get().exams.find(x => x.kind === e.kind);
      return h('a.tile', { href: '#/skusky/' + id }, h('div.tile-ico', '⏱'), h('h3', e.title), h('p', e.note), last ? h('span.tag.badge', { class: last.score / last.max >= .56 ? 'ok' : 'bad' }, `naposledy ${last.score}/${last.max}`) : null);
    })),
    h('h2', 'Cvičenia'),
    h('div.grid.cols-3', MODULES.map(m => {
      const mm = moduleMastery(m);
      return h('a.tile', { href: '#/ppi/' + m.id }, h('div.tile-ico', m.icon), h('h3', m.title), h('p', m.desc), h('div.meter', { class: mm >= .8 ? 'ok' : '' }, h('i', { style: { width: Math.round(mm * 100) + '%' } })));
    })),
    h('h2', 'Ďalej'),
    h('div.grid.cols-3',
      h('a.tile', { href: '#/kviz/PPI' }, h('div.tile-ico', '❓'), h('h3', 'Teória (kvíz)'), h('p', 'Pojmy, zákony, automaty, PO')),
      h('a.tile', { href: '#/karticky/PPI' }, h('div.tile-ico', '🃏'), h('h3', 'Kartičky z poznámok'), h('p', 'Opakovanie s rozostupmi (SM-2)')),
      STATIC ? null : h('a.tile', { href: '#/poznamky/PPI' }, h('div.tile-ico', '📚'), h('h3', 'Poznámky'), h('p', 'Prednášky a pojmy z Obsidianu'))));
}

export function examView(view, id) {
  const ex = EXAMS[id];
  if (!ex) { mount(view, h('p', 'Neznámy test.')); return; }
  let timerId, endAt, tasks, submitted = false, startedAt;
  const timer = h('span.timer');
  const start = () => {
    const mins = Number(document.getElementById('exam-min').value);
    tasks = ex.parts.map(p => {
      const m = MODULES.find(x => x.id === p.mod), mode = m.modes.find(x => x.id === p.mode);
      return { p, m, mode, task: mode.gen({ level: p.level, settings: store.settings() }) };
    });
    startedAt = Date.now();
    endAt = Date.now() + mins * 60000;
    timerId = setInterval(tick, 1000);
    mount(view,
      h('div.row', { style: { position: 'sticky', top: '52px', background: 'var(--bg)', padding: '8px 0', zIndex: 3 } }, h('h2', { style: { margin: 0 } }, ex.title), h('span.spacer'), timer,
        h('button.primary', { onclick: async () => { if (await confirmDialog('Odovzdať test?', 'Odovzdať')) submit(); } }, 'Odovzdať')),
      h('div.stack', tasks.map((t, i) => h('div.card', h('div.row', h('h3', { style: { margin: 0 } }, `${i + 1}. ${t.mode.label}`), h('span.spacer'), h('span.badge', `${t.p.points} b`)), h('div.ex-prompt', { style: { marginTop: '10px' } }, t.task.el)))));
    renderMath(view);
    tick();
  };
  const tick = () => {
    if (!document.body.contains(timer)) { clearInterval(timerId); return; }
    const left = Math.max(0, endAt - Date.now());
    timer.textContent = `${String(Math.floor(left / 60000)).padStart(2, '0')}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
    timer.classList.toggle('low', left < 5 * 60000);
    if (left <= 0 && !submitted) { toast('Čas vypršal – test sa odovzdal.', 'bad'); submit(); }
  };
  const submit = () => {
    submitted = true; clearInterval(timerId);
    let score = 0, max = 0;
    const results = tasks.map(t => {
      let r;
      try { r = t.task.check(); } catch (e) { r = { ok: false, feedback: e.message }; }
      if (r.incomplete) r = { ok: false, score: 0, feedback: 'Nevyplnené / neúplné: ' + (typeof r.feedback === 'string' ? r.feedback : '') };
      const frac = r.ok ? 1 : (r.score || 0);
      const pts = Math.round(frac * t.p.points * 2) / 2;
      score += pts; max += t.p.points;
      store.record(t.m.id + '.' + t.mode.id, !!r.ok, r.ok ? null : { title: `${t.m.title} – ${t.mode.label} (test)`, prompt: t.task.summary?.prompt || '', given: t.task.given ? t.task.given() : '', correct: r.correct || t.task.summary?.correct || '', route: `#/ppi/${t.m.id}/${t.mode.id}` });
      return { t, r, pts };
    });
    store.get().exams.unshift({ kind: ex.kind, title: ex.title, at: new Date().toISOString(), score, max, secs: Math.round((Date.now() - startedAt) / 1000) });
    store.save();
    const pass = score / max >= 0.56;
    mount(view,
      h('h1', `${ex.title}: ${score} / ${max} b`),
      h('div.callout', { class: pass ? 'ok' : 'bad' }, pass ? 'Na úrovni, ktorá stačí na zápočet (≥ 56 %).' : 'Pod 56 %. Pozri si riešenia a precvič slabé časti.'),
      h('div.stack', results.map(({ t, r, pts }, i) => h('div.card',
        h('div.row', h('h3', { style: { margin: 0 } }, `${i + 1}. ${t.mode.label}`), h('span.spacer'), h('span.badge', { class: pts === t.p.points ? 'ok' : pts ? 'warn' : 'bad' }, `${pts} / ${t.p.points} b`), h('a.btn.small', { href: `#/ppi/${t.m.id}/${t.mode.id}` }, 'Precvičiť')),
        h('div.ex-prompt', { style: { marginTop: '8px' } }, t.task.el),
        h('div.callout', { class: r.ok ? 'ok' : 'bad' }, typeof r.feedback === 'string' ? h('div', { html: r.feedback }) : r.feedback),
        h('details', h('summary', 'Riešenie'), (() => { const s = t.task.solution(); return typeof s === 'string' ? h('div', { html: s }) : s; })())))),
      h('div.toolbar', h('button.primary', { onclick: () => examView(view, id) }, 'Nový test'), h('a.btn', { href: '#/ppi' }, 'Späť na PPI')));
    renderMath(view);
  };
  mount(view, h('h1', '⏱ ' + ex.title),
    h('div.card', h('p', ex.note), h('ul', ex.parts.map(p => { const m = MODULES.find(x => x.id === p.mod); return h('li', `${m.modes.find(x => x.id === p.mode).label} (${m.title}) – ${p.points} b`); })),
      h('p.small.muted', 'Toto je cvičná simulácia z generovaných príkladov, nie skutočné zadanie testu. Formát reálneho testu sa môže líšiť.'),
      h('div.row', h('button.primary', { onclick: start }, 'Začať'), h('select', { id: 'exam-min' }, [20, 30, 40, 60, 90].map(m => h('option', { value: m, selected: m === ex.minutes }, m + ' minút'))))),
    pastExams(ex.kind));
}
