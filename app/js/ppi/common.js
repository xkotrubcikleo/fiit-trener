// Spoločné prvky PPI cvičení: premenné, K-mapa, pravdivostná tabuľka, pole na výraz, popis funkcie.
import { h, mount, esc, rnd, shuffle } from '../core/ui.js';
import * as B from '../lib/boolean.js';
import * as store from '../core/store.js';

export const COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)', 'var(--c8)'];

export function varNames(n, style = store.settings().varNames) {
  if (style === 'x1x2') return Array.from({ length: n }, (_, i) => 'X' + (i + 1));
  return 'ABCDEFGH'.slice(0, n).split('');
}
// zobrazenie názvu premennej (X1 → x₁)
export function varHTML(v) {
  const m = /^([A-Z])(\d+)$/.exec(v);
  return m ? `${m[1].toLowerCase()}<sub>${m[2]}</sub>` : v;
}
export function litToHTML(l) {
  return l.startsWith('!') ? `<span class="ov">${varHTML(l.slice(1))}</span>` : varHTML(l);
}
export function termsHTML(terms, kind = 'dnf') {
  if (kind === 'dnf') {
    if (!terms.length) return '0';
    return terms.map(t => t.length ? t.map(litToHTML).join('') : '1').join(' + ');
  }
  if (!terms.length) return '1';
  if (terms.some(t => t.length === 0)) return '0';
  return terms.map(t => t.length === 1 ? litToHTML(t[0]) : '(' + t.map(litToHTML).join(' + ') + ')').join('');
}
export function impsHTML(imps, vars, kind = 'dnf') {
  return termsHTML(imps.map(p => B.impToTerm(p, vars, kind)), kind);
}
export function astHTML(ast) {
  return B.astToHTML(ast).replace(/\b([A-Z])(\d+)\b/g, (m, a, d) => `${a.toLowerCase()}<sub>${d}</sub>`);
}
export const fx = (html) => `<span class="formula">${html}</span>`;
export function fnHead(name, vars) { return `${name}(${vars.map(varHTML).join(', ')})`; }

export const litWord = (n) => `${n} ${n === 1 ? 'literál' : n >= 2 && n <= 4 ? 'literály' : 'literálov'}`;
export const termWord = (n, kind) => `${n} ${kind === 'dnf' ? (n === 1 ? 'súčin' : n >= 2 && n <= 4 ? 'súčiny' : 'súčinov') : (n === 1 ? 'súčet' : n >= 2 && n <= 4 ? 'súčty' : 'súčtov')}`;

export function bitsOf(i, n) { return i.toString(2).padStart(n, '0'); }
export function describeIndex(vars, i) {
  const b = bitsOf(i, vars.length);
  return vars.map((v, k) => `${varHTML(v)} = ${b[k]}`).join(', ') + ` <span class="muted">(DE ${i})</span>`;
}

// D(...) / K(...) zápis z kurzu
export function dNotation(ones, dcs = [], kind = 'D') {
  const main = [...ones].sort((a, b) => a - b).join(', ');
  const d = [...dcs].sort((a, b) => a - b);
  return `${kind}(${main}${d.length ? '; {' + d.join(', ') + '}' : ''})`;
}
export function zerosOf(n, ones, dcs = []) {
  const s = new Set([...ones, ...dcs]);
  return Array.from({ length: 1 << n }, (_, i) => i).filter(i => !s.has(i));
}

// náhodná funkcia; zaručí, že nie je konštantná
export function randomFn(n, { density = 0.45, dc = 0 } = {}) {
  for (let tries = 0; tries < 100; tries++) {
    const ones = [], dcs = [];
    for (let i = 0; i < (1 << n); i++) {
      const r = Math.random();
      if (r < dc) dcs.push(i); else if (r < dc + density * (1 - dc)) ones.push(i);
    }
    if (ones.length >= 2 && ones.length + dcs.length < (1 << n) - 1) return { ones, dcs };
  }
  return { ones: [0, 3], dcs: [] };
}
// „pekná“ funkcia s minimálnou formou daného rozsahu členov
export function niceFn(n, { minTerms = 2, maxTerms = 4, dc = 0, kind = 'dnf' } = {}) {
  for (let i = 0; i < 200; i++) {
    const f = randomFn(n, { density: 0.3 + Math.random() * 0.35, dc });
    const r = kind === 'dnf' ? B.minimize(n, f.ones, f.dcs) : B.minimizeKNF(n, f.ones, f.dcs);
    if (r.terms >= minTerms && r.terms <= maxTerms) return f;
  }
  return randomFn(n, { dc });
}

// ---------- K-mapa ----------
const GRAY2 = { zosit: [0, 1, 3, 2], prednaska: [0, 2, 3, 1] };
const GRAY3 = [0, 1, 3, 2, 6, 7, 5, 4];
export function kmapLayout(n, order = store.settings().kmapOrder) {
  const rb = n <= 3 ? 1 : 2, cb = n - rb;
  const rows = rb === 1 ? [0, 1] : [0, 1, 3, 2];
  const cols = cb === 1 ? [0, 1] : cb === 2 ? GRAY2[order] || GRAY2.zosit : GRAY3;
  return { rb, cb, rows, cols, idx: (r, c) => (r << cb) | c };
}

// values: pole '0'|'1'|'X' dĺžky 2^n
// opts.interactive: 'cycle' (klik mení 0→1→X), 'select' (výber políčok), false
export function kmap(n, vars, values, opts = {}) {
  const order = opts.order || store.settings().kmapOrder;
  const L = kmapLayout(n, order);
  const bars = order === 'prednaska' && n >= 3 && n <= 4;
  const rowVars = vars.slice(0, L.rb), colVars = vars.slice(L.rb);
  const table = h('table.kmap', { class: (opts.interactive ? 'interactive ' : '') + (n === 5 ? 'kmap-5' : '') });
  const cells = new Map();
  let selection = new Set();
  const marks = new Map(); // idx → [farby]
  const thead = h('thead');
  if (bars) {
    // pruhy pre stĺpcové premenné
    colVars.forEach((v, k) => {
      const tr = h('tr', h('th'), ...rowVars.map(() => h('th')));
      L.cols.forEach(c => {
        const on = (c >> (L.cb - 1 - k)) & 1;
        tr.append(h('th', { class: on ? 'bar-line' : '' }));
      });
      // popisok nad prvým stĺpcom, kde je premenná 1
      const first = L.cols.findIndex(c => (c >> (L.cb - 1 - k)) & 1);
      tr.children[1 + rowVars.length + first].innerHTML = `<span class="bar">${varHTML(v)}</span>`;
      thead.append(tr);
    });
  } else {
    const tr = h('tr', h('th.corner', { colspan: 1, html: `${rowVars.map(varHTML).join('')}\\${colVars.map(varHTML).join('')}` }));
    L.cols.forEach(c => tr.append(h('th', bitsOf(c, L.cb))));
    thead.append(tr);
  }
  table.append(thead);
  const tbody = h('tbody');
  L.rows.forEach((r, ri) => {
    const tr = h('tr');
    if (bars) {
      tr.append(h('th'));
      rowVars.forEach((v, k) => {
        const on = (r >> (L.rb - 1 - k)) & 1;
        const firstRow = L.rows.findIndex(x => (x >> (L.rb - 1 - k)) & 1);
        tr.append(h('th', { class: on ? 'bar-side' : '', html: ri === firstRow ? `<span class="bar">${varHTML(v)}</span>` : '' }));
      });
    } else tr.append(h('th', bitsOf(r, L.rb)));
    L.cols.forEach((c, ci) => {
      const i = L.idx(r, c);
      const td = h('td', { dataset: { i, r: ri, c: ci } });
      cells.set(i, td);
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody);

  function paint() {
    for (const [i, td] of cells) {
      const v = values[i] ?? '';
      td.innerHTML = `<span class="de">${i}</span>${v === 'X' ? 'X' : v}`;
      td.className = (v === '1' ? 'one' : v === 'X' ? 'x' : '') + (selection.has(i) ? ' sel' : '') + (opts.wrong?.includes(i) ? ' wrong' : '');
      const mk = marks.get(i);
      if (mk?.length) td.append(h('span.dots', mk.map(c => h('i', { style: { background: c } }))));
    }
  }
  // ovládanie: klik prepne políčko, ťahanie označí obdĺžnik (ako v tabuľke)
  let drag = null;
  const cellAt = (r, c) => L.idx(L.rows[r], L.cols[c]);
  if (opts.interactive) {
    table.addEventListener('pointerdown', (e) => {
      const td = e.target.closest('td'); if (!td) return;
      e.preventDefault();
      try { td.releasePointerCapture(e.pointerId); } catch {} // dotyk (iPad): aby sa ťahanie dostalo aj na ďalšie políčka
      const i = Number(td.dataset.i);
      if (opts.interactive === 'cycle') {
        const seq = opts.allowX === false ? ['0', '1'] : ['0', '1', 'X'];
        const cur = values[i] || '0';
        values[i] = seq[(seq.indexOf(cur) + 1) % seq.length];
        opts.onChange?.(values);
        paint();
        return;
      }
      drag = { r: Number(td.dataset.r), c: Number(td.dataset.c), base: new Set(selection), add: !selection.has(i), moved: false };
      if (drag.add) selection.add(i); else selection.delete(i);
      paint();
    });
    table.addEventListener('pointerover', (e) => {
      if (!drag) return;
      const td = e.target.closest('td'); if (!td) return;
      const r2 = Number(td.dataset.r), c2 = Number(td.dataset.c);
      if (r2 === drag.r && c2 === drag.c && !drag.moved) return;
      drag.moved = true;
      selection = new Set(drag.base);
      for (let r = Math.min(drag.r, r2); r <= Math.max(drag.r, r2); r++) for (let c = Math.min(drag.c, c2); c <= Math.max(drag.c, c2); c++) {
        if (drag.add) selection.add(cellAt(r, c)); else selection.delete(cellAt(r, c));
      }
      opts.onSelect?.(selection);
      paint();
    });
    window.addEventListener('pointerup', () => { drag = null; });
  }
  paint();
  const wrap = h('div.kmap-wrap', table);
  return {
    el: wrap,
    values,
    setValues(v) { values = v; paint(); },
    selection: () => [...selection],
    clearSelection() { selection = new Set(); paint(); },
    setMarks(list) { // [{ imp, color }]
      marks.clear();
      list.forEach(({ imp, color }) => { for (let i = 0; i < (1 << n); i++) if (B.covers(imp, i)) { if (!marks.has(i)) marks.set(i, []); marks.get(i).push(color); } });
      paint();
    },
    setWrong(w) { opts.wrong = w; paint(); },
  };
}
export function valuesFrom(n, ones, dcs = []) {
  const v = Array(1 << n).fill('0');
  ones.forEach(i => { v[i] = '1'; });
  dcs.forEach(i => { v[i] = 'X'; });
  return v;
}

// výber políčok → implikant ('01-'), alebo null, ak to nie je pravidelná konfigurácia
export function cubeOf(sel, n) {
  if (!sel.length) return null;
  const k = Math.log2(sel.length);
  if (!Number.isInteger(k)) return null;
  let cube = '';
  for (let b = 0; b < n; b++) {
    const vals = new Set(sel.map(i => (i >> (n - 1 - b)) & 1));
    cube += vals.size === 2 ? '-' : String([...vals][0]);
  }
  const free = [...cube].filter(c => c === '-').length;
  if (free !== k) return null;
  return cube;
}

// ---------- Pravdivostná tabuľka ----------
// outputs: [{ name, values?: pole hodnôt na zobrazenie, edit?: bool, allowX?: bool }]
export function truthTable(vars, outputs, { rows, compact } = {}) {
  const n = vars.length;
  const idxs = rows || Array.from({ length: 1 << n }, (_, i) => i);
  const inputs = outputs.map(() => new Map());
  const table = h('table.t.tt', { class: compact ? 'compact' : '' });
  table.append(h('thead', h('tr', h('th.idx', 'DE'), vars.map(v => h('th', { html: varHTML(v) })),
    outputs.map((o, k) => h('th', { class: k === 0 ? 'vsep' : '', html: o.nameHTML || varHTML(o.name) })))));
  const tb = h('tbody');
  idxs.forEach(i => {
    const tr = h('tr', h('td.idx', i), [...bitsOf(i, n)].map(b => h('td', b)));
    outputs.forEach((o, k) => {
      const td = h('td', { class: k === 0 ? 'vsep' : '' });
      if (o.edit) {
        const inp = h('input.cell', { maxlength: 1, value: o.values?.[i] ?? '', autocomplete: 'off', inputmode: 'text' });
        inp.addEventListener('input', () => {
          inp.value = inp.value.toUpperCase().replace(o.allowX === false ? /[^01]/g : /[^01X]/g, '').slice(-1);
          inp.classList.remove('ok', 'bad');
          if (inp.value) moveNext(inp);
        });
        inp.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); moveNext(inp); } if (e.key === 'ArrowUp') { e.preventDefault(); movePrev(inp); } });
        inputs[k].set(i, inp);
        td.append(inp);
      } else td.textContent = o.values?.[i] ?? '';
      tr.append(td);
    });
    tb.append(tr);
  });
  table.append(tb);
  function colInputs(inp) { return [...table.querySelectorAll('input.cell')].filter(x => x.parentElement.cellIndex === inp.parentElement.cellIndex); }
  function moveNext(inp) { const c = colInputs(inp); const j = c.indexOf(inp); if (j < c.length - 1) c[j + 1].focus(); }
  function movePrev(inp) { const c = colInputs(inp); const j = c.indexOf(inp); if (j > 0) c[j - 1].focus(); }
  return {
    el: h('div.table-wrap', table),
    read(k = 0) { const out = {}; for (const [i, inp] of inputs[k]) out[i] = inp.value; return out; },
    mark(k, i, ok) { const inp = inputs[k].get(i); if (inp) { inp.classList.toggle('ok', ok); inp.classList.toggle('bad', !ok); } },
    inputs,
  };
}

// ---------- Pole na výraz so živým náhľadom ----------
export function exprInput({ label, placeholder = 'napr. A!B + BC', vars, width } = {}) {
  const input = h('input', { type: 'text', placeholder, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', style: width ? { width } : null });
  const preview = h('div.expr-preview');
  const update = () => {
    input.classList.remove('ok', 'bad');
    const v = input.value.trim();
    if (!v) { preview.className = 'expr-preview'; preview.innerHTML = '&nbsp;'; return; }
    try {
      const ast = B.parse(v);
      if (vars) {
        const unknown = [...B.varsOf(ast)].filter(x => !vars.includes(x));
        if (unknown.length) throw new B.ParseError(`Premenná ${unknown.join(', ')} v úlohe nie je (povolené: ${vars.join(', ')})`, 0);
      }
      preview.className = 'expr-preview';
      preview.innerHTML = astHTML(ast);
    } catch (e) {
      preview.className = 'expr-preview err';
      preview.textContent = e.message + (e.pos != null && v.length > 1 ? ` (pozícia ${e.pos + 1})` : '');
    }
  };
  input.addEventListener('input', update);
  update();
  const el = h('div.row.top', { style: { flexWrap: 'nowrap', width: '100%' } },
    label ? h('span.expr-label', { html: label + ' =' }) : null,
    h('div.expr-input', { style: { flex: 1 } }, input, preview));
  return { el, input, get value() { return input.value; }, set value(v) { input.value = v; update(); }, mark(ok) { input.classList.toggle('ok', ok); input.classList.toggle('bad', !ok); } };
}
export const SYNTAX_HELP = 'Zápis: negácia <code>!A</code> alebo <code>A\'</code>, súčin <code>AB</code> alebo <code>A*B</code>, súčet <code>A+B</code>, NAND <code>A↑B</code> alebo <code>nand(A,B)</code>, NOR <code>A↓B</code> alebo <code>nor(A,B)</code>, XOR <code>A⊕B</code>.';
export function syntaxHelp() { return h('div.help-syntax', { html: SYNTAX_HELP }); }

// tabuľka chýb: kde sa výraz líši od funkcie
export function wrongTable(vars, wrong, vec, ones, max = 6) {
  const one = new Set(ones);
  const rows = wrong.slice(0, max).map(i => `<tr><td>${i}</td><td class="mono">${bitsOf(i, vars.length)}</td><td>${one.has(i) ? 1 : 0}</td><td class="bad">${vec[i]}</td></tr>`).join('');
  return `<table class="t compact" style="margin-top:6px"><tr><th>DE</th><th>${vars.map(varHTML).join('')}</th><th>má byť</th><th>tvoj výraz</th></tr>${rows}</table>` +
    (wrong.length > max ? `<div class="muted small">… a ďalších ${wrong.length - max}</div>` : '');
}

// vyhodnotenie odpovede v tvare MDNF / MKNF
export function judgeMinimal(src, vars, ones, dcs, kind) {
  const r = B.checkMinimalForm(src, vars, ones, dcs, kind);
  const name = kind === 'dnf' ? 'MDNF' : 'MKNF';
  const refs = r.ref ? r.ref.solutions.map(s => fx(impsHTML(s, vars, kind))) : [];
  const refText = refs.length > 1 ? `Minimálne riešenia (${refs.length}): ${refs.join(' &nbsp;alebo&nbsp; ')}` : `Minimálne riešenie: ${refs[0] || ''}`;
  switch (r.status) {
    case 'parse': return { ok: false, incomplete: true, feedback: 'Výraz sa nedá prečítať: ' + esc(r.msg) };
    case 'wrong': {
      let vec; try { vec = B.truthVector(B.parse(src), vars); } catch {}
      return { ok: false, wrong: r.wrong, feedback: `Výraz nie je ekvivalentný so zadanou funkciou – líši sa v ${r.wrong.length} ${r.wrong.length === 1 ? 'bode' : 'bodoch'}:` + wrongTable(vars, r.wrong, vec, ones), correct: refs[0] };
    }
    case 'notform': return { ok: false, score: 0.5, feedback: esc(r.msg) + ' ' + refText, correct: refs[0] };
    case 'notmin': return { ok: false, score: 0.5, feedback: `Výraz je správny, ale nie je minimálny: máš ${termWord(r.terms, kind)} a ${litWord(r.literals)}, ${name} má ${termWord(r.ref.terms, kind)} a ${litWord(r.ref.literals)}. ${refText}`, correct: refs[0] };
    case 'ok': return { ok: true, feedback: `${name} má ${termWord(r.terms, kind)} a ${litWord(r.literals)}.` + (refs.length > 1 ? ` Existuje viac minimálnych riešení: ${refs.join(', ')}.` : ''), correct: refs[0] };
  }
}

export function choice(options, { name } = {}) {
  // jednoduchý výber s radio tlačidlami
  let value = null;
  const el = h('div.row', options.map(o => {
    const b = h('button', { type: 'button', onclick: () => { value = o.value; [...el.children].forEach(c => c.classList.toggle('active', c === b)); } }, o.label);
    return b;
  }));
  return { el, get value() { return value; } };
}

export { shuffle, rnd };

// ---------- náhodné výrazy ----------
export function randomExpr(vars, depth = 3, { allowNot = true } = {}) {
  const leaf = () => { const v = { t: 'var', n: vars[rnd(vars.length)] }; return Math.random() < 0.35 ? { t: 'not', a: v } : v; };
  const rec = (d, parent) => {
    if (d === 0 || (d < depth && Math.random() < 0.22)) return leaf();
    const r = Math.random();
    if (allowNot && r < 0.15 && parent !== 'not') return { t: 'not', a: rec(d - 1, 'not') };
    const t = parent === 'and' ? 'or' : parent === 'or' ? 'and' : (r < 0.55 ? 'or' : 'and');
    const k = Math.random() < 0.2 ? 3 : 2;
    return { t, args: Array.from({ length: k }, () => rec(d - 1, t)) };
  };
  return rec(depth, null);
}
export function countLeaves(ast) {
  if (ast.t === 'var') return 1;
  if (ast.t === 'const') return 0;
  if (ast.t === 'not') return countLeaves(ast.a);
  return ast.args.reduce((s, a) => s + countLeaves(a), 0);
}
// AST → text v syntaxi parsera
export function astText(ast, parent = 0) {
  const prec = { or: 1, xor: 2, and: 3 };
  switch (ast.t) {
    case 'var': return ast.n;
    case 'const': return String(ast.v);
    case 'not': return ast.a.t === 'var' ? '!' + ast.a.n : '!(' + astText(ast.a, 0) + ')';
    case 'and': { const s = ast.args.map(a => astText(a, 3)).join(''); return parent > 3 ? `(${s})` : s; }
    case 'or': case 'xor': { const s = ast.args.map(a => astText(a, prec[ast.t])).join(ast.t === 'or' ? ' + ' : ' ⊕ '); return parent >= prec[ast.t] ? `(${s})` : s; }
    case 'nand': case 'nor': return ast.args.length === 2 ? `(${astText(ast.args[0])} ${ast.t === 'nand' ? '↑' : '↓'} ${astText(ast.args[1])})` : `${ast.t}(${ast.args.map(a => astText(a)).join(', ')})`;
    default: return `${ast.t}(${ast.args.map(a => astText(a)).join(', ')})`;
  }
}
export function onesOf(ast, vars) { return B.truthVector(ast, vars).map((v, i) => v ? i : -1).filter(i => i >= 0); }
