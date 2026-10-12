// FIIT Tréner – navigácia a smerovanie
import { h, mount, toast } from './core/ui.js';
import * as store from './core/store.js';
import { exerciseView } from './core/exercise.js';
import { MODULES, moduleById, ppiIndex, examView } from './ppi/index.js';
import * as prpr from './prpr/index.js';
import { flashcardsView, notesView, quizView } from './views/study.js';
import { dashboard, mistakesView, statsView, settingsView } from './views/meta.js';
import { STATIC } from './core/env.js';

const NAV = [
  { title: '', items: [['#/', '🏠', 'Domov'], ['#/chyby', '📕', 'Denník chýb', () => store.get().mistakes.filter(m => !m.resolved).length || null]] },
  { title: 'PPI', items: [['#/ppi', '🔌', 'Prehľad PPI'], ...MODULES.map(m => ['#/ppi/' + m.id, m.icon, m.title]), ['#/skusky/ppi2', '⏱', 'Simulácia TEST 2 (dekóder)'], ['#/skusky/ppi2cv4', '⏱', 'Simulácia CV4 (automaty)'], ['#/skusky/ppi3', '⏱', 'Simulácia TEST 3']] },
  { title: 'PrPr', items: [['#/prpr', '💻', 'Úlohy v C'], ['#/prpr/nahodna/cykly', '🎯', 'Náhodná úloha z cyklov'], ['#/prpr/cvicenia/predict', '🔍', 'Čo vypíše program?'], ['#/prpr/test', '⏱', 'Simulácia testu'], ['#/prpr/pieskovisko', '🧪', 'Pieskovisko']] },
  { title: 'Učenie', items: [['#/karticky', '🃏', 'Kartičky'], ['#/poznamky/PPI', '📚', 'Poznámky'], ['#/kviz/PPI', '❓', 'Kvíz PPI'], ['#/kviz/PrPr', '❓', 'Kvíz PrPr']] },
  { title: '', items: [['#/statistiky', '📊', 'Štatistiky'], ['#/nastavenia', '⚙', 'Nastavenia']] },
];

// zdieľaná verzia nemá položky, ktoré potrebujú server
const SERVER_ONLY = ['#/prpr/test', '#/prpr/pieskovisko', '#/poznamky/PPI'];
function renderNav() {
  const cur = location.hash || '#/';
  const best = NAV.flatMap(g => g.items.map(i => i[0])).filter(href => cur === href || (href !== '#/' && cur.startsWith(href + '/')) || (href !== '#/' && cur === href)).sort((a, b) => b.length - a.length)[0] || '#/';
  mount(document.getElementById('nav'), NAV.map(g => h('div.nav-group', g.title ? h('div.nav-title', g.title) : null,
    g.items.filter(([href]) => !(STATIC && SERVER_ONLY.includes(href))).map(([href, ico, label, badge]) => {
      const b = badge?.();
      return h('a.nav-link', { href, class: href === best ? 'active' : '' }, h('span.ico', ico), h('span', label), b ? h('span.badge.bad', b) : null);
    }))));
}

function crumbs(parts) {
  mount(document.getElementById('crumbs'), parts.map((p, i) => [i ? ' / ' : '', i === parts.length - 1 ? h('b', p[0]) : h('a', { href: p[1] }, p[0])]));
}

async function route() {
  const view = document.getElementById('view');
  view.classList.remove('wide');
  document.getElementById('app').classList.remove('menu-open');
  const hash = location.hash.replace(/^#\/?/, '');
  const [section, ...rest] = hash.split('/').map(decodeURIComponent);
  renderNav();
  window.scrollTo(0, 0);
  try {
    switch (section) {
      case '': crumbs([['Domov']]); return await dashboard(view);
      case 'ppi': {
        if (!rest[0]) { crumbs([['PPI']]); return ppiIndex(view); }
        const m = moduleById(rest[0]);
        if (!m) break;
        crumbs([['PPI', '#/ppi'], [m.title]]);
        return exerciseView(view, m, rest.slice(1));
      }
      case 'skusky': crumbs([['Simulácia testu']]); return examView(view, rest[0]);
      case 'prpr':
        if (!rest[0]) { crumbs([['PrPr']]); return await prpr.overview(view); }
        if (rest[0] === 'uloha') { crumbs([['PrPr', '#/prpr'], ['Úloha']]); return await prpr.taskView(view, rest[1]); }
        if (rest[0] === 'nahodna') return await prpr.randomTask(rest[1] || 'cykly');
        if (rest[0] === 'pieskovisko') { crumbs([['PrPr', '#/prpr'], ['Pieskovisko']]); return prpr.playground(view); }
        if (rest[0] === 'cvicenia') { crumbs([['PrPr', '#/prpr'], ['Čítanie kódu']]); return await prpr.exercises(view, rest.slice(1)); }
        if (rest[0] === 'test') { crumbs([['PrPr', '#/prpr'], ['Simulácia testu']]); return await prpr.examView(view); }
        break;
      case 'karticky': crumbs([['Kartičky', '#/karticky'], ...(rest[0] ? [[rest[0]]] : [])]); return await flashcardsView(view, rest[0]);
      case 'poznamky': crumbs([['Poznámky'], [rest[0] || 'PPI']]); return await notesView(view, rest[0], rest[1]);
      case 'kviz': crumbs([['Kvíz'], [rest[0] || 'PPI']]); return quizView(view, rest[0]);
      case 'chyby': crumbs([['Denník chýb']]); return mistakesView(view);
      case 'statistiky': crumbs([['Štatistiky']]); return await statsView(view);
      case 'nastavenia': crumbs([['Nastavenia']]); return await settingsView(view);
    }
    mount(view, h('h1', 'Stránka neexistuje'), h('a', { href: '#/' }, 'Domov'));
  } catch (e) {
    console.error(e);
    mount(view, h('div.callout.bad', h('div.callout-title', 'Niečo sa pokazilo'), h('pre.code', String(e.stack || e))));
  }
}

async function init() {
  await store.load();
  store.applyTheme();
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const s = store.settings();
    const dark = s.theme === 'dark' || (s.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    s.theme = dark ? 'light' : 'dark';
    store.applyTheme(); store.save();
  });
  document.getElementById('menu-btn').addEventListener('click', () => document.getElementById('app').classList.toggle('menu-open'));
  document.getElementById('scrim').addEventListener('click', () => document.getElementById('app').classList.remove('menu-open'));
  store.onChange(() => renderNav());
  store.onRemoteLoad(() => { store.applyTheme(); route(); }); // pokrok z úložiska stránky prišiel neskôr
  window.addEventListener('hashchange', route);
  route();
}
init().catch(e => { console.error(e); toast('Chyba pri štarte: ' + e.message, 'bad'); });
