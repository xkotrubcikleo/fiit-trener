// Procedurálne programovanie: zoznam úloh, riešenie s testami, „čo vypíše“, pieskovisko, simulácia testu
import { h, mount, esc, toast, confirmDialog, codeBlock, visibleWS, renderMath, meter, pick, shuffle, sample, plural } from '../core/ui.js';
import * as store from '../core/store.js';
import { md } from '../core/markdown.js';
import { codeEditor } from './editor.js';
import { exerciseView } from '../core/exercise.js';
import { STATIC } from '../core/env.js';

let content = null;
export async function loadContent() {
  if (content) return content;
  const r = await fetch(STATIC ? 'data/prpr.json' : '/api/prpr/content');
  content = await r.json();
  return content;
}
const prpr = () => store.get().prpr;
const LEVEL = (l) => h('span.lvl', '★'.repeat(l) + '☆'.repeat(3 - l));

function taskStatus(id) {
  if (prpr().solved[id]) return { icon: '✓', cls: 'ok', label: 'vyriešené' };
  if (prpr().attempts[id]) return { icon: '◐', cls: 'warn', label: 'rozpracované' };
  return { icon: '○', cls: '', label: 'nové' };
}

// ---------- prehľad ----------
export async function overview(view) {
  const c = await loadContent();
  const solved = c.tasks.filter(t => prpr().solved[t.id]).length;
  const pred = store.statOf('prpr.predict');
  mount(view,
    h('div.ex-head', h('div', h('h1', '💻 Procedurálne programovanie'), h('div.ex-intro', STATIC ? 'Úlohy v C s testami. V tejto zdieľanej verzii si kód prelož u seba a výstup vlož na porovnanie. Vzorové riešenia používajú iba to, čo sa na PrPr preberá.' : 'Úlohy v C sa prekladajú skutočným kompilátorom (clang) a spúšťajú na testoch. Riešenia používajú iba to, čo sa na PrPr preberá.'))),
    h('div.grid.cols-4',
      h('a.tile', { href: '#/prpr/nahodna/cykly' }, h('div.tile-ico', '🎯'), h('h3', 'Náhodná úloha z cyklov'), h('p', `príprava na test T1 · ${c.tasks.filter(t => t.cat === 'cykly' && prpr().solved[t.id]).length}/${c.tasks.filter(t => t.cat === 'cykly').length} vyriešených`)),
      STATIC ? null : h('a.tile', { href: '#/prpr/test' }, h('div.tile-ico', '⏱'), h('h3', 'Simulácia testu'), h('p', '3 úlohy, 60 minút, ako test na PC (predvolene cykly)')),
      h('a.tile', { href: '#/prpr/cvicenia/predict' }, h('div.tile-ico', '🔍'), h('h3', 'Čo vypíše program?'), h('p', `${c.predict.length} otázok · ${pred.n ? Math.round(100 * pred.ok / pred.n) + ' % správne' : 'zatiaľ nič'}`)),
      STATIC ? null : h('a.tile', { href: '#/prpr/pieskovisko' }, h('div.tile-ico', '🧪'), h('h3', 'Pieskovisko'), h('p', 'Vlastný kód a vlastný vstup')),
      h('a.tile', { href: '#/kviz/PrPr' }, h('div.tile-ico', '❓'), h('h3', 'Teória (kvíz)'), h('p', 'Otázky z jazyka C'))),
    h('div.row', { style: { margin: '18px 0 8px' } }, h('h2', { style: { margin: 0 } }, 'Úlohy'), h('span.badge.accent', `${solved} / ${c.tasks.length} vyriešených`)),
    h('div.grid.cols-2', c.categories.map(cat => {
      const tasks = c.tasks.filter(t => t.cat === cat.id).sort((a, b) => a.level - b.level);
      const done = tasks.filter(t => prpr().solved[t.id]).length;
      return h('div.card',
        h('div.row', h('h3', { style: { margin: 0 } }, cat.title), h('span.spacer'), h('span.small.muted', `${done}/${tasks.length}`)),
        h('p.small.muted', { style: { margin: '2px 0 8px' } }, cat.note), meter(done / tasks.length, 'ok'),
        h('div.task-list', { style: { marginTop: '8px' } }, tasks.map(t => {
          const st = taskStatus(t.id);
          return h('a.task-row', { href: '#/prpr/uloha/' + t.id }, h('span.st', { class: st.cls, title: st.label, style: { color: st.cls ? `var(--${st.cls})` : 'var(--muted)' } }, st.icon), h('span', t.title), h('span.spacer'), LEVEL(t.level));
        })));
    })));
}

// ---------- výsledky testov ----------
function parseCompile(out) {
  const lines = out.split('\n');
  const err = new Set(), warn = new Set();
  lines.forEach(l => { const m = /^riadok (\d+):\d+: (error|warning)/.exec(l); if (m) (m[2] === 'error' ? err : warn).add(Number(m[1])); });
  return { err: [...err], warn: [...warn] };
}
function compileView(out, ed) {
  const pre = h('div.compile-out');
  out.split('\n').forEach(l => {
    const m = /^riadok (\d+):\d+: (error|warning|note)/.exec(l);
    const line = h('div', { class: m ? (m[2] === 'error' ? 'err-line' : m[2] === 'warning' ? 'warn-line' : '') : '' }, translateDiag(l));
    if (m) line.addEventListener('click', () => ed.gotoLine(Number(m[1])));
    pre.append(line);
  });
  return pre;
}
const DIAG = [
  [/use of undeclared identifier '(\w+)'/, "nedeklarovaný identifikátor '$1' (preklep alebo chýbajúca deklarácia?)"],
  [/expected ';' after expression/, "chýba ';' za výrazom"],
  [/expected ';'/, "chýba ';'"],
  [/expected '\)'/, "chýba ')'"],
  [/expected '\}'/, "chýba '}'"],
  [/expected expression/, 'očakával sa výraz'],
  [/implicit declaration of function '(\w+)'.*/, "funkcia '$1' nie je deklarovaná (chýba #include alebo prototyp?)"],
  [/format specifies type '([^']+)' but the argument has type '([^']+)'/, "formát očakáva typ '$1', ale argument je '$2'"],
  [/using the result of an assignment as a condition without parentheses/, 'v podmienke je priradenie (=), nemá tam byť porovnanie (==)?'],
  [/variable '(\w+)' is uninitialized when used here/, "premenná '$1' sa používa bez inicializácie"],
  [/unused variable '(\w+)'/, "nepoužitá premenná '$1'"],
  [/non-void function does not return a value.*/, 'funkcia nevracia hodnotu vo všetkých vetvách (chýba return)'],
  [/comparison of integers of different signs.*/, 'porovnanie čísel so znamienkom a bez znamienka'],
  [/for loop has empty body/, 'cyklus for má prázdne telo (bodkočiarka za for?)'],
  [/if statement has empty body/, 'if má prázdne telo (bodkočiarka za if?)'],
  [/incompatible pointer to integer conversion/, 'miešaš ukazovateľ a číslo'],
  [/incompatible integer to pointer conversion/, 'na mieste ukazovateľa je číslo (chýba &?)'],
  [/too few arguments to function call/, 'funkcii chýbajú argumenty'],
  [/too many arguments to function call/, 'funkcia dostala priveľa argumentov'],
  [/redefinition of '(\w+)'/, "'$1' je definované dvakrát"],
  [/array index (\d+) is past the end of the array.*/, 'index $1 je za koncom poľa'],
];
function translateDiag(l) {
  for (const [re, sk] of DIAG) if (re.test(l)) return l.replace(/(error|warning): .*/, (m, kind) => `${kind === 'error' ? 'chyba' : 'varovanie'}: ${l.match(re)[0].replace(re, sk)}`);
  return l.replace(/: error:/, ': chyba:').replace(/: warning:/, ': varovanie:');
}

function diffView(expected, got) {
  const e = (expected ?? '').split('\n'), g = (got ?? '').split('\n');
  const n = Math.max(e.length, g.length);
  const ep = h('pre'), gp = h('pre');
  for (let i = 0; i < n; i++) {
    const bad = e[i] !== g[i];
    if (i < e.length) ep.append(h('span.dl', { class: bad ? 'bad' : '', html: (visibleWS(e[i]) + (i < e.length - 1 ? '<span class="ws">↵</span>' : '')) || '&nbsp;' }));
    if (i < g.length) gp.append(h('span.dl', { class: bad ? 'bad' : '', html: (visibleWS(g[i]) + (i < g.length - 1 ? '<span class="ws">↵</span>' : '')) || '&nbsp;' }));
  }
  return h('div.diff', h('div', h('div.lbl', 'Očakávaný výstup'), ep), h('div', h('div.lbl', 'Tvoj výstup'), gp));
}
const fileText = (v) => typeof v === 'string' ? v : '(binárny súbor)';

export function resultsView(res, ed) {
  if (res.error) return h('div.callout.bad', res.error);
  if (!res.compiled) {
    const m = parseCompile(res.compileOutput);
    ed?.markLines(m.err, m.warn);
    return h('div', h('div.callout.bad', h('div.callout-title', 'Program sa nepodarilo preložiť'), 'Klikni na riadok s chybou a editor naň skočí.'), compileView(res.compileOutput, ed));
  }
  const m = parseCompile(res.warnings || '');
  ed?.markLines([], m.warn);
  const pass = res.results.filter(r => r.status === 'pass').length;
  const ws = res.results.filter(r => r.status === 'whitespace').length;
  const all = res.results.length;
  const head = pass === all
    ? h('div.callout.ok', h('div.callout-title', `Všetky testy prešli (${all}/${all}) 🎉`))
    : h('div.callout', { class: pass + ws === all ? 'warn' : 'bad' }, h('div.callout-title', `Prešlo ${pass} z ${all} ${all === 1 ? 'testu' : 'testov'}`), ws ? h('div', `${ws} ${plural(ws, 'test sa líši', 'testy sa líšia', 'testov sa líši')} iba medzerami alebo koncom riadku – skontroluj \\n a medzery.`) : null);
  return h('div.stack', head,
    res.warnings?.trim() ? h('details', h('summary.small', `Varovania kompilátora (${m.warn.length || '…'})`), compileView(res.warnings, ed)) : null,
    h('div.test-list', res.results.map((r, i) => {
      const icon = { pass: '✓', whitespace: '≈', fail: '✗', error: '⚠' }[r.status];
      const label = { pass: 'OK', whitespace: 'líši sa iba bielymi znakmi', fail: 'zlý výstup', error: 'chyba počas behu' }[r.status];
      return h('details.test-item', { class: r.status, open: r.status !== 'pass' && i === res.results.findIndex(x => x.status !== 'pass') },
        h('summary', h('b', icon), h('span', r.name), h('span.spacer'), h('span.small.muted', label)),
        h('div.test-body.stack',
          r.runtime ? h('div.callout.bad', r.runtime) : null,
          h('div.row.top', { style: { gap: '16px' } },
            h('div', h('div.small.muted', 'Vstup (stdin)'), h('pre.code', { style: { minWidth: '160px' }, html: r.stdin ? visibleWS(r.stdin) : '<span class="muted">(prázdny)</span>' })),
            Object.keys(r.filesIn || {}).length ? h('div', Object.entries(r.filesIn).map(([n, c]) => h('div', h('div.small.muted', 'Súbor ' + n), h('pre.code', { html: visibleWS(fileText(c)) })))) : null),
          r.expected !== undefined ? diffView(r.expected, r.got) : h('pre.code', r.got),
          r.files ? Object.entries(r.files).map(([n, f]) => h('div', h('div.small', h('b', 'Súbor ' + n), ' – ', f.status === 'missing' ? 'program ho nevytvoril' : f.status === 'pass' ? 'OK' : 'obsah sa líši'), f.status !== 'pass' && f.status !== 'missing' ? diffView(f.expected, f.got) : null)) : null,
          r.stderr && r.status === 'error' ? h('details', h('summary.small.muted', 'Technický výpis (sanitizér)'), h('pre.code', { style: { fontSize: '12px', maxHeight: '220px', overflow: 'auto' } }, r.stderr.replace(/main\.c:/g, 'riadok '))) : null));
    })));
}

async function runCode(id, code, only) {
  const r = await fetch('/api/prpr/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, code, sanitize: store.settings().sanitize, only }) });
  return r.json();
}

// ---------- úloha ----------
export async function taskView(view, id) {
  const c = await loadContent();
  const t = c.tasks.find(x => x.id === id);
  if (!t) { mount(view, h('p', 'Úloha neexistuje.')); return; }
  view.classList.add('wide');
  const cat = c.categories.find(x => x.id === t.cat);
  const list = c.tasks.filter(x => x.cat === t.cat);
  const idx = list.indexOf(t);
  const st = prpr();
  let solutionSeen = !!st.solutionSeen?.[id];
  let saveT = null;
  const ed = codeEditor({
    value: st.drafts[id] ?? t.starter,
    onChange: (v) => { clearTimeout(saveT); saveT = setTimeout(() => { prpr().drafts[id] = v; store.save(); }, 600); },
    onRun: () => runAll(),
    onSave: () => { prpr().drafts[id] = ed.value; store.save(); toast('Uložené'); },
  });
  const results = h('div');
  const runBtn = h('button.primary', { onclick: () => runAll() }, '▶ Spustiť testy');
  const hintBox = h('div');
  const status = h('span.badge', { class: taskStatus(id).cls }, taskStatus(id).label);

  async function runAll() {
    prpr().drafts[id] = ed.value;
    runBtn.disabled = true; runBtn.textContent = '⏳ Prekladám…';
    mount(results, h('p.muted', 'Prekladám a spúšťam testy…'));
    try {
      const res = await runCode(id, ed.value);
      mount(results, resultsView(res, ed));
      prpr().attempts[id] = (prpr().attempts[id] || 0) + 1;
      const allPass = res.compiled && res.results.every(r => r.status === 'pass');
      if (allPass && !prpr().solved[id]) {
        prpr().solved[id] = new Date().toISOString();
        store.record('prpr.' + t.cat, !solutionSeen, solutionSeen ? null : null);
        toast('Úloha vyriešená!', 'ok');
        status.className = 'badge ok'; status.textContent = 'vyriešené';
      } else store.save();
    } catch (e) {
      mount(results, h('div.callout.bad', 'Server neodpovedá: ' + e.message));
    } finally { runBtn.disabled = false; runBtn.textContent = '▶ Spustiť testy'; }
  }
  async function showSolution() {
    if (!solutionSeen && !(await confirmDialog('Naozaj chceš vidieť vzorové riešenie? Skús najprv nápovedu – riešenie, ktoré si sám vymyslíš, si zapamätáš oveľa lepšie.', 'Ukázať'))) return;
    const r = t.reference ? { reference: t.reference } : await (await fetch('/api/prpr/solution?id=' + encodeURIComponent(id))).json();
    if (!solutionSeen) {
      solutionSeen = true; (prpr().solutionSeen ||= {})[id] = true;
      if (!prpr().solved[id]) store.record('prpr.' + t.cat, false, { title: 'PrPr – ' + t.title, prompt: t.title, given: '(pozrel som vzorové riešenie)', correct: '', route: '#/prpr/uloha/' + id });
    }
    mount(hintBox, h('div.card.flat', { style: { background: 'var(--panel-2)', marginTop: '10px' } }, h('div.row', h('b', 'Vzorové riešenie'), h('span.spacer'),
      h('button.small', { onclick: async () => { if (await confirmDialog('Prepísať tvoj kód vzorovým riešením?', 'Prepísať')) { ed.value = r.reference; prpr().drafts[id] = r.reference; store.save(); } } }, 'Vložiť do editora')), codeBlock(r.reference)));
  }

  mount(view,
    h('div.row', { style: { marginBottom: '10px' } },
      h('a.btn.small', { href: '#/prpr' }, '← Úlohy'), h('span.muted.small', cat?.title), h('span.spacer'),
      idx > 0 ? h('a.btn.small', { href: '#/prpr/uloha/' + list[idx - 1].id }, '‹ Predchádzajúca') : null,
      idx < list.length - 1 ? h('a.btn.small', { href: '#/prpr/uloha/' + list[idx + 1].id }, 'Ďalšia ›') : null),
    h('div.prpr-layout',
      h('div.card',
        h('div.row', h('h2', { style: { margin: 0 } }, t.title), LEVEL(t.level), status),
        h('div.statement.md', { style: { marginTop: '10px' }, html: md(t.statement) }),
        h('h3', 'Testy'),
        h('div.stack', t.tests.map((x, i) => h('details', { open: i === 0 }, h('summary.small', x.name),
          h('div.row.top', { style: { gap: '12px' } },
            h('div', h('div.small.muted', 'vstup'), h('pre.code', { html: x.stdin ? visibleWS(x.stdin) : '<span class="muted">(prázdny)</span>' })),
            x.filesIn && Object.keys(x.filesIn).length ? h('div', Object.entries(x.filesIn).map(([n, v]) => h('div', h('div.small.muted', n), h('pre.code', { html: visibleWS(fileText(v)) })))) : null,
            h('div', h('div.small.muted', 'očakávaný výstup'), h('pre.code', { html: visibleWS(x.expectOut) })),
            x.expectFiles ? Object.entries(x.expectFiles).map(([n, v]) => h('div', h('div.small.muted', 'súbor ' + n), h('pre.code', { html: visibleWS(v) }))) : null)))),
        h('div.toolbar', t.hint ? h('button.small', { onclick: () => mount(hintBox, h('div.callout', { style: { marginTop: '10px' } }, h('div.callout-title', '💡 Nápoveda'), h('div', { html: md(t.hint) }))) }, '💡 Nápoveda') : null,
          h('button.small', { onclick: showSolution }, 'Vzorové riešenie')),
        hintBox),
      STATIC ? h('div', ed.el, h('div.toolbar',
          h('button.primary', { onclick: async () => { try { await navigator.clipboard.writeText(ed.value); toast('Kód je v schránke', 'ok'); } catch { toast('Kopírovanie nie je dovolené – označ kód v editore a skopíruj ho ručne.', 'bad'); } } }, 'Kopírovať kód'),
          h('button', { onclick: async () => { if (await confirmDialog('Vrátiť kód na pôvodnú kostru? Tvoje zmeny sa stratia.', 'Obnoviť')) { ed.value = t.starter; prpr().drafts[id] = t.starter; store.save(); } } }, 'Obnoviť kostru')),
        selfCheck(t, () => {
          prpr().attempts[id] = (prpr().attempts[id] || 0) + 1;
          if (!prpr().solved[id]) {
            prpr().solved[id] = new Date().toISOString();
            store.record('prpr.' + t.cat, !solutionSeen, null);
            toast('Úloha vyriešená!', 'ok');
            status.className = 'badge ok'; status.textContent = 'vyriešené';
          } else store.save();
        }, () => { prpr().attempts[id] = (prpr().attempts[id] || 0) + 1; store.save(); })) :
      h('div',
        ed.el,
        h('div.toolbar', runBtn,
          h('button', { onclick: async () => { if (await confirmDialog('Vrátiť kód na pôvodnú kostru? Tvoje zmeny sa stratia.', 'Obnoviť')) { ed.value = t.starter; prpr().drafts[id] = t.starter; store.save(); } } }, 'Obnoviť kostru'),
          h('label.check.small', h('input', { type: 'checkbox', checked: store.settings().sanitize, onchange: (e) => { store.settings().sanitize = e.target.checked; store.save(); } }), 'kontrola pamäte (sanitizér)'),
          h('span.spacer'), h('span.kbd-hint', h('kbd', '⌘'), h('kbd', '↵'), ' spustiť · ', h('kbd', 'Tab'), ' odsadiť · ', h('kbd', '⌘'), h('kbd', '/'), ' komentár')),
        results)));
  ed.focus();
}

// ---------- zdieľaná verzia: kontrola výstupu, ktorý si študent spustil u seba ----------
function compareText(got, exp) {
  const norm = (x) => x.replace(/\r\n/g, '\n');
  if (norm(got) === norm(exp)) return 'pass';
  // medzery na konci riadkov a posledný \n sa pri kopírovaní z terminálu strácajú, preto ich tu neriešime
  const trim = (x) => norm(x).split('\n').map(l => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n+$/, '');
  return trim(got) === trim(exp) ? 'pass' : 'fail';
}
function selfCheck(t, onAllPass, onAttempt) {
  const items = t.tests.map((x, i) => {
    const outTa = h('textarea.mono', { rows: Math.min(10, Math.max(2, x.expectOut.split('\n').length)), placeholder: 'sem vlož, čo vypísal tvoj program', style: { width: '100%' } });
    const fileTas = Object.keys(x.expectFiles || {}).map(n => ({ n, ta: h('textarea.mono', { rows: 4, placeholder: `obsah súboru ${n}, ktorý vytvoril tvoj program`, style: { width: '100%' } }) }));
    const res = h('div');
    const icon = h('b', '○');
    const el = h('details.test-item', { open: i === 0 },
      h('summary', icon, h('span', x.name), h('span.spacer'), h('span.small.muted', 'vlož výstup')),
      h('div.test-body.stack',
        h('div.row.top', { style: { gap: '12px' } },
          h('div', h('div.small.muted', 'vstup – zadaj ho programu'), h('pre.code', { html: x.stdin ? visibleWS(x.stdin) : '<span class="muted">(prázdny)</span>' })),
          x.filesIn && Object.keys(x.filesIn).length ? h('div', Object.entries(x.filesIn).map(([n, v]) => h('div', h('div.small.muted', 'vytvor súbor ' + n), h('pre.code', { html: visibleWS(fileText(v)) })))) : null),
        h('div', h('div.small.muted', 'výstup tvojho programu'), outTa),
        fileTas.map(f => h('div', h('div.small.muted', 'súbor ' + f.n), f.ta)),
        res));
    const check = () => {
      if (!outTa.value && x.expectOut) return null;
      let st = compareText(outTa.value, x.expectOut);
      const parts = [st === 'pass' ? null : diffView(x.expectOut, outTa.value)];
      for (const f of fileTas) {
        const fs = compareText(f.ta.value, x.expectFiles[f.n]);
        if (fs !== 'pass') { st = 'fail'; parts.push(h('div.small', h('b', 'Súbor ' + f.n)), diffView(x.expectFiles[f.n], f.ta.value)); }
      }
      el.className = 'test-item ' + st;
      icon.textContent = st === 'pass' ? '✓' : '✗';
      mount(res, parts);
      return st;
    };
    return { el, check };
  });
  const summary = h('div');
  const btn = h('button.primary', { onclick: () => {
    const sts = items.map(it => it.check());
    const filled = sts.filter(x => x !== null);
    if (!filled.length) { mount(summary, h('div.callout.warn', 'Najprv vlož výstup aspoň pre jeden test.')); return; }
    const pass = filled.filter(x => x === 'pass').length;
    onAttempt?.();
    if (pass === items.length) { mount(summary, h('div.callout.ok', h('div.callout-title', `Všetky testy sedia (${pass}/${items.length}) 🎉`))); onAllPass(); }
    else mount(summary, h('div.callout', { class: pass === filled.length ? 'warn' : 'bad' }, h('div.callout-title', `Sedí ${pass} z ${items.length} testov`), filled.length < items.length ? h('div', 'Niektoré testy ešte nemajú vložený výstup.') : null));
  } }, 'Porovnať výstupy');
  return h('div.stack', { style: { marginTop: '12px' } },
    h('div.callout', h('div.callout-title', 'Ako overiť riešenie v zdieľanej verzii'),
      h('div', { html: 'Táto verzia beží iba v prehliadači, C kód neprekladá. Skopíruj kód, prelož ho u seba (napr. <code>gcc main.c -o main</code>), spusti ho s vstupom z testu a jeho výstup vlož sem. Medzery na konci riadkov a posledný prázdny riadok sa pri porovnaní ignorujú.' })),
    h('div.test-list', items.map(it => it.el)), h('div.row', btn), summary);
}

// ---------- pieskovisko ----------
export function playground(view) {
  if (STATIC) { mount(view, h('h1', '🧪 Pieskovisko'), h('div.card', h('p', 'Pieskovisko spúšťa C kód, a to vie iba lokálna verzia FIIT Trénera na počítači so serverom.'))); return; }
  view.classList.add('wide');
  const st = prpr();
  const ed = codeEditor({ value: st.playground || '#include <stdio.h>\n\nint main(void) {\n    printf("Ahoj, svet!\\n");\n    return 0;\n}\n', onChange: (v) => { st.playground = v; store.save(); }, onRun: () => run() });
  const stdin = h('textarea.mono', { rows: 6, style: { width: '100%' }, placeholder: 'Vstup pre program (stdin)', value: st.playgroundIn || '' });
  stdin.addEventListener('input', () => { st.playgroundIn = stdin.value; store.save(); });
  const out = h('div');
  async function run() {
    mount(out, h('p.muted', 'Prekladám…'));
    const r = await (await fetch('/api/prpr/playground', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: ed.value, stdin: stdin.value, sanitize: store.settings().sanitize }) })).json();
    if (!r.compiled) { mount(out, resultsView(r, ed)); return; }
    const x = r.results[0];
    const m = parseCompile(r.warnings || ''); ed.markLines([], m.warn);
    mount(out, h('div.stack', r.warnings?.trim() ? h('details', h('summary.small', 'Varovania'), compileView(r.warnings, ed)) : null,
      x.runtime ? h('div.callout.bad', x.runtime) : null, h('div.small.muted', 'Výstup'), h('pre.code', { html: x.got ? visibleWS(x.got) : '<span class="muted">(nič)</span>' })));
  }
  mount(view, h('h1', '🧪 Pieskovisko'), h('p.muted', 'Skús si čokoľvek. Kód aj vstup sa ukladajú.'),
    h('div.prpr-layout', h('div', ed.el, h('div.toolbar', h('button.primary', { onclick: run }, '▶ Spustiť'), h('span.kbd-hint', h('kbd', '⌘'), h('kbd', '↵')))), h('div', h('div.small.muted', 'Vstup'), stdin, out)));
}

// ---------- „čo vypíše“ (cez rámec cvičení) ----------
export async function exercises(view, params) {
  const c = await loadContent();
  const mod = {
    id: 'prpr', route: 'prpr/cvicenia', title: 'Čítanie kódu', icon: '🔍',
    intro: 'Bez spúšťania urči, čo program vypíše. Presne – vrátane medzier a nových riadkov (↵ na konci riadku nemusíš písať, posledný sa ignoruje).',
    modes: [
      { id: 'predict', label: 'Čo vypíše program?', gen: () => genPredict(c.predict) },
      { id: 'predict-cykly', label: 'Iba cykly', gen: () => genPredict(c.predict.filter(q => q.topic === 'cykly')) },
    ],
  };
  exerciseView(view, mod, params);
}
function genPredict(list) {
  const done = prpr().predict;
  const weights = list.map(q => done[q.id]?.ok ? 1 : done[q.id] ? 4 : 3);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0), q = list[0];
  for (let i = 0; i < list.length; i++) { r -= weights[i]; if (r <= 0) { q = list[i]; break; } }
  const ta = h('textarea.mono', { rows: Math.max(2, q.output.split('\n').length), style: { width: '100%', maxWidth: '520px' }, placeholder: 'presný výstup programu' });
  const norm = (s) => s.replace(/\r/g, '').replace(/\n+$/, '');
  return {
    el: h('div', h('p', 'Čo vypíše tento program?' + (q.stdin ? ' Na vstupe je:' : '')), q.stdin ? h('pre.code', q.stdin) : null, codeBlock(q.program), h('span.badge', q.topic), h('div', { style: { marginTop: '10px' } }, ta)),
    focus: () => ta.focus(),
    check() {
      if (!ta.value) return { incomplete: true, feedback: 'Napíš výstup.' };
      const exact = norm(ta.value) === norm(q.output);
      const loose = norm(ta.value).split('\n').map(l => l.trimEnd()).join('\n') === norm(q.output).split('\n').map(l => l.trimEnd()).join('\n');
      const ok = exact || loose;
      prpr().predict[q.id] = { ok, at: new Date().toISOString() };
      return { ok, feedback: h('div', ok ? null : diffView(q.output, ta.value), h('p', { style: { marginTop: '8px' } }, q.explain)), correct: q.output };
    },
    solution() { return h('div', h('pre.code', { html: visibleWS(q.output) }), h('p', q.explain)); },
    summary: { prompt: 'čo vypíše: ' + q.id, correct: q.output },
    given: () => ta.value,
  };
}

// ---------- simulácia testu ----------
export async function examView(view) {
  if (STATIC) { mount(view, h('h1', '⏱ Simulácia testu z PrPr'), h('div.card', h('p', 'Simulácia testu potrebuje prekladať a spúšťať C kód, preto funguje iba v lokálnej verzii. Tu si môžeš precvičiť úlohy a overiť ich vložením výstupu.'), h('a.btn.primary', { href: '#/prpr/nahodna/cykly' }, 'Náhodná úloha z cyklov'))); return; }
  const c = await loadContent();
  const pool = (cats, lvl) => c.tasks.filter(t => cats.includes(t.cat) && t.level === lvl);
  let tasks = null, timerId = null, endAt = null, codes = {}, current = 0, submitted = false;
  const startScreen = () => mount(view,
    h('h1', '⏱ Simulácia testu z PrPr'),
    h('div.card', h('p', 'Dostaneš 3 úlohy a na riešenie máš 60 minút. Pri téme „cykly“ ide o 1 ľahšiu, 1 strednú a 1 ťažšiu úlohu iba z cyklov (vzory z hviezdičiek, čítanie vstupu, priebežné výpočty). Pri „základoch“ o 1 ľahšiu a 2 stredné úlohy zo vstupu a výstupu, podmienok, cyklov, funkcií a polí.'),
      h('ul', h('li', 'Počas testu môžeš spúšťať iba prvý (ukážkový) test každej úlohy, ako keď si program skúšaš na vlastnom vstupe.'),
        h('li', 'Nápovedy ani vzorové riešenia nie sú k dispozícii.'), h('li', 'Po odovzdaní sa spustia všetky testy a dostaneš body (2 body za úlohu podľa podielu úspešných testov).')),
      h('div.row', h('button.primary', { onclick: start }, 'Začať test'),
        h('select', { id: 'exam-topic' }, h('option', { value: 'cykly', selected: true }, 'téma: cykly'), h('option', { value: 'zaklady' }, 'téma: základy celkovo')),
        h('select', { id: 'exam-len' }, [30, 45, 60, 90].map(m => h('option', { value: m, selected: m === 60 }, m + ' minút'))))),
    pastExams('prpr-test'));
  function start() {
    const mins = Number(document.getElementById('exam-len').value);
    if (document.getElementById('exam-topic').value === 'cykly') {
      tasks = [pick(pool(['cykly'], 1)), pick(pool(['cykly'], 2)), pick(pool(['cykly'], 3))];
    } else {
      const base = ['zaklady', 'podmienky', 'cykly', 'funkcie', 'polia'];
      tasks = [pick(pool(base, 1)), ...sample(pool(base, 2), 2)];
    }
    codes = Object.fromEntries(tasks.map(t => [t.id, t.starter]));
    endAt = Date.now() + mins * 60000;
    current = 0; submitted = false;
    timerId = setInterval(tick, 1000);
    render();
  }
  const timer = h('span.timer');
  function tick() {
    if (!document.body.contains(timer)) { clearInterval(timerId); return; }
    const left = Math.max(0, endAt - Date.now());
    timer.textContent = `${String(Math.floor(left / 60000)).padStart(2, '0')}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
    timer.classList.toggle('low', left < 5 * 60000);
    if (left <= 0 && !submitted) submit();
  }
  let ed = null;
  function render() {
    view.classList.add('wide');
    const t = tasks[current];
    const out = h('div');
    ed = codeEditor({ value: codes[t.id], onChange: (v) => { codes[t.id] = v; }, onRun: () => trySample() });
    async function trySample() {
      mount(out, h('p.muted', 'Spúšťam ukážkový test…'));
      mount(out, resultsView(await runCode(t.id, ed.value, [0]), ed));
    }
    mount(view,
      h('div.row', { style: { marginBottom: '10px' } }, h('h2', { style: { margin: 0 } }, 'Test z PrPr'), h('div.exam-nav', tasks.map((x, i) => h('button.small', { class: i === current ? 'active' : '', onclick: () => { codes[t.id] = ed.value; current = i; render(); } }, `Úloha ${i + 1}`))),
        h('span.spacer'), timer, h('button.primary', { onclick: async () => { if (await confirmDialog('Odovzdať test? Potom sa už nedá nič meniť.', 'Odovzdať')) submit(); } }, 'Odovzdať')),
      h('div.prpr-layout',
        h('div.card', h('h2', { style: { marginTop: 0 } }, `${current + 1}. ${t.title}`), h('div.statement.md', { html: md(t.statement) }),
          h('h3', 'Ukážkový test'), h('div.row.top', h('div', h('div.small.muted', 'vstup'), h('pre.code', { html: t.tests[0].stdin ? visibleWS(t.tests[0].stdin) : '(prázdny)' })),
            t.tests[0].filesIn ? Object.entries(t.tests[0].filesIn).map(([n, v]) => h('div', h('div.small.muted', n), h('pre.code', fileText(v)))) : null,
            h('div', h('div.small.muted', 'výstup'), h('pre.code', { html: visibleWS(t.tests[0].expectOut) })))),
        h('div', ed.el, h('div.toolbar', h('button', { onclick: trySample }, '▶ Skúsiť ukážkový test'), h('span.kbd-hint', h('kbd', '⌘'), h('kbd', '↵'))), out)));
    tick();
  }
  async function submit() {
    submitted = true; clearInterval(timerId);
    if (ed) codes[tasks[current].id] = ed.value;
    mount(view, h('h1', 'Vyhodnocujem…'), h('p.muted', 'Spúšťam všetky testy.'));
    const res = [];
    for (const t of tasks) res.push(await runCode(t.id, codes[t.id]));
    let score = 0;
    const parts = tasks.map((t, i) => {
      const r = res[i];
      const pass = r.compiled ? r.results.filter(x => x.status === 'pass').length : 0;
      const tot = t.tests.length;
      const pts = Math.round(2 * pass / tot * 10) / 10;
      score += pts;
      return { t, r, pass, tot, pts };
    });
    const secs = Math.round((Date.now() - (endAt - 0)) / 1000);
    store.get().exams.unshift({ kind: 'prpr-test', title: 'PrPr test (simulácia)', at: new Date().toISOString(), score: Math.round(score * 10) / 10, max: 6, tasks: tasks.map(t => t.id) });
    tasks.forEach((t, i) => { if (parts[i].pass === parts[i].tot && !prpr().solved[t.id]) prpr().solved[t.id] = new Date().toISOString(); prpr().drafts[t.id] = codes[t.id]; });
    store.save();
    view.classList.add('wide');
    mount(view, h('h1', `Výsledok: ${Math.round(score * 10) / 10} / 6 bodov`),
      h('p.muted', score >= 4.5 ? 'Výborne!' : score >= 3 ? 'Dobré, ale je čo zlepšovať – pozri si neúspešné testy.' : 'Toto chce ešte tréning. Prejdi si úlohy z kategórií nižšie.'),
      h('div.stack', parts.map((p, i) => h('div.card', h('div.row', h('h3', { style: { margin: 0 } }, `${i + 1}. ${p.t.title}`), h('span.spacer'), h('span.badge', { class: p.pass === p.tot ? 'ok' : p.pass ? 'warn' : 'bad' }, `${p.pass}/${p.tot} testov · ${p.pts} b`), h('a.btn.small', { href: '#/prpr/uloha/' + p.t.id }, 'Otvoriť úlohu')),
        h('details', h('summary.small', 'Detaily testov'), resultsView(p.r))))),
      h('div.toolbar', h('button.primary', { onclick: () => startScreen() }, 'Nový test')));
  }
  startScreen();
}

export function pastExams(kind) {
  const list = store.get().exams.filter(e => e.kind === kind).slice(0, 8);
  if (!list.length) return null;
  return h('div.card', h('h3', 'Predchádzajúce pokusy'), h('table.t', h('tr', h('th.l', 'dátum'), h('th', 'body')),
    list.map(e => h('tr', h('td.l', new Date(e.at).toLocaleString('sk-SK')), h('td', `${e.score} / ${e.max}`)))));
}

// náhodná nevyriešená úloha z kategórie (ak sú všetky vyriešené, ľubovoľná)
export async function randomTask(cat) {
  const c = await loadContent();
  const all = c.tasks.filter(t => t.cat === cat);
  const open = all.filter(t => !prpr().solved[t.id]);
  const t = pick(open.length ? open : all);
  location.replace('#/prpr/uloha/' + t.id);
}
