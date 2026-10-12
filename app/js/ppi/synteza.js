// Štruktúrna syntéza sekvenčného obvodu: automat → kódovanie → budiaca tabuľka → budiace a výstupné funkcie
import { h, mount, esc, pick, rint, shuffle } from '../core/ui.js';
import * as B from '../lib/boolean.js';
import * as A from '../lib/automata.js';
import { fx, exprInput, syntaxHelp, judgeMinimal, impsHTML, varHTML, kmap, valuesFrom, bitsOf, COLORS } from './common.js';
import { fsmSVG, fsmTable, randomAutomaton, reduce } from './automaty.js';
import { FF_INPUTS } from './klopne.js';

function design(level) {
  const type = Math.random() < 0.7 ? 'moore' : 'mealy';
  const n = level === 1 ? 3 : pick([3, 4]);
  let aut;
  if (Math.random() < 0.5) {
    aut = randomAutomaton(n, type);
  } else {
    const pat = pick(['10', '11', '01', '101', '110', '011']);
    aut = reduce(A.sequenceDetector(pat, type, Math.random() < 0.6));
    if (aut.states.length > 4) aut = randomAutomaton(n, type);
  }
  const k = Math.ceil(Math.log2(aut.states.length));
  const codes = level === 1 ? aut.states.map((_, i) => i) : [0, ...shuffle([...Array(1 << k).keys()].slice(1)).slice(0, aut.states.length - 1)];
  const ff = level === 1 ? pick(['D', 'JK']) : pick(['D', 'JK', 'T', 'JK', 'SR']);
  return { aut, k, codes, ff, type };
}

function compute({ aut, k, codes, ff, type }) {
  const qv = Array.from({ length: k }, (_, j) => 'Q' + (k - 1 - j)); // Q1 Q0 (Q1 = vyšší bit)
  const vars = [...qv, 'X'];
  const nv = vars.length, N = 1 << nv;
  const ffIns = FF_INPUTS[ff];
  const funcs = []; // { name, ones, dcs, vars }
  const rows = [];
  for (let b = 0; b < k; b++) for (const inp of ffIns) funcs.push({ name: inp + (k - 1 - b), bit: b, inp, ones: [], dcs: [], vars });
  const next = Array.from({ length: k }, () => ({ ones: [], dcs: [] }));
  for (let idx = 0; idx < N; idx++) {
    const code = idx >> 1, x = idx & 1;
    const s = codes.indexOf(code);
    if (s < 0) { funcs.forEach(f => f.dcs.push(idx)); next.forEach(f => f.dcs.push(idx)); rows.push({ idx, code, x, unused: true }); continue; }
    const t = aut.next[s][x], tc = codes[t];
    const ex = [];
    for (let b = 0; b < k; b++) {
      const q = (code >> (k - 1 - b)) & 1, qn = (tc >> (k - 1 - b)) & 1;
      if (qn) next[b].ones.push(idx);
      const e = A.ffExcitation(ff, q, qn);
      ffIns.forEach(inp => {
        const f = funcs.find(z => z.bit === b && z.inp === inp);
        if (e[inp] === '1') f.ones.push(idx); else if (e[inp] === 'X') f.dcs.push(idx);
        ex.push(e[inp]);
      });
    }
    rows.push({ idx, code, x, s, t, tc, ex, y: type === 'moore' ? aut.out[s] : aut.out[s][x] });
  }
  // výstup
  let yf;
  if (type === 'moore') {
    const ones = [], dcs = [];
    for (let c = 0; c < (1 << k); c++) { const s = codes.indexOf(c); if (s < 0) dcs.push(c); else if (aut.out[s]) ones.push(c); }
    yf = { name: 'Y', ones, dcs, vars: qv };
  } else {
    const ones = [], dcs = [];
    rows.forEach(r => { if (r.unused) dcs.push(r.idx); else if (r.y) ones.push(r.idx); });
    yf = { name: 'Y', ones, dcs, vars };
  }
  return { vars, qv, funcs, next, rows, yf, ffIns };
}

function codingTable(d) {
  return h('table.t.compact', h('tr', h('th', 'stav'), d.aut.states.map(s => h('th', s))),
    h('tr', h('th', { html: d.qv ? d.qv.map(varHTML).join('') : 'kód' }), d.codes.map(c => h('td.mono', bitsOf(c, d.k)))));
}

function fullTable(d, c, { showNext = true, showEx = true } = {}) {
  const { k, ff } = d;
  const exNames = []; for (let b = 0; b < k; b++) c.ffIns.forEach(i => exNames.push(i + (k - 1 - b)));
  return h('table.t.compact',
    h('tr', c.qv.map(q => h('th', { html: varHTML(q) })), h('th', 'x'), h('th', 'stav'), showNext ? [h('th.vsep', 'stav⁺'), c.qv.map(q => h('th', { html: varHTML(q) + '⁺' }))] : null,
      showEx ? exNames.map((e, i) => h('th', { class: i === 0 ? 'vsep' : '', html: varHTML(e) })) : null, h('th.vsep', 'y')),
    c.rows.map(r => h('tr', bitsOf(r.code, k).split('').map(b => h('td', b)), h('td', r.x), h('td', r.unused ? '–' : d.aut.states[r.s]),
      showNext ? [h('td.vsep', r.unused ? '–' : d.aut.states[r.t]), (r.unused ? Array(k).fill('X') : bitsOf(r.tc, k).split('')).map(b => h('td', b))] : null,
      showEx ? (r.unused ? exNames.map(() => 'X') : r.ex).map((v, i) => h('td', { class: i === 0 ? 'vsep' : '' }, v)) : null,
      h('td.vsep', r.unused ? 'X' : r.y))));
}

function genTabulka({ level }) {
  const d = design(level);
  const c = compute(d);
  const { k } = d;
  const exNames = []; for (let b = 0; b < k; b++) c.ffIns.forEach(i => exNames.push(i + (k - 1 - b)));
  const mk = () => h('select', ['', '0', '1', 'X'].map(v => h('option', { value: v }, v || '–')));
  const cells = c.rows.map(() => ({ next: Array.from({ length: k }, mk), ex: exNames.map(mk) }));
  const table = h('table.t.compact',
    h('tr', c.qv.map(q => h('th', { html: varHTML(q) })), h('th', 'x'), c.qv.map((q, i) => h('th', { class: i === 0 ? 'vsep' : '', html: varHTML(q) + '⁺' })), exNames.map((e, i) => h('th', { class: i === 0 ? 'vsep' : '', html: varHTML(e) }))),
    c.rows.map((r, ri) => h('tr', bitsOf(r.code, k).split('').map(b => h('td', b)), h('td', r.x),
      cells[ri].next.map((s, i) => h('td', { class: i === 0 ? 'vsep' : '' }, s)), cells[ri].ex.map((s, i) => h('td', { class: i === 0 ? 'vsep' : '' }, s)))));
  return {
    el: h('div', h('p', { html: `Automat realizuj pomocou <b>PO-${d.ff}</b>. Stavy sú zakódované podľa tabuľky. Doplň kódovanú prechodovú tabuľku (Q⁺) a budiace funkcie. Nepoužitý kód → X.` }),
      h('div.row.top', { style: { gap: '20px' } }, fsmSVG(d.aut), h('div', fsmTable(d.aut), h('div', { style: { marginTop: '8px' } }, codingTable({ ...d, qv: c.qv })))),
      h('div.table-wrap', { style: { marginTop: '10px' } }, table)),
    check() {
      let bad = 0, tot = 0, empty = 0;
      c.rows.forEach((r, ri) => {
        const wantNext = r.unused ? Array(k).fill('X') : bitsOf(r.tc, k).split('');
        const wantEx = r.unused ? exNames.map(() => 'X') : r.ex;
        cells[ri].next.forEach((s, i) => { tot++; if (!s.value) empty++; const ok = s.value === wantNext[i]; s.className = ok ? 'ok' : 'bad'; bad += !ok; });
        cells[ri].ex.forEach((s, i) => { tot++; if (!s.value) empty++; const ok = s.value === wantEx[i]; s.className = ok ? 'ok' : 'bad'; bad += !ok; });
      });
      if (empty === tot) return { incomplete: true, feedback: 'Vyplň tabuľku.' };
      return { ok: !bad, score: 1 - bad / tot, feedback: bad ? `Chybných políčok: ${bad} z ${tot}.` : 'Tabuľka sedí. Ďalší krok: mapy a minimalizácia budiacich funkcií.' };
    },
    solution() { return h('div', h('p.small', `Pre každý riadok: zo stavu a vstupu zisti nasledujúci stav, jeho kód je Q⁺. Potom pre každý bit použi budiacu tabuľku PO-${d.ff} (Q → Q⁺).`), h('div.table-wrap', fullTable(d, c))); },
    summary: { prompt: `kódovaná tabuľka, PO-${d.ff}, ${d.aut.states.length} stavy`, correct: '' },
  };
}

function genFunkcie({ level }) {
  const d = design(level);
  const c = compute(d);
  const all = [...c.funcs, c.yf];
  const inputs = all.map(f => exprInput({ label: varHTML(f.name), vars: f.vars }));
  const shown = level === 1 ? fullTable(d, c) : level === 2 ? fullTable(d, c, { showEx: false }) : null;
  return {
    el: h('div', h('p', { html: `Navrhni sekvenčný obvod s <b>PO-${d.ff}</b> pre automat nižšie. Napíš <b>MDNF</b> budiacich funkcií ${c.funcs.map(f => varHTML(f.name)).join(', ')} a výstupu y${d.type === 'moore' ? ' (Moore: iba z Q)' : ' (Mealy: z Q a x)'}. Premenné: ${c.vars.map(varHTML).join(', ')} (vstup píš ako X).` }),
      h('div.row.top', { style: { gap: '20px' } }, fsmSVG(d.aut), h('div', fsmTable(d.aut), h('div', { style: { marginTop: '8px' } }, codingTable({ ...d, qv: c.qv })))),
      shown ? h('details', { open: level === 1, style: { marginTop: '10px' } }, h('summary', level === 1 ? 'Budiaca tabuľka' : 'Kódovaná prechodová tabuľka'), h('div.table-wrap', shown)) : null,
      h('div.stack', { style: { marginTop: '12px' } }, inputs.map(i => i.el)), syntaxHelp()),
    check() {
      const rs = all.map((f, i) => judgeMinimal(inputs[i].value, f.vars, f.ones, f.dcs, 'dnf'));
      const inc = rs.findIndex(r => r.incomplete);
      if (inc >= 0) return { incomplete: true, feedback: `${all[inc].name}: ${rs[inc].feedback}` };
      rs.forEach((r, i) => inputs[i].mark(r.ok));
      const score = rs.reduce((s, r) => s + (r.ok ? 1 : r.score || 0), 0) / rs.length;
      return { ok: rs.every(r => r.ok), score, feedback: rs.map((r, i) => r.ok ? `<p><b>${varHTML(all[i].name)}</b> ✓</p>` : `<div><b>${varHTML(all[i].name)}</b>: ${typeof r.feedback === 'string' ? r.feedback : ''}</div>`).join(''),
        correct: all.map(f => `${f.name} = ${B.solutionText(B.minimize(f.vars.length, f.ones, f.dcs).solutions[0], f.vars)}`).join('; ') };
    },
    solution() {
      return h('div', h('div.table-wrap', fullTable(d, c)),
        h('div.grid.cols-3', { style: { marginTop: '12px' } }, all.map(f => {
          const r = B.minimize(f.vars.length, f.ones, f.dcs);
          const km = kmap(f.vars.length, f.vars, valuesFrom(f.vars.length, f.ones, f.dcs), { order: 'zosit' });
          km.setMarks(r.solutions[0].map((p, i) => ({ imp: p, color: COLORS[i % COLORS.length] })));
          return h('div', h('p', { html: fx(`${varHTML(f.name)} = ${impsHTML(r.solutions[0], f.vars)}`) }), km.el);
        })));
    },
    summary: { prompt: `syntéza PO-${d.ff}, ${d.type}, ${d.aut.states.length} stavy`, correct: all.map(f => `${f.name} = ${B.solutionText(B.minimize(f.vars.length, f.ones, f.dcs).solutions[0], f.vars)}`).join('; ') },
    given: () => inputs.map((inp, i) => `${all[i].name} = ${inp.value}`).join('; '),
  };
}

function genAnalyza({ level }) {
  // analýza: z budiacich funkcií PO-D zostav prechodovú tabuľku
  const d = design(1);
  d.ff = 'D';
  const c = compute(d);
  const k = d.k;
  const exprs = c.funcs.map(f => B.solutionText(B.minimize(f.vars.length, f.ones, f.dcs).solutions[0], f.vars));
  const yExpr = B.solutionText(B.minimize(c.yf.vars.length, c.yf.ones, c.yf.dcs).solutions[0], c.yf.vars);
  const used = c.rows.filter(r => !r.unused);
  const mk = () => h('select', ['', '0', '1'].map(v => h('option', { value: v }, v || '–')));
  const cells = used.map(() => ({ next: Array.from({ length: k }, mk), y: mk() }));
  return {
    el: h('div', h('p', { html: 'Analyzuj sekvenčný obvod s PO-D. Budiace funkcie a výstup sú dané rovnicami. Doplň prechodovú tabuľku (iba pre použité kódy).' }),
      h('p', { html: c.funcs.map((f, i) => fx(`${varHTML(f.name)} = ${B.astToHTML(B.parse(exprs[i])).replace(/Q(\d)/g, 'q<sub>$1</sub>')}`)).join('<br>') + '<br>' + fx(`y = ${B.astToHTML(B.parse(yExpr)).replace(/Q(\d)/g, 'q<sub>$1</sub>')}`) }),
      h('table.t.compact', h('tr', c.qv.map(q => h('th', { html: varHTML(q) })), h('th', 'x'), c.qv.map((q, i) => h('th', { class: i === 0 ? 'vsep' : '', html: varHTML(q) + '⁺' })), h('th.vsep', 'y')),
        used.map((r, ri) => h('tr', bitsOf(r.code, k).split('').map(b => h('td', b)), h('td', r.x), cells[ri].next.map((s, i) => h('td', { class: i === 0 ? 'vsep' : '' }, s)), h('td.vsep', cells[ri].y))))),
    check() {
      let bad = 0, tot = 0, empty = 0;
      used.forEach((r, ri) => {
        const want = bitsOf(r.tc, k).split('');
        cells[ri].next.forEach((s, i) => { tot++; if (!s.value) empty++; const ok = s.value === want[i]; s.className = ok ? 'ok' : 'bad'; bad += !ok; });
        tot++; if (!cells[ri].y.value) empty++; const ok = Number(cells[ri].y.value) === r.y; cells[ri].y.className = ok ? 'ok' : 'bad'; bad += !ok;
      });
      if (empty) return { incomplete: true, feedback: 'Vyplň celú tabuľku.' };
      return { ok: !bad, score: 1 - bad / tot, feedback: bad ? `Chybných políčok: ${bad}.` : 'Pri PO-D platí Q⁺ = D, takže stačí dosadiť.' };
    },
    solution() { return h('div', h('p.small', 'Pri PO-D je nasledujúci stav priamo hodnota D. Dosaď Q a x do rovníc.'), fullTable(d, c, { showEx: false }), h('p', 'Ako automat:'), fsmSVG(d.aut)); },
    summary: { prompt: 'analýza sekvenčného obvodu s PO-D', correct: '' },
  };
}

// ---------- CV4 úloha 10: kódovanie stavov v kódovej tabuľke (2×2 K-mapa) ----------
function genKodovanie({ level }) {
  let aut, legend = '';
  if (Math.random() < 0.45) {
    const [names, out] = pick([[['VYP', 'NÍZKY', 'VYSOKÝ'], [0, 1, 1]], [['VYP', 'ZAP', 'BLIKÁ'], [0, 1, 0]], [['ČERVENÁ', 'ZELENÁ', 'ORANŽOVÁ'], [1, 0, 0]]]);
    aut = { type: 'moore', states: A.names(3), start: 0, next: [[0, 1], [1, 2], [2, 0]], out };
    legend = `Režimy: ${names.map((n, i) => `${aut.states[i]} = ${n}`).join(', ')}. Vstup x = 1 prepne na ďalší režim, x = 0 režim drží.`;
  } else aut = randomAutomaton(level === 3 ? 4 : 3, 'moore');
  const n = aut.states.length;
  const CODES = ['00', '01', '10', '11'];
  // kódová tabuľka: riadky q1, stĺpce q0
  const cellSel = {};
  const mapTable = h('table.kmap', h('tr', h('th.corner', { html: 'q<sub>1</sub>\\q<sub>0</sub>' }), h('th', '0'), h('th', '1')),
    [0, 1].map(q1 => h('tr', h('th', q1), [0, 1].map(q0 => {
      const code = `${q1}${q0}`;
      cellSel[code] = h('select', h('option', { value: '' }, '—'), aut.states.map((st, i) => h('option', { value: i }, st)));
      return h('td', { style: { width: '78px', height: '52px' } }, h('span.de', code), cellSel[code]);
    }))));
  const mk = (opts) => h('select', h('option', { value: '' }, '–'), opts.map(o => h('option', { value: o }, o)));
  const unusedSel = mk(n === 4 ? ['žiadny'] : CODES), startSel = mk(CODES);
  const rowIn = CODES.map(() => ({ n0: h('input.cell', { maxlength: 2, style: { width: '3.4em' } }), n1: h('input.cell', { maxlength: 2, style: { width: '3.4em' } }), y: h('input.cell', { maxlength: 1 }) }));
  const coded = h('table.t', h('tr', h('th', { html: 'q<sub>1</sub>q<sub>0</sub>' }), h('th', 'x = 0: ďalší kód'), h('th', 'x = 1: ďalší kód'), h('th.vsep', 'y')),
    CODES.map((c, r) => h('tr', h('td.mono', c), h('td', rowIn[r].n0), h('td', rowIn[r].n1), h('td.vsep', rowIn[r].y))));
  // všetky prechody medzi rôznymi stavmi
  const trans = [];
  aut.next.forEach((row, s) => row.forEach((t, x) => { if (t !== s) trans.push([s, t, x]); }));
  const adjacent = (a, b) => [...a].filter((ch, i) => ch !== b[i]).length === 1;
  const adjCount = (codeOf) => trans.filter(([s, t]) => adjacent(codeOf[s], codeOf[t])).length;
  let best = 0;
  const perm = (avail, chosen) => { if (chosen.length === n) { best = Math.max(best, adjCount(chosen)); return; } avail.forEach((c, i) => perm(avail.filter((_, j) => j !== i), [...chosen, c])); };
  perm(CODES, []);
  const norm = (v) => v.trim().toUpperCase().replace(/-/g, 'X');
  return {
    el: h('div', h('p', { html: 'Zakóduj stavy Moorovho automatu dvomi bitmi q<sub>1</sub>q<sub>0</sub>. Do kódovej tabuľky (rozloženie dvojpremennej K-mapy) rozmiestni všetky stavy tak, aby čo najviac prechodov viedlo medzi <b>susednými</b> kódmi. Potom prepíš prechodovú tabuľku do kódov.' }),
      legend ? h('p.small', legend) : null,
      h('div.row.top', { style: { gap: '20px' } }, fsmSVG(aut), fsmTable(aut)),
      h('div.row.top', { style: { gap: '28px', marginTop: '12px' } },
        h('div', h('div.small.muted', 'Kódová tabuľka'), mapTable),
        h('div', h('table.t', h('tr', h('th.l', 'Nepriradený kód'), h('td', unusedSel)), h('tr', h('th.l', 'Kód počiatočného stavu'), h('td', startSel))),
          h('p.small.muted', { style: { marginTop: '8px' } }, 'V kódovanej tabuľke daj pri nepriradenom kóde X (na ďalšom kóde ani výstupe nezáleží).'))),
      h('h3', 'Kódovaná prechodová tabuľka'), coded),
    check() {
      const codeOf = Array(n).fill(null);
      let dup = false;
      for (const c of CODES) { const v = cellSel[c].value; if (v === '') continue; if (codeOf[v] !== null) dup = true; codeOf[v] = c; }
      if (dup || codeOf.some(c => c === null)) return { incomplete: true, feedback: 'Každý stav musí byť v kódovej tabuľke práve raz.' };
      const unused = CODES.filter(c => !codeOf.includes(c));
      let bad = 0, tot = 0;
      const mark = (el, ok) => { el.classList.toggle('ok', ok); el.classList.toggle('bad', !ok); el.className = el.tagName === 'SELECT' ? (ok ? 'ok' : 'bad') : el.className; tot++; bad += !ok; };
      mark(unusedSel, unusedSel.value === (unused[0] || 'žiadny'));
      mark(startSel, startSel.value === codeOf[aut.start]);
      CODES.forEach((c, r) => {
        const s = codeOf.indexOf(c);
        const want = s < 0 ? ['XX', 'XX', 'X'] : [codeOf[aut.next[s][0]], codeOf[aut.next[s][1]], String(aut.out[s])];
        const got = [norm(rowIn[r].n0.value), norm(rowIn[r].n1.value), norm(rowIn[r].y.value)].map((g, i) => s < 0 && i < 2 && g === 'X' ? 'XX' : g);
        [rowIn[r].n0, rowIn[r].n1, rowIn[r].y].forEach((el, i) => mark(el, got[i] === want[i]));
      });
      const adj = adjCount(codeOf);
      const nonAdj = trans.filter(([s2, t]) => !adjacent(codeOf[s2], codeOf[t])).map(([s2, t, x]) => `${aut.states[s2]} → ${aut.states[t]} (x = ${x}): ${codeOf[s2]} → ${codeOf[t]}`);
      const adjMsg = `Susedných prechodov: <b>${adj}</b> z ${trans.length} (najviac sa dá ${best}).` + (nonAdj.length ? ` Nesusedné: ${nonAdj.join('; ')}.` : '');
      if (bad) return { ok: false, score: 1 - bad / tot, feedback: `Chybných políčok: ${bad}. ` + adjMsg, correct: CODES.map(c => { const s2 = codeOf.indexOf(c); return s2 < 0 ? `${c}: XX/XX, y=X` : `${c}: ${codeOf[aut.next[s2][0]]}/${codeOf[aut.next[s2][1]]}, y=${aut.out[s2]}`; }).join('; ') };
      return { ok: true, feedback: adjMsg + (adj < best ? ' Tabuľka je správna, ale iné rozmiestnenie by dalo viac susedných prechodov.' : ' Lepšie sa to nedá.') + ' Výstup y sa nemusí rovnať kódu – kód iba rozlišuje stavy, y je samostatná funkcia stavu.' };
    },
    solution() {
      // najlepšie kódovanie s počiatočným stavom 00
      let bestCode = null;
      const perm2 = (avail, chosen) => { if (chosen.length === n) { if (adjCount(chosen) === best && (!bestCode || chosen[aut.start] === '00' && bestCode[aut.start] !== '00')) bestCode = chosen; return; } avail.forEach((c, i) => perm2(avail.filter((_, j) => j !== i), [...chosen, c])); };
      perm2(CODES, []);
      const rows = CODES.map(c => { const s2 = bestCode.indexOf(c); return `<tr><td class="mono">${c}</td><td>${s2 < 0 ? '–' : aut.states[s2]}</td><td class="mono">${s2 < 0 ? 'XX' : bestCode[aut.next[s2][0]]}</td><td class="mono">${s2 < 0 ? 'XX' : bestCode[aut.next[s2][1]]}</td><td>${s2 < 0 ? 'X' : aut.out[s2]}</td></tr>`; }).join('');
      return `<p>Jedno z najlepších kódovaní: ${aut.states.map((st, i) => `${st} = <b class="mono">${bestCode[i]}</b>`).join(', ')} (${best} susedných prechodov z ${trans.length}).</p>
        <p class="small">Susedné kódy sa líšia v jednom bite – v kódovej tabuľke ležia vedľa seba (nie po diagonále). Pri cykle troch stavov nemôžu byť susedné všetky tri prechody, lebo 00 → 01 → 11 → 00 má posledný krok cez dva bity.</p>
        <table class="t"><tr><th>q<sub>1</sub>q<sub>0</sub></th><th>stav</th><th>x = 0</th><th>x = 1</th><th>y</th></tr>${rows}</table>`;
    },
    summary: { prompt: `kódovanie stavov (${n} stavy)`, correct: `max. ${best} susedných prechodov` },
  };
}

export default {
  id: 'synteza', title: 'Štruktúrna syntéza', icon: '⚙',
  desc: 'TEST 3: kódovanie stavov, budiaca tabuľka, budiace funkcie PO-D/JK/T/SR, analýza',
  intro: 'Z automatu na obvod: zakóduj stavy, zostav kódovanú prechodovú tabuľku, z budiacej tabuľky PO urči jeho vstupy a minimalizuj ich mapami. Premenné stavu sú q₁, q₀ (Q1, Q0), vstup X.',
  modes: [
    { id: 'kodovanie', label: 'Kódovanie stavov (CV4)', levels: true, gen: genKodovanie },
    { id: 'tabulka', label: 'Budiaca tabuľka', levels: true, gen: genTabulka },
    { id: 'funkcie', label: 'Budiace funkcie (MDNF)', levels: true, gen: genFunkcie },
    { id: 'analyza', label: 'Analýza obvodu', gen: genAnalyza },
  ],
};
