// Príprava na TEST 2 (dekóder): kódové prevodníky, skupinová minimalizácia, porovnanie obvodov,
// 7-segmentový dekóder, realizácia funkcie dekodérom, slovné úlohy.
import { h, mount, esc, pick, rint, shuffle } from '../core/ui.js';
import * as B from '../lib/boolean.js';
import * as M from '../lib/multi.js';
import * as N from '../lib/numbers.js';
import { varNames, varHTML, fx, fnHead, kmap, valuesFrom, truthTable, exprInput, syntaxHelp, judgeMinimal, impsHTML, termsHTML,
  dNotation, zerosOf, niceFn, randomFn, bitsOf, wrongTable, COLORS } from './common.js';
import { kmapWorkbench } from './kmapy.js';

const pl = (n, a, b, c) => n === 1 ? a : n >= 2 && n <= 4 ? b : c;
const costLine = (c) => `<b>${c.gates}</b> ${pl(c.gates, 'člen', 'členy', 'členov')} (NOT ${c.detail.not}, ${c.kind === 'dnf' ? 'AND' : 'OR'} ${c.detail.inner}, ${c.kind === 'dnf' ? 'OR' : 'AND'} ${c.detail.outer}) · <b>${c.inputs}</b> ${pl(c.inputs, 'vstup', 'vstupy', 'vstupov')} · <b>${c.literals}</b> ${pl(c.literals, 'literál', 'literály', 'literálov')}${c.detail.shared ? ` · zdieľané členy: ${c.detail.shared}` : ''}`;

function parseOutput(src, vars, f, kind) {
  let ast;
  try { ast = B.parse(src); } catch (e) { return { err: e.message }; }
  let cmp;
  try { cmp = B.compareWith(ast, vars, f.ones, f.dcs); } catch (e) { return { err: e.message }; }
  if (ast.t === 'const') return { ast, cmp, terms: [], constant: true };
  const terms = kind === 'dnf' ? B.asDNF(ast) : B.asKNF(ast);
  return { ast, cmp, terms };
}

// Úloha so skupinovou minimalizáciou viacerých výstupov
export function groupTask({ n, vars, funcs, names, kind, intro, showMaps = true, extraEl = null, title }) {
  const ref = M.groupMinimize(n, funcs, kind);
  const refTexts = M.solutionTexts(ref, vars, kind);
  const refHTMLs = ref.solution.map(o => o.constant ? String(o.value) : impsHTML(o.imps, vars, kind));
  const inputs = names.map(nm => exprInput({ label: varHTML(nm), vars }));
  const costBox = h('div.small');
  const updateCost = () => {
    const outs = [];
    for (let k = 0; k < funcs.length; k++) {
      const p = parseOutput(inputs[k].value, vars, funcs[k], kind);
      if (p.err || (!p.terms && !p.constant)) { costBox.innerHTML = '<span class="muted">Cena obvodu sa zobrazí, keď budú všetky výstupy zapísané v tvare ' + kind.toUpperCase() + '.</span>'; return null; }
      outs.push(p.constant ? { constant: true, terms: [] } : { terms: p.terms });
    }
    const c = M.circuitCost(outs, kind);
    costBox.innerHTML = 'Tvoj obvod: ' + costLine(c);
    return c;
  };
  inputs.forEach(i => i.input.addEventListener('input', updateCost));
  const maps = showMaps ? h('div.grid.cols-3', funcs.map((f, k) => h('div.card.flat', h('div', { html: `<b class="formula">${varHTML(names[k])}</b>` }),
    kmapWorkbench(n, vars, { values: valuesFrom(n, f.ones, f.dcs), locked: true, kind, exprTarget: inputs[k] }).el))) : null;
  updateCost();
  return {
    el: h('div', h('p', { html: intro }), extraEl,
      h('p.small.muted', { html: `Pravidlá hodnotenia: 1. počet členov vrátane NOT, 2. súčet vstupov, 3. počet literálov. Spoločný člen sa realizuje iba raz, pevný výstup 0/1 nepotrebuje hradlo. Píš v tvare <b>${kind.toUpperCase()}</b>.` }),
      maps, h('div.stack', { style: { marginTop: '12px' } }, inputs.map(i => i.el)), syntaxHelp(), h('div.callout', { style: { marginTop: '10px' } }, costBox)),
    check() {
      const outs = []; let wrongMsg = '', formMsg = '';
      for (let k = 0; k < funcs.length; k++) {
        const p = parseOutput(inputs[k].value, vars, funcs[k], kind);
        if (p.err) return { incomplete: true, feedback: `${names[k]}: ${esc(p.err)}` };
        inputs[k].mark(p.cmp.ok);
        if (!p.cmp.ok) wrongMsg += `<p><b>${varHTML(names[k])}</b> je zle:</p>` + wrongTable(vars, p.cmp.wrong, p.cmp.vec, funcs[k].ones, 4);
        else if (!p.terms && !p.constant) formMsg += `<p><b>${varHTML(names[k])}</b> nie je v tvare ${kind.toUpperCase()}.</p>`;
        outs.push(p.constant ? { constant: true, terms: [] } : { terms: p.terms || [] });
      }
      const correct = names.map((nm, k) => `${nm} = ${refTexts[k]}`).join('; ');
      if (wrongMsg) return { ok: false, feedback: wrongMsg, correct };
      if (formMsg) return { ok: false, score: .5, feedback: formMsg, correct };
      const mine = M.circuitCost(outs, kind);
      const cmp = M.compareCost(mine, ref.cost);
      if (cmp <= 0) return { ok: true, feedback: 'Tvoj obvod: ' + costLine(mine) + (cmp < 0 ? '<br>Lepšie ako referenčné riešenie!' : '') };
      return { ok: false, score: .6, feedback: `Všetky výstupy sú správne, ale obvod sa dá zjednodušiť. Rozhodlo kritérium <b>${M.decidingCriterion(mine, ref.cost)}</b>.<br>Tvoj: ${costLine(mine)}<br>Najlepší: ${costLine(ref.cost)}`, correct };
    },
    solution() {
      const shared = new Map();
      ref.solution.forEach((o, k) => (o.imps || []).forEach(p => { if (!shared.has(p)) shared.set(p, []); shared.get(p).push(names[k]); }));
      const sh = [...shared].filter(([, v]) => v.length > 1);
      return h('div',
        h('div.stack', ref.solution.map((o, k) => h('p', { html: fx(`${varHTML(names[k])} = ${refHTMLs[k]}`) + (o.constant ? ' <span class="badge">pevný výstup – bez hradla</span>' : '') }))),
        sh.length ? h('p', { html: 'Spoločné členy (realizujú sa raz): ' + sh.map(([p, v]) => `${fx(impsHTML([p], vars, kind))} pre ${v.map(varHTML).join(', ')}`).join('; ') }) : h('p.muted', 'Žiadny člen sa nezdieľa.'),
        h('p', { html: 'Cena: ' + costLine(ref.cost) }),
        ref.exhaustive ? null : h('p.small.muted', 'Úloha bola príliš veľká na úplné prehľadanie – riešenie je samostatná minimalizácia výstupov.'),
        showMaps ? h('div.grid.cols-3', funcs.map((f, k) => {
          const km = kmap(n, vars, valuesFrom(n, f.ones, f.dcs), {});
          if (!ref.solution[k].constant) km.setMarks(ref.solution[k].imps.map((p, i) => ({ imp: p, color: COLORS[[...shared.keys()].indexOf(p) % COLORS.length] })));
          return h('div', h('b.formula', { html: varHTML(names[k]) }), km.el);
        })) : null);
    },
    summary: { prompt: title || 'skupinová minimalizácia', correct: names.map((nm, k) => `${nm} = ${refTexts[k]}`).join('; ') },
    given: () => inputs.map((inp, k) => `${names[k]} = ${inp.value}`).join('; '),
  };
}

// ---------- kódové prevodníky ----------
function converterFuncs(from, to) {
  const A = N.DIGIT_CODES[from], Bc = N.DIGIT_CODES[to];
  const used = new Set(A);
  const dcs = [...Array(16).keys()].filter(i => !used.has(i));
  return [3, 2, 1, 0].map(bit => ({ ones: A.filter((c, d) => (Bc[d] >> bit) & 1), dcs }));
}
function pickCodes() {
  const codes = Object.keys(N.DIGIT_CODES);
  let a, b;
  do { a = pick(codes); b = pick(codes); } while (a === b);
  return [a, b];
}
function codeTable(from, to, vars, outNames, withOut = true) {
  const A = N.DIGIT_CODES[from], Bc = N.DIGIT_CODES[to];
  return h('table.t.compact', h('tr', h('th', 'číslica'), h('th', { html: `${from}<br>${vars.map(varHTML).join(' ')}` }), withOut ? h('th', { html: `${to}<br>${outNames.map(varHTML).join(' ')}` }) : null),
    A.map((c, d) => h('tr', h('td', d), h('td.mono', bitsOf(c, 4).split('').join(' ')), withOut ? h('td.mono', bitsOf(Bc[d], 4).split('').join(' ')) : null)));
}

function genTabulka() {
  const [from, to] = pickCodes();
  const vars = varNames(4), outs = ['Y3', 'Y2', 'Y1', 'Y0'];
  const funcs = converterFuncs(from, to);
  const tt = truthTable(vars, outs.map(o => ({ name: o, edit: true })), {});
  const target = funcs.map(f => valuesFrom(4, f.ones, f.dcs));
  return {
    el: h('div', h('p', { html: `Navrhni prevodník z kódu <b>${from}</b> do kódu <b>${to}</b>. Doplň úplnú pravdivostnú tabuľku výstupov (X tam, kde vstupná kombinácia v kóde nie je).` }),
      h('div.row.top', { style: { gap: '24px' } }, codeTable(from, to, vars, outs), tt.el)),
    check() {
      let bad = 0, empty = 0;
      outs.forEach((o, k) => { const v = tt.read(k); for (let i = 0; i < 16; i++) { if (!v[i]) empty++; const ok = v[i] === target[k][i]; tt.mark(k, i, ok); if (!ok) bad++; } });
      if (empty === 64) return { incomplete: true, feedback: 'Vyplň tabuľku.' };
      return { ok: bad === 0, score: 1 - bad / 64, feedback: bad ? `Chybných políčok: ${bad}.` : 'Tabuľka sedí – teraz by nasledovali mapy pre Y3…Y0.', correct: 'pozri riešenie' };
    },
    solution() { return truthTable(vars, outs.map((o, k) => ({ name: o, values: target[k] })), { compact: true }).el; },
    summary: { prompt: `tabuľka prevodníka ${from} → ${to}`, correct: '' },
  };
}

function genPrevodnik({ level }) {
  const [from, to] = pickCodes();
  const vars = varNames(4);
  let funcs = converterFuncs(from, to), names = ['Y3', 'Y2', 'Y1', 'Y0'];
  if (level === 1) { const k = rint(0, 3); funcs = [funcs[k]]; names = [names[k]]; }
  else if (level === 2) { const ks = shuffle([0, 1, 2, 3]).slice(0, 2).sort(); funcs = ks.map(k => funcs[k]); names = ks.map(k => names[k]); }
  const kind = level === 3 && Math.random() < 0.4 ? 'knf' : 'dnf';
  return groupTask({
    n: 4, vars, funcs, names, kind,
    intro: `Prevodník z kódu <b>${from}</b> do <b>${to}</b>. Navrhni ${names.length > 1 ? 'výstupy ' + names.map(varHTML).join(', ') + ' so skupinovou minimalizáciou' : 'výstup ' + varHTML(names[0])} v tvare <b>M${kind.toUpperCase()}</b>. Nepoužité kombinácie sú X.`,
    extraEl: h('details', h('summary.small', 'Tabuľka kódov'), codeTable(from, to, vars, ['Y3', 'Y2', 'Y1', 'Y0'])),
    title: `prevodník ${from} → ${to} (${names.join(', ')})`,
  });
}

function genSkupinova({ level }) {
  const n = level === 1 ? 3 : 4;
  const k = level === 3 ? 3 : 2;
  const vars = varNames(n);
  const kind = Math.random() < (level === 1 ? 0.25 : 0.4) ? 'knf' : 'dnf';
  // funkcie so spoločnou časťou, aby sa oplatilo zdieľať
  let funcs, ref, sep;
  for (let t = 0; t < 60; t++) {
    const core = randomFn(n, { density: 0.25 });
    funcs = Array.from({ length: k }, () => {
      const extra = randomFn(n, { density: 0.25, dc: level === 3 ? 0.08 : 0 });
      const ones = [...new Set([...core.ones, ...extra.ones])].filter(i => !extra.dcs.includes(i));
      return { ones, dcs: extra.dcs };
    });
    if (funcs.some(f => f.ones.length + f.dcs.length >= (1 << n) - 1)) continue;
    ref = M.groupMinimize(n, funcs, kind);
    sep = M.circuitCost(funcs.map(f => { const m = kind === 'dnf' ? B.minimize(n, f.ones, f.dcs) : B.minimizeKNF(n, f.ones, f.dcs); return { terms: m.solutions[0].map(p => B.impToTerm(p, vars, kind)) }; }), kind);
    if (ref.exhaustive && ref.cost.detail.shared > 0) break;
  }
  const names = ['F', 'G', 'H'].slice(0, k);
  return groupTask({
    n, vars, funcs, names, kind,
    intro: `Navrhni funkcie ${names.map(x => fx(fnHead(x, vars))).join(', ')} v tvare <b>${kind.toUpperCase()}</b> so <b>skupinovou minimalizáciou</b> (spoločné členy).<br>` +
      funcs.map((f, i) => `${fx(names[i])} = ${kind === 'dnf' ? dNotation(f.ones, f.dcs) : dNotation(zerosOf(n, f.ones, f.dcs), f.dcs, 'K')}`).join(' · '),
    title: 'skupinová minimalizácia ' + funcs.map((f, i) => `${names[i]}=${dNotation(f.ones, f.dcs)}`).join(', '),
  });
}

function genPorovnanie({ level }) {
  const n = level === 1 ? 3 : 4;
  const vars = varNames(n);
  const f = niceFn(n, { minTerms: 2, maxTerms: 3, dc: level === 3 ? 0.1 : 0 });
  const d = B.minimize(n, f.ones, f.dcs), k = B.minimizeKNF(n, f.ones, f.dcs);
  const cd = M.circuitCost([{ terms: d.solutions[0].map(p => B.impToTerm(p, vars, 'dnf')) }], 'dnf');
  const ck = M.circuitCost([{ terms: k.solutions[0].map(p => B.impToTerm(p, vars, 'knf')) }], 'knf');
  const c = M.compareCost(cd, ck);
  const winner = c < 0 ? 'dnf' : c > 0 ? 'knf' : 'eq';
  const crit = M.decidingCriterion(cd, ck);
  const wSel = h('select', h('option', { value: '' }, '—'), h('option', { value: 'dnf' }, 'MDNF'), h('option', { value: 'knf' }, 'MKNF'), h('option', { value: 'eq' }, 'rovnocenné'));
  const cSel = h('select', h('option', { value: '' }, '—'), ['počet členov (vrátane NOT)', 'súčet vstupov', 'počet literálov', 'žiadne (zhoda)'].map(x => h('option', { value: x }, x)));
  return {
    el: h('div', h('p', { html: `Pre funkciu ${fx(fnHead('f', vars))} = ${dNotation(f.ones, f.dcs)} nájdi MDNF aj MKNF a rozhodni, ktorá realizácia je výhodnejšia.` }),
      kmap(n, vars, valuesFrom(n, f.ones, f.dcs), {}).el,
      h('table.t', { style: { marginTop: '10px' } }, h('tr', h('th.l', 'Výhodnejšia je'), h('td', wSel)), h('tr', h('th.l', 'Rozhodlo kritérium'), h('td', cSel)))),
    check() {
      if (!wSel.value || !cSel.value) return { incomplete: true, feedback: 'Vyber obe odpovede.' };
      const want = crit || 'žiadne (zhoda)';
      const ok1 = wSel.value === winner, ok2 = cSel.value === want;
      wSel.className = ok1 ? 'ok' : 'bad'; cSel.className = ok2 ? 'ok' : 'bad';
      return { ok: ok1 && ok2, score: (ok1 + ok2) / 2, feedback: `MDNF: ${fx(impsHTML(d.solutions[0], vars))} → ${costLine(cd)}<br>MKNF: ${fx(impsHTML(k.solutions[0], vars, 'knf'))} → ${costLine(ck)}`, correct: `${winner}, ${want}` };
    },
    solution() {
      return `<p>MDNF: ${fx(impsHTML(d.solutions[0], vars))} → ${costLine(cd)}</p><p>MKNF: ${fx(impsHTML(k.solutions[0], vars, 'knf'))} → ${costLine(ck)}</p>
      <p>Porovnávame postupne: členy (s NOT) → vstupy → literály a končíme pri prvom rozdiele. ${winner === 'eq' ? 'Obe sú rovnocenné.' : `Výhodnejšia je <b>${winner === 'dnf' ? 'MDNF' : 'MKNF'}</b>, rozhodol <b>${crit}</b>.`}</p>`;
    },
    summary: { prompt: `MDNF vs MKNF pre ${dNotation(f.ones, f.dcs)}`, correct: `${winner}, ${crit}` },
    given: () => `${wSel.value}, ${cSel.value}`,
  };
}

// ---------- 7-segment ----------
const SEG = { a: [0, 2, 3, 5, 6, 7, 8, 9], b: [0, 1, 2, 3, 4, 7, 8, 9], c: [0, 1, 3, 4, 5, 6, 7, 8, 9], d: [0, 2, 3, 5, 6, 8, 9], e: [0, 2, 6, 8], f: [0, 4, 5, 6, 8, 9], g: [2, 3, 4, 5, 6, 8, 9] };
function segSVG(digit, hl) {
  const on = (s) => SEG[s].includes(digit);
  const P = { a: 'M12 6h36l-6 6H18z', b: 'M50 8v36l-6-4V14z', c: 'M50 48v36l-6-6V52z', d: 'M12 86h36l-6-6H18z', e: 'M10 48v36l6-6V52z', f: 'M10 8v36l6-4V14z', g: 'M14 46h32l-4 4H18l-4-4z' };
  return `<svg viewBox="0 0 60 92" width="34" height="52">${Object.entries(P).map(([s, d]) => `<path d="${d}" fill="${on(s) ? (s === hl ? 'var(--accent)' : 'var(--text)') : 'var(--panel-2)'}" stroke="${s === hl ? 'var(--accent)' : 'none'}"/>`).join('')}</svg>`;
}
function genSegment({ level }) {
  const s = pick(Object.keys(SEG));
  const code = level === 1 ? '8421 (BCD)' : pick(Object.keys(N.DIGIT_CODES));
  const C = N.DIGIT_CODES[code];
  const vars = varNames(4);
  const ones = SEG[s].map(d => C[d]);
  const dcs = [...Array(16).keys()].filter(i => !C.includes(i));
  const kind = level === 3 && Math.random() < 0.5 ? 'knf' : 'dnf';
  const inp = exprInput({ label: s, vars });
  const wb = kmapWorkbench(4, vars, { values: valuesFrom(4, ones, dcs), locked: level === 1, kind, exprTarget: inp });
  const digits = h('div.row', { style: { gap: '4px' } }, [...Array(10).keys()].map(d => h('div', { style: { textAlign: 'center' } }, h('div', { html: segSVG(d, s) }), h('div.small.muted', d))));
  return {
    el: h('div', h('p', { html: `Dekóder pre <b>7-segmentový displej</b>: vstup je číslica v kóde <b>${code}</b>. Navrhni <b>M${kind.toUpperCase()}</b> segmentu <b>${s}</b> (zvýraznený). Nepoužité kombinácie sú X.` }), digits,
      h('details', { open: level === 1 }, h('summary.small', 'Kódy číslic'), h('table.t.compact', h('tr', h('th', 'číslica'), [...Array(10).keys()].map(d => h('th', d))), h('tr', h('th', 'kód'), C.map(c => h('td.mono', bitsOf(c, 4)))), h('tr', h('th', s), [...Array(10).keys()].map(d => h('td', SEG[s].includes(d) ? 1 : 0))))),
      h('div.row.top', { style: { gap: '24px', marginTop: '10px' } }, wb.el, h('div', { style: { flex: 1, minWidth: '260px' } }, inp.el, syntaxHelp()))),
    check: () => judgeMinimal(inp.value, vars, ones, dcs, kind),
    solution() {
      const r = kind === 'dnf' ? B.minimize(4, ones, dcs) : B.minimizeKNF(4, ones, dcs);
      const km = kmap(4, vars, valuesFrom(4, ones, dcs), {});
      km.setMarks(r.solutions[0].map((p, i) => ({ imp: p, color: COLORS[i % COLORS.length] })));
      return h('div.row.top', km.el, h('p', { html: fx(`${s} = ${impsHTML(r.solutions[0], vars, kind)}`) }));
    },
    summary: { prompt: `7-seg segment ${s}, kód ${code}`, correct: B.solutionText((kind === 'dnf' ? B.minimize : B.minimizeKNF)(4, ones, dcs).solutions[0], vars, kind) },
    given: () => inp.value,
  };
}

// ---------- realizácia funkcie dekodérom ----------
function genDekoder({ level }) {
  const n = level === 1 ? 2 : 3;
  const vars = varNames(n), N2 = 1 << n;
  const f = randomFn(n, { density: 0.45 });
  const activeLow = level >= 2 && Math.random() < 0.5;
  const checks = Array.from({ length: N2 }, (_, i) => h('input', { type: 'checkbox' }));
  const gate = h('select', h('option', { value: '' }, '—'), ['OR', 'NOR', 'AND', 'NAND'].map(g => h('option', { value: g }, g)));
  return {
    el: h('div', h('p', { html: `Realizuj ${fx(fnHead('f', vars))} = ${dNotation(f.ones)} pomocou dekodéra ${n} → ${N2} s výstupmi aktívnymi v <b>${activeLow ? 'nule' : 'jednotke'}</b> a jedného hradla.` }),
      h('p.small.muted', { html: activeLow ? `Pri vstupe s hodnotou DE = i má výstup <span class="ov">D<sub>i</sub></span> hodnotu 0, ostatné 1.` : 'Pri vstupe s hodnotou DE = i má výstup D<sub>i</sub> hodnotu 1, ostatné 0.' }),
      h('div.row', h('b', 'Pripojené výstupy:'), checks.map((c, i) => h('label.check', c, h('span', { html: activeLow ? `<span class="ov">D<sub>${i}</sub></span>` : `D<sub>${i}</sub>` })))),
      h('div.row', { style: { marginTop: '8px' } }, h('b', 'Hradlo:'), gate)),
    check() {
      const sel = checks.map((c, i) => c.checked ? i : -1).filter(i => i >= 0);
      if (!sel.length || !gate.value) return { incomplete: true, feedback: 'Vyber výstupy a hradlo.' };
      const res = [];
      for (let x = 0; x < N2; x++) {
        const vals = sel.map(i => activeLow ? (i === x ? 0 : 1) : (i === x ? 1 : 0));
        const and = vals.every(v => v), or = vals.some(v => v);
        res.push({ OR: or, NOR: !or, AND: and, NAND: !and }[gate.value] ? 1 : 0);
      }
      const want = Array.from({ length: N2 }, (_, i) => f.ones.includes(i) ? 1 : 0);
      const wrong = want.map((v, i) => v !== res[i] ? i : -1).filter(i => i >= 0);
      const zeros = zerosOf(n, f.ones);
      const opts = activeLow ? `NAND z výstupov ${f.ones.map(i => 'D' + i).join(', ')} alebo AND z výstupov ${zeros.map(i => 'D' + i).join(', ')}` : `OR z výstupov ${f.ones.map(i => 'D' + i).join(', ')} alebo NOR z výstupov ${zeros.map(i => 'D' + i).join(', ')}`;
      if (wrong.length) return { ok: false, feedback: `Obvod dáva zlú hodnotu pre DE ${wrong.join(', ')}. Správne: ${opts}.`, correct: opts };
      const minIn = Math.min(f.ones.length, zeros.length);
      return { ok: true, feedback: sel.length > minIn ? `Funguje. S menším počtom vstupov hradla: ${opts}.` : 'Funguje aj s najmenším počtom vstupov hradla.' };
    },
    solution() {
      const zeros = zerosOf(n, f.ones);
      return activeLow
        ? `<p>Výstupy v nule: <span class="ov">D<sub>i</sub></span> = negovaný minterm. Súčet mintermov ${f.ones.join(', ')} = NAND negovaných výstupov (De Morgan): <b>NAND(${f.ones.map(i => '<span class="ov">D</span><sub>' + i + '</sub>').join(', ')})</b>.</p><p>Alebo nuly funkcie: <b>AND(${zeros.map(i => '<span class="ov">D</span><sub>' + i + '</sub>').join(', ')})</b>.</p>`
        : `<p>Každý výstup D<sub>i</sub> je minterm m<sub>i</sub>. Funkcia je súčet svojich mintermov: <b>OR(${f.ones.map(i => 'D<sub>' + i + '</sub>').join(', ')})</b>.</p><p>Alebo cez nuly: f = negácia súčtu mintermov núl = <b>NOR(${zeros.map(i => 'D<sub>' + i + '</sub>').join(', ')})</b>.</p>`;
    },
    summary: { prompt: `dekóder ${n}→${N2} (${activeLow ? 'aktívne 0' : 'aktívne 1'}) pre ${dNotation(f.ones)}`, correct: '' },
  };
}

// ---------- slovné úlohy ----------
const WORD = [
  { n: 4, text: 'Na vstupe je 4-bitové číslo ABCD (A je najvyšší bit). Výstup je 1, ak je číslo <b>prvočíslo</b>.', f: (v) => [2, 3, 5, 7, 11, 13].includes(v) },
  { n: 4, text: 'Na vstupe je 4-bitové číslo ABCD. Výstup je 1, ak je číslo <b>deliteľné tromi</b> (nulu považuj za deliteľnú).', f: (v) => v % 3 === 0 },
  { n: 4, text: 'Na vstupe je číslica 0–9 v kóde 8421 (ostatné kombinácie nenastanú). Výstup je 1, ak je číslica <b>aspoň 5</b>.', f: (v) => v >= 5, dc: (v) => v > 9 },
  { n: 4, text: 'Na vstupe je číslica 0–9 v kóde 8421 (ostatné kombinácie nenastanú). Výstup je 1, ak je číslica <b>prvočíslo</b>.', f: (v) => [2, 3, 5, 7].includes(v), dc: (v) => v > 9 },
  { n: 4, text: 'Na vstupe je číslica 0–9 v kóde 8421 (ostatné kombinácie nenastanú). Výstup je 1, ak je číslica <b>deliteľná tromi</b> (0 áno).', f: (v) => v % 3 === 0, dc: (v) => v > 9 },
  { n: 3, text: '<b>Majoritný obvod:</b> výstup je 1, ak sú aspoň dva z troch vstupov A, B, C rovné 1.', f: (v) => popcount(v) >= 2 },
  { n: 4, text: 'Výstup je 1, ak sú <b>aspoň tri</b> zo štyroch vstupov rovné 1.', f: (v) => popcount(v) >= 3 },
  { n: 3, text: 'Výstup je 1, ak je <b>práve jeden</b> z troch vstupov rovný 1.', f: (v) => popcount(v) === 1 },
  { n: 3, text: '<b>Generátor parity:</b> výstup doplní párnu paritu – je 1, ak je počet jednotiek na vstupoch A, B, C nepárny.', f: (v) => popcount(v) % 2 === 1 },
  { n: 4, text: 'AB a CD sú dve 2-bitové čísla (A a C sú vyššie bity). Výstup je 1, ak <b>AB &gt; CD</b>.', f: (v) => (v >> 2) > (v & 3) },
  { n: 4, text: 'AB a CD sú dve 2-bitové čísla. Výstup je 1, ak <b>AB = CD</b>.', f: (v) => (v >> 2) === (v & 3) },
  { n: 4, text: 'AB a CD sú dve 2-bitové čísla. Výstup je <b>vyšší bit súčtu</b> AB + CD (prenos do 3. bitu ignoruj – teda bit s váhou 2).', f: (v) => (((v >> 2) + (v & 3)) >> 1) & 1 },
  { n: 4, text: 'AB a CD sú dve 2-bitové čísla. Výstup je 1, ak je ich <b>súčin aspoň 3</b>.', f: (v) => (v >> 2) * (v & 3) >= 3 },
  { n: 3, text: '<b>Alarm:</b> A = otvorené dvere, B = otvorené okno, C = alarm zapnutý. Siréna znie, ak je alarm zapnutý a sú otvorené dvere alebo okno.', f: (v) => !!(v & 1) && !!(v & 6) },
  { n: 4, text: '<b>Hlasovanie:</b> A je predseda, B, C, D členovia. Návrh prejde pri väčšine hlasov; pri rovnosti (2 : 2) rozhoduje hlas predsedu.', f: (v) => popcount(v) > 2 || (popcount(v) === 2 && !!(v & 8)) },
  { n: 3, text: '<b>Chodbové svetlo:</b> tri vypínače A, B, C. Zmena ľubovoľného vypínača prepne svetlo; pri všetkých vypnutých nesvieti.', f: (v) => popcount(v) % 2 === 1 },
  { n: 4, text: 'Na vstupe je číslica 0–9 v kóde <b>Excess-3</b> (ostatné kombinácie nenastanú). Výstup je 1, ak je číslica <b>nepárna</b>.', f: (v) => (v - 3) % 2 === 1, dc: (v) => v < 3 || v > 12 },
];
function popcount(v) { let c = 0; for (; v; v >>= 1) c += v & 1; return c; }
function genSlovna({ level }) {
  const pool = level === 1 ? WORD.filter(w => w.n === 3) : WORD;
  const w = pick(pool);
  const vars = varNames(w.n);
  const ones = [], dcs = [];
  for (let v = 0; v < (1 << w.n); v++) { if (w.dc?.(v)) dcs.push(v); else if (w.f(v)) ones.push(v); }
  const kind = level === 3 && Math.random() < 0.5 ? 'knf' : 'dnf';
  const inp = exprInput({ label: 'Y', vars });
  const wb = kmapWorkbench(w.n, vars, { kind, exprTarget: inp });
  return {
    el: h('div', h('p', { html: w.text.replace(/\bABCD\b|\bA, B, C\b/g, (m) => m) }), h('p', { html: `Zostav pravdivostnú tabuľku (alebo rovno mapu) a napíš <b>M${kind.toUpperCase()}</b> výstupu Y${vars[0] !== 'A' ? ' (premenné: ' + vars.map(varHTML).join(', ') + ' namiesto A, B, C, D)' : ''}.` }),
      h('div.row.top', { style: { gap: '24px' } }, wb.el, h('div', { style: { flex: 1, minWidth: '260px' } }, inp.el, syntaxHelp()))),
    check() { const r = judgeMinimal(inp.value, vars, ones, dcs, kind); if (r.wrong) wb.setWrong(r.wrong); return r; },
    solution() {
      const r = kind === 'dnf' ? B.minimize(w.n, ones, dcs) : B.minimizeKNF(w.n, ones, dcs);
      const km = kmap(w.n, vars, valuesFrom(w.n, ones, dcs), {});
      km.setMarks(r.solutions[0].map((p, i) => ({ imp: p, color: COLORS[i % COLORS.length] })));
      return h('div.row.top', km.el, h('div', h('p', { html: `Y = ${dNotation(ones, dcs)}` }), h('p', { html: fx('Y = ' + impsHTML(r.solutions[0], vars, kind)) })));
    },
    summary: { prompt: w.text.replace(/<[^>]+>/g, ''), correct: B.solutionText((kind === 'dnf' ? B.minimize : B.minimizeKNF)(w.n, ones, dcs).solutions[0], vars, kind) },
    given: () => inp.value,
  };
}

export default {
  id: 'dekoder', title: 'Dekóder a skupinová minimalizácia', icon: '🧮',
  desc: 'TEST 2: prevodníky kódov, zdieľané členy, porovnanie obvodov, 7-segment, slovné úlohy',
  intro: 'Príprava na TEST 2. Obvody sa hodnotia ako na cvičení: počet členov vrátane NOT → súčet vstupov → počet literálov. Úlohy sú cvičné, nie zo zadania.',
  modes: [
    { id: 'skupinova', label: 'Skupinová minimalizácia', levels: true, gen: genSkupinova },
    { id: 'prevodnik', label: 'Kódový prevodník', levels: true, gen: genPrevodnik },
    { id: 'tabulka', label: 'Tabuľka prevodníka', gen: genTabulka },
    { id: 'porovnanie', label: 'DNF vs. KNF', levels: true, gen: genPorovnanie },
    { id: 'segment', label: '7-segment', levels: true, gen: genSegment },
    { id: 'slovna', label: 'Slovné úlohy', levels: true, gen: genSlovna },
    { id: 'dekoder', label: 'Funkcia z dekodéra', levels: true, gen: genDekoder },
  ],
};
