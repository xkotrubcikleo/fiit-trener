// Domov, denník chýb, štatistiky, nastavenia
import { h, mount, esc, meter, toast, confirmDialog, today, daysBetween, plural, fmtDate, renderMath } from '../core/ui.js';
import * as store from '../core/store.js';
import { MODULES, EXAMS, moduleMastery } from '../ppi/index.js';
import { dueCounts, SUBJECTS } from './study.js';
import { loadContent } from '../prpr/index.js';
import { kmap, varNames } from '../ppi/common.js';
import { STATIC } from '../core/env.js';

let config = null;
export async function getConfig() { if (!config) config = await (await fetch(STATIC ? 'data/config.json' : '/api/config')).json().catch(() => ({ deadlines: [] })); return config; }

// odporúčania podľa najbližších termínov
const PLAN = {
  'PPI TEST 2': [['ppi/dekoder/skupinova', 'Skupinová minimalizácia (CV3)'], ['ppi/dekoder/prevodnik', 'Kódový prevodník'], ['skusky/ppi2', 'Simulácia TEST 2 – dekóder'], ['ppi/klopne/udalosti', 'CV4: udalosti a hrany PO'], ['ppi/automaty/navrh', 'CV4: návrh automatu'], ['ppi/synteza/kodovanie', 'CV4: kódovanie stavov'], ['skusky/ppi2cv4', 'Simulácia podľa CV4']],
  'PPI TEST 3': [['ppi/automaty/navrh', 'Návrh automatu'], ['ppi/synteza/kodovanie', 'Kódovanie stavov'], ['ppi/synteza/funkcie', 'Budiace funkcie'], ['skusky/ppi2cv4', 'Simulácia podľa CV4'], ['skusky/ppi3', 'Simulácia TEST 3']],
  'PrPr Test': [['prpr/nahodna/cykly', 'Náhodná úloha z cyklov'], ['prpr/cvicenia/predict-cykly', 'Čo vypíše program? (cykly)'], ['kviz/PrPr', 'Kvíz z C'], ['prpr/test', 'Simulácia testu z cyklov']],
};
function planFor(d) {
  if (d.subject === 'PPI' && /TEST 2/.test(d.title)) return PLAN['PPI TEST 2'];
  if (d.subject === 'PPI' && /TEST 3/.test(d.title)) return PLAN['PPI TEST 3'];
  if (d.subject === 'PrPr' && /[Tt]est/.test(d.title)) return PLAN['PrPr Test'];
  return null;
}

function streak() {
  const daily = store.get().daily;
  let s = 0; const d = new Date();
  if (!daily[today()]) d.setDate(d.getDate() - 1);
  for (;;) { const k = d.toISOString().slice(0, 10); if (daily[k]) { s++; d.setDate(d.getDate() - 1); } else break; }
  return s;
}
function heatmap(weeks = 16) {
  const daily = store.get().daily;
  const start = new Date(); start.setDate(start.getDate() - (weeks * 7 - 1) - ((start.getDay() + 6) % 7 === 6 ? 0 : 0));
  // zarovnať na pondelok
  while ((start.getDay() + 6) % 7 !== 0) start.setDate(start.getDate() - 1);
  const cells = [];
  const d = new Date(start);
  while (d <= new Date()) {
    const k = d.toISOString().slice(0, 10), v = daily[k] || 0;
    cells.push(h('i', { class: v >= 20 ? 'l3' : v >= 8 ? 'l2' : v ? 'l1' : '', title: `${fmtDate(k)}: ${v} ${plural(v, 'úloha', 'úlohy', 'úloh')}` }));
    d.setDate(d.getDate() + 1);
  }
  return h('div.heat', cells);
}

export async function dashboard(view) {
  const cfg = await getConfig();
  const t = today();
  const dl = (cfg.deadlines || []).filter(d => daysBetween(t, d.date) >= 0).sort((a, b) => a.date.localeCompare(b.date));
  const st = store.get();
  const todayCount = st.daily[t] || 0;
  const hour = new Date().getHours();
  const greet = hour < 10 ? 'Dobré ráno' : hour < 18 ? 'Ahoj' : 'Dobrý večer';
  const dueBox = h('span', '…');
  const weak = [];
  for (const m of MODULES) for (const md of m.modes) {
    const s = store.statOf(m.id + '.' + md.id);
    if (s.n >= 3) weak.push({ m, md, v: store.mastery(m.id + '.' + md.id) });
  }
  weak.sort((a, b) => a.v - b.v);
  const next = dl.find(d => planFor(d));
  const prprBox = h('span', '…');
  mount(view,
    h('h1', `${greet}! 👋`),
    h('p.muted', todayCount ? `Dnes máš za sebou ${todayCount} ${plural(todayCount, 'úlohu', 'úlohy', 'úloh')}.` : 'Dnes si ešte nič nerobil – stačí 15 minút.'),
    h('div.grid.cols-4',
      h('div.card', h('div.stat-big', streak()), h('div.stat-lbl', `${plural(streak(), 'deň', 'dni', 'dní')} v rade`)),
      h('div.card', h('div.stat-big', dueBox), h('div.stat-lbl', 'kartičiek na zopakovanie'), h('a.small', { href: '#/karticky/vsetko' }, 'Opakovať →')),
      h('div.card', h('div.stat-big', prprBox), h('div.stat-lbl', 'vyriešených úloh z C'), h('a.small', { href: '#/prpr' }, 'Programovať →')),
      h('div.card', h('div.stat-big', st.mistakes.filter(m => !m.resolved).length), h('div.stat-lbl', 'chýb na prejdenie'), h('a.small', { href: '#/chyby' }, 'Denník chýb →'))),
    h('div.grid.cols-2', { style: { marginTop: '14px' } },
      h('div.card', h('h2', 'Termíny'),
        dl.length ? dl.slice(0, 7).map(d => {
          const n = daysBetween(t, d.date);
          return h('div.deadline', h('div.days', { class: n <= 2 ? 'soon' : n <= 7 ? 'near' : '' }, n === 0 ? 'dnes' : n === 1 ? 'zajtra' : `o ${n} d`),
            h('div', h('div', h('b', d.subject), ' – ', d.title), h('div.small.muted', fmtDate(d.date) + (d.approx ? ' (orientačne)' : ''))));
        }) : h('p.muted', 'Žiadne termíny.'),
        h('p.small.muted', { style: { marginTop: '8px' } }, STATIC ? 'Orientačné termíny 1. semestra – presný deň testu závisí od tvojho cvičenia.' : 'Termíny upravíš v súbore data/config.json.')),
      h('div.card', h('h2', 'Čo robiť teraz'),
        next ? h('div', h('p', { html: `Najbližšie: <b>${esc(next.subject)} – ${esc(next.title)}</b> (${daysBetween(t, next.date) === 0 ? 'dnes' : 'o ' + daysBetween(t, next.date) + ' d'}).` }),
          h('div.stack', planFor(next).map(([r, l]) => h('a.task-row', { href: '#/' + r }, h('span.st', '→'), h('span', l))))) : null,
        weak.length ? h('div', h('h3', 'Najslabšie miesta'), weak.slice(0, 4).map(w => h('a.task-row', { href: `#/ppi/${w.m.id}/${w.md.id}` }, h('span.st', w.m.icon), h('span', `${w.m.title} – ${w.md.label}`), h('span.spacer'), h('span.badge', { class: w.v >= .8 ? 'ok' : w.v >= .5 ? 'warn' : 'bad' }, Math.round(w.v * 100) + ' %')))) :
          h('p.small.muted', 'Keď niečo precvičíš, ukážem ti tu najslabšie témy.'))),
    h('div.card', { style: { marginTop: '14px' } }, h('div.row', h('h2', { style: { margin: 0 } }, 'Aktivita'), h('span.spacer'), h('span.small.muted', 'posledných 16 týždňov')), h('div', { style: { marginTop: '10px', overflowX: 'auto' } }, heatmap())),
    h('h2', 'Predmety'),
    h('div.grid.cols-3',
      h('a.tile', { href: '#/ppi' }, h('div.tile-ico', '🔌'), h('h3', 'PPI'), h('p', 'Sústavy, Boole, K-mapy, dekóder, automaty, syntéza'), meter(MODULES.reduce((s, m) => s + moduleMastery(m), 0) / MODULES.length)),
      h('a.tile', { href: '#/prpr' }, h('div.tile-ico', '💻'), h('h3', 'PrPr'), h('p', 'Úlohy v C s testami, čítanie kódu, simulácia testu')),
      h('a.tile', { href: '#/karticky' }, h('div.tile-ico', '🃏'), h('h3', 'Kartičky'), h('p', 'Zo všetkých predmetov v Obsidiane')),
      STATIC ? null : h('a.tile', { href: '#/poznamky/PPI' }, h('div.tile-ico', '📚'), h('h3', 'Poznámky'), h('p', 'Prehliadač vaultu so vzorcami')),
      h('a.tile', { href: '#/kviz/PPI' }, h('div.tile-ico', '❓'), h('h3', 'Kvízy'), h('p', 'Teória PPI a jazyka C'))));
  dueCounts().then(c => { dueBox.textContent = Object.values(c).reduce((a, x) => a + x.due, 0); }).catch(() => { dueBox.textContent = '–'; });
  loadContent().then(c => { prprBox.textContent = `${c.tasks.filter(x => st.prpr.solved[x.id]).length}/${c.tasks.length}`; }).catch(() => { prprBox.textContent = '–'; });
}

export function mistakesView(view) {
  let showResolved = false;
  const render = () => {
    const all = store.get().mistakes;
    const list = all.filter(m => showResolved || !m.resolved);
    const groups = new Map();
    list.forEach(m => { if (!groups.has(m.title)) groups.set(m.title, []); groups.get(m.title).push(m); });
    mount(view, h('h1', '📕 Denník chýb'),
      h('p.muted', 'Sem sa automaticky zapisuje každá chyba aj pozreté riešenie. Prejdi si ich, pochop, kde bola chyba, a precvič tému znova.'),
      h('div.toolbar', h('label.check', h('input', { type: 'checkbox', checked: showResolved, onchange: (e) => { showResolved = e.target.checked; render(); } }), 'zobraziť aj vyriešené'),
        h('span.spacer'), h('button.small', { onclick: async () => { if (await confirmDialog('Vymazať všetky vyriešené chyby?', 'Vymazať')) { store.get().mistakes = all.filter(m => !m.resolved); store.save(); render(); } } }, 'Vymazať vyriešené')),
      list.length ? [...groups].map(([title, ms]) => h('div.card', h('div.row', h('h3', { style: { margin: 0 } }, title), h('span.badge.bad', ms.length), h('span.spacer'), ms[0].route ? h('a.btn.small.primary', { href: ms[0].route }, 'Precvičiť') : null),
        h('div.stack', { style: { marginTop: '10px' } }, ms.slice(0, 12).map(m => h('div', { style: { borderTop: '1px solid var(--border)', paddingTop: '8px', opacity: m.resolved ? .55 : 1 } },
          h('div.row', h('span.small.muted', new Date(m.at).toLocaleString('sk-SK')), h('span.spacer'),
            h('button.small', { onclick: () => { m.resolved = !m.resolved; store.save(); render(); } }, m.resolved ? 'Vrátiť' : '✓ Pochopené')),
          h('div', { html: `<b>Úloha:</b> ${m.prompt || ''}` }),
          m.given ? h('div', { html: `<b>Tvoja odpoveď:</b> <code>${esc(m.given)}</code>` }) : null,
          m.correct ? h('div', { html: `<b>Správne:</b> ${/</.test(m.correct) ? m.correct : '<code>' + esc(m.correct) + '</code>'}` }) : null))))) : h('div.card', h('p', '🎉 Žiadne nevyriešené chyby.')));
    renderMath(view);
  };
  render();
}

export async function statsView(view) {
  const st = store.get();
  const rows = [];
  for (const m of MODULES) for (const md of m.modes) {
    const s = store.statOf(m.id + '.' + md.id);
    rows.push({ name: `${m.title} – ${md.label}`, route: `#/ppi/${m.id}/${md.id}`, s, v: store.mastery(m.id + '.' + md.id) });
  }
  const extra = [['prpr.predict', 'PrPr – čo vypíše program', '#/prpr/cvicenia/predict'], ['kviz.PPI', 'Kvíz PPI', '#/kviz/PPI'], ['kviz.PrPr', 'Kvíz PrPr', '#/kviz/PrPr']];
  extra.forEach(([id, name, route]) => rows.push({ name, route, s: store.statOf(id), v: store.mastery(id) }));
  const c = await loadContent().catch(() => null);
  const totalDays = Object.keys(st.daily).length, totalTasks = Object.values(st.daily).reduce((a, b) => a + b, 0);
  const cards = Object.values(st.srs);
  mount(view, h('h1', '📊 Štatistiky'),
    h('div.grid.cols-4',
      h('div.card', h('div.stat-big', totalTasks), h('div.stat-lbl', 'vyriešených úloh a kartičiek')),
      h('div.card', h('div.stat-big', totalDays), h('div.stat-lbl', 'dní s učením')),
      h('div.card', h('div.stat-big', cards.filter(x => x.ivl >= 7).length), h('div.stat-lbl', 'kartičiek zapamätaných (interval ≥ 7 dní)')),
      h('div.card', h('div.stat-big', c ? `${c.tasks.filter(x => st.prpr.solved[x.id]).length}/${c.tasks.length}` : '–'), h('div.stat-lbl', 'úloh z C'))),
    h('div.card', { style: { marginTop: '14px' } }, h('h2', { style: { marginTop: 0 } }, 'Cvičenia'),
      h('div.table-wrap', h('table.t', { style: { width: '100%' } }, h('tr', h('th.l', 'cvičenie'), h('th', 'pokusov'), h('th', 'úspešnosť'), h('th', 'zvládnutie (posledné)'), h('th', 'najlepšia séria')),
        rows.map(r => h('tr', h('td.l', h('a', { href: r.route }, r.name)), h('td', r.s.n), h('td', r.s.n ? Math.round(100 * r.s.ok / r.s.n) + ' %' : '–'),
          h('td', { style: { minWidth: '140px' } }, r.s.n ? meter(r.v, r.v >= .8 ? 'ok' : '') : h('span.muted', '–')), h('td', r.s.best || 0)))))),
    st.exams.length ? h('div.card', h('h2', { style: { marginTop: 0 } }, 'Simulácie testov'), h('table.t', h('tr', h('th.l', 'test'), h('th.l', 'kedy'), h('th', 'body')),
      st.exams.slice(0, 20).map(e => h('tr', h('td.l', e.title), h('td.l', new Date(e.at).toLocaleString('sk-SK')), h('td', { class: e.score / e.max >= .56 ? 'ok' : 'bad' }, `${e.score} / ${e.max}`))))) : null);
}

export async function settingsView(view) {
  const s = store.settings();
  const cfg = await getConfig();
  const set = (k, v) => { s[k] = v; store.save(); if (k === 'theme') store.applyTheme(); render(); };
  const sel = (k, opts) => h('select', { onchange: (e) => set(k, e.target.value === 'true' ? true : e.target.value === 'false' ? false : isNaN(e.target.value) ? e.target.value : Number(e.target.value)) },
    opts.map(([v, l]) => h('option', { value: String(v), selected: String(s[k]) === String(v) }, l)));
  const render = () => {
    const preview = kmap(4, varNames(4), Array.from({ length: 16 }, (_, i) => [0, 2, 5, 7, 8, 10, 13, 15].includes(i) ? '1' : '0'), {});
    mount(view, h('h1', '⚙ Nastavenia'),
      h('div.card', h('h2', { style: { marginTop: 0 } }, 'Vzhľad'),
        h('div.row', h('span', 'Téma:'), sel('theme', [['auto', 'podľa systému'], ['light', 'svetlá'], ['dark', 'tmavá']]))),
      h('div.card', h('h2', { style: { marginTop: 0 } }, 'PPI'),
        h('div.row', h('span', 'Označenie K-mapy:'), sel('kmapOrder', [['zosit', 'zošit / CV3 PDF: stĺpce 00 01 11 10'], ['prednaska', 'prednáška: pruhy, stĺpce 00 10 11 01']])),
        h('div.row', { style: { marginTop: '8px' } }, h('span', 'Názvy premenných:'), sel('varNames', [['ABCD', 'A, B, C, D'], ['x1x2', 'x₁, x₂, x₃, x₄ (píš x1, x2…)']])),
        h('div.row', { style: { marginTop: '8px' } }, h('span', 'NAND/NOR realizácia:'), sel('negInputs', [[false, 'negované vstupy nie sú k dispozícii'], [true, 'negované vstupy sú k dispozícii']])),
        h('div', { style: { marginTop: '12px' } }, h('div.small.muted', 'Ukážka mapy (DE čísla v rohoch):'), preview.el)),
      STATIC ? null : h('div.card', h('h2', { style: { marginTop: 0 } }, 'PrPr'),
        h('label.check', h('input', { type: 'checkbox', checked: s.sanitize, onchange: (e) => set('sanitize', e.target.checked) }), 'Kontrola chýb za behu (UndefinedBehaviorSanitizer – prístup mimo poľa, pretečenie, delenie nulou)')),
      h('div.card', h('h2', { style: { marginTop: 0 } }, 'Kartičky'),
        h('div.row', h('span', 'Nových kartičiek denne:'), sel('newCardsPerDay', [[10, '10'], [15, '15'], [25, '25'], [40, '40'], [60, '60'], [999, 'bez limitu']]))),
      STATIC ? h('div.card', h('h2', { style: { marginTop: 0 } }, 'Dáta'),
        h('p.small.muted', 'Pokrok sa ukladá v tomto prehliadači. Ak si prihlásený a stránka ti dovolí zapisovať, ukladá sa aj do tvojho súkromného úložiska stránky, ktoré nevidí nikto iný.'),
        h('div.toolbar', h('button.danger', { onclick: async () => { if (await confirmDialog('Naozaj vymazať celý pokrok? Toto sa nedá vrátiť.', 'Vymazať všetko')) { store.reset(); toast('Pokrok vymazaný'); render(); } } }, 'Vymazať pokrok'))) :
      h('div.card', h('h2', { style: { marginTop: 0 } }, 'Dáta'),
        h('p.small.muted', { html: `Pokrok sa ukladá do <code>~/Projekty/fiit-trener/data/progress.json</code>. Vault: <code>${esc(cfg.vaultPath || '')}</code>.` }),
        h('div.toolbar',
          h('button', { onclick: () => { const a = h('a', { href: URL.createObjectURL(new Blob([store.exportJSON()], { type: 'application/json' })), download: `fiit-trener-${new Date().toISOString().slice(0, 10)}.json` }); a.click(); } }, 'Exportovať zálohu'),
          h('label.btn', 'Importovať zálohu', h('input', { type: 'file', accept: '.json', style: { display: 'none' }, onchange: async (e) => { const f = e.target.files[0]; if (!f) return; try { store.importJSON(await f.text()); toast('Záloha načítaná', 'ok'); render(); } catch { toast('Súbor sa nedá načítať', 'bad'); } } })),
          h('button.danger', { onclick: async () => { if (await confirmDialog('Naozaj vymazať celý pokrok? Toto sa nedá vrátiť.', 'Vymazať všetko')) { store.reset(); toast('Pokrok vymazaný'); render(); } } }, 'Vymazať pokrok'))),
      STATIC ? null : h('div.card', h('h2', { style: { marginTop: 0 } }, 'iPad / iný počítač'),
        h('p', { html: cfg.lan ? 'Server beží v režime <b>LAN</b>. Adresu s prístupovým kľúčom nájdeš v termináli, kde si server spustil.' : 'Na iPade v rovnakej Wi-Fi spusti server príkazom <code>node server.mjs --lan</code> a otvor adresu s kľúčom, ktorú vypíše terminál. Na iPade potom daj „Pridať na plochu“.' })));
  };
  render();
}
