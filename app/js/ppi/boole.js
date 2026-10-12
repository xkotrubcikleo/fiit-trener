// Booleova algebra: pravdivostné tabuľky, úplné formy, zjednodušovanie, negácia, zákony, analýza obvodu
import { h, esc, pick, rint, shuffle } from '../core/ui.js';
import * as B from '../lib/boolean.js';
import { varNames, varHTML, astHTML, fx, fnHead, truthTable, exprInput, syntaxHelp, randomExpr, countLeaves, astText, onesOf,
  dNotation, wrongTable, judgeMinimal, bitsOf, impsHTML, zerosOf } from './common.js';

function exprWithVars(vars, depth, need = vars.length) {
  for (let i = 0; i < 300; i++) {
    const e = randomExpr(vars, depth);
    const used = B.varsOf(e).size;
    const ones = onesOf(e, vars);
    if (used >= need && ones.length > 0 && ones.length < (1 << vars.length)) return e;
  }
  return B.parse(vars.join(' + '));
}

// 1. pravdivostná tabuľka z výrazu
function genTabulka({ level }) {
  const n = level === 3 ? 4 : 3;
  const vars = varNames(n);
  const ast = exprWithVars(vars, level === 1 ? 2 : 3);
  const vec = B.truthVector(ast, vars);
  const tt = truthTable(vars, [{ name: 'f', edit: true, allowX: false }]);
  return {
    el: h('div', h('p', { html: `Doplň pravdivostnú tabuľku funkcie ${fx('f = ' + astHTML(ast))}` }), tt.el),
    check() {
      const v = tt.read(0);
      if (Object.values(v).some(x => x === '')) return { incomplete: true, feedback: 'Vyplň všetky riadky (0 alebo 1).' };
      let bad = 0;
      vec.forEach((x, i) => { const ok = Number(v[i]) === x; tt.mark(0, i, ok); if (!ok) bad++; });
      return { ok: bad === 0, score: 1 - bad / vec.length, feedback: bad ? `Chybných riadkov: ${bad}. Červené políčka oprav.` : '', correct: dNotation(vec.map((x, i) => x ? i : -1).filter(i => i >= 0)) };
    },
    solution() {
      const t = truthTable(vars, [{ name: 'f', values: vec }], { compact: true });
      return h('div', h('p', { html: `Postupne dosadzuj. Funkcia je 1 v bodoch ${dNotation(onesOf(ast, vars))}.` }), t.el);
    },
    summary: { prompt: 'tabuľka pre f = ' + astText(ast), correct: dNotation(onesOf(ast, vars)) },
  };
}

// 2. úplná DNF / KNF
function genUplna({ level }) {
  const n = level === 3 ? 4 : 3;
  const vars = varNames(n);
  const kind = Math.random() < 0.5 ? 'dnf' : 'knf';
  let ones;
  do { ones = shuffle([...Array(1 << n).keys()]).slice(0, rint(2, n === 3 ? 4 : 5)).sort((a, b) => a - b); } while (!ones.length);
  if (kind === 'knf') ones = zerosOf(n, ones); // menej núl → kratšia ÚKNF
  const zeros = zerosOf(n, ones);
  const inp = exprInput({ label: 'f', vars, placeholder: kind === 'dnf' ? 'súčet mintermov' : 'súčin maxtermov' });
  const correctText = kind === 'dnf'
    ? ones.map(i => [...bitsOf(i, n)].map((b, k) => (b === '1' ? '' : '!') + vars[k]).join('')).join(' + ')
    : zeros.map(i => '(' + [...bitsOf(i, n)].map((b, k) => (b === '0' ? '' : '!') + vars[k]).join(' + ') + ')').join('');
  const correctHTML = kind === 'dnf'
    ? ones.map(i => [...bitsOf(i, n)].map((b, k) => b === '1' ? varHTML(vars[k]) : `<span class="ov">${varHTML(vars[k])}</span>`).join('')).join(' + ')
    : zeros.map(i => '(' + [...bitsOf(i, n)].map((b, k) => b === '0' ? varHTML(vars[k]) : `<span class="ov">${varHTML(vars[k])}</span>`).join(' + ') + ')').join('');
  return {
    el: h('div', h('p', { html: `Funkcia ${fx(fnHead('f', vars))} = ${kind === 'dnf' ? dNotation(ones) : dNotation(zeros, [], 'K')}. Zapíš ju v <b>úplnej ${kind === 'dnf' ? 'disjunktívnej (ÚDNF)' : 'konjunktívnej (ÚKNF)'}</b> normálnej forme.` }),
      inp.el, syntaxHelp()),
    check() {
      let ast; try { ast = B.parse(inp.value); } catch (e) { return { incomplete: true, feedback: esc(e.message) }; }
      let cmp; try { cmp = B.compareWith(ast, vars, ones); } catch (e) { return { incomplete: true, feedback: esc(e.message) }; }
      if (!cmp.ok) return { ok: false, feedback: 'Výraz nezodpovedá funkcii:' + wrongTable(vars, cmp.wrong, cmp.vec, ones), correct: correctText };
      const terms = kind === 'dnf' ? B.asDNF(ast) : B.asKNF(ast);
      if (!terms) return { ok: false, score: .5, feedback: `Výraz je ekvivalentný, ale nie je v tvare ${kind === 'dnf' ? 'súčtu súčinov' : 'súčinu súčtov'}.`, correct: correctText };
      if (terms.some(t => new Set(t.map(l => l.replace('!', ''))).size !== n)) return { ok: false, score: .5, feedback: `Je to ekvivalentná ${kind.toUpperCase()}, ale nie úplná – každý ${kind === 'dnf' ? 'súčin (minterm)' : 'súčet (maxterm)'} musí obsahovať všetkých ${n} premenných.`, correct: correctText };
      return { ok: true, feedback: '' };
    },
    solution() {
      return `<p>${kind === 'dnf' ? 'Pre každý bod, kde f = 1, napíšeme minterm: premenná s hodnotou 1 priamo, s hodnotou 0 negovaná.' : 'Pre každý bod, kde f = 0, napíšeme maxterm: premenná s hodnotou <b>0 priamo</b>, s hodnotou <b>1 negovaná</b> (opačná polarita!).'}</p><p>${fx('f = ' + correctHTML)}</p>`;
    },
    summary: { prompt: `Ú${kind.toUpperCase()} pre ${kind === 'dnf' ? dNotation(ones) : dNotation(zeros, [], 'K')}`, correct: correctText },
    given: () => inp.value,
  };
}

// 3. zjednodušenie výrazu
function genZjednodus({ level }) {
  const n = level === 3 ? 4 : 3;
  const vars = varNames(n);
  let ast, ones, best;
  for (let i = 0; i < 400; i++) {
    ast = exprWithVars(vars, level === 1 ? 3 : 4, n - 1);
    ones = onesOf(ast, vars);
    const d = B.minimize(n, ones), k = B.minimizeKNF(n, ones);
    best = Math.min(d.literals, k.literals);
    if (countLeaves(ast) >= best + (level === 1 ? 2 : 3) && best >= 2) break;
  }
  const d = B.minimize(n, ones), k = B.minimizeKNF(n, ones);
  const bestText = d.literals <= k.literals ? B.solutionText(d.solutions[0], vars) : B.solutionText(k.solutions[0], vars, 'knf');
  const inp = exprInput({ label: 'f', vars });
  return {
    el: h('div', h('p', { html: `Zjednoduš výraz ${fx('f = ' + astHTML(ast))}` }), inp.el, syntaxHelp(),
      h('p.small.muted', 'Hodnotí sa ekvivalencia a počet písmen (literálov). Výsledok môže byť v ľubovoľnom tvare.')),
    check() {
      let a; try { a = B.parse(inp.value); } catch (e) { return { incomplete: true, feedback: esc(e.message) }; }
      let cmp; try { cmp = B.compareWith(a, vars, ones); } catch (e) { return { incomplete: true, feedback: esc(e.message) }; }
      if (!cmp.ok) return { ok: false, feedback: 'Výraz nie je ekvivalentný:' + wrongTable(vars, cmp.wrong, cmp.vec, ones), correct: bestText };
      const lits = countLeaves(a);
      if (lits <= best) return { ok: true, feedback: `Ekvivalentné a s ${lits} písmenami – to je minimum.` };
      return { ok: false, score: .6, feedback: `Ekvivalentné, ale má ${lits} písmen. Dá sa to s ${best}: MDNF ${fx(impsHTML(d.solutions[0], vars))}, MKNF ${fx(impsHTML(k.solutions[0], vars, 'knf'))}.`, correct: bestText };
    },
    solution() {
      return `<p>MDNF: ${fx(impsHTML(d.solutions[0], vars))} (${d.literals} písmen)</p><p>MKNF: ${fx(impsHTML(k.solutions[0], vars, 'knf'))} (${k.literals} písmen)</p>
      <p class="small muted">Funkcia je 1 v bodoch ${dNotation(ones)}. Algebraicky: roznásob, použi absorpciu A + AB = A, A + ĀB = A + B, spájanie AB + AB̄ = A a konsenzus.</p>`;
    },
    summary: { prompt: 'zjednoduš ' + astText(ast), correct: bestText },
    given: () => inp.value,
  };
}

// 4. negácia (De Morgan)
function genNegacia({ level }) {
  const n = 3, vars = varNames(n);
  const ast = exprWithVars(vars, level === 1 ? 2 : 3);
  const ones = onesOf(ast, vars);
  const comp = zerosOf(n, ones);
  const m = B.minimize(n, comp);
  const inp = exprInput({ label: '<span class="ov">f</span>', vars });
  return {
    el: h('div', h('p', { html: `Daná je funkcia ${fx('f = ' + astHTML(ast))}. Napíš jej <b>negáciu</b> ${fx('<span class="ov">f</span>')} v tvare <b>DNF</b> (súčet súčinov, negácie iba nad premennými).` }), inp.el, syntaxHelp()),
    check() {
      let a; try { a = B.parse(inp.value); } catch (e) { return { incomplete: true, feedback: esc(e.message) }; }
      let cmp; try { cmp = B.compareWith(a, vars, comp); } catch (e) { return { incomplete: true, feedback: esc(e.message) }; }
      if (!cmp.ok) return { ok: false, feedback: 'Toto nie je negácia f:' + wrongTable(vars, cmp.wrong, cmp.vec, comp), correct: B.solutionText(m.solutions[0], vars) };
      if (!B.asDNF(a)) return { ok: false, score: .5, feedback: 'Ekvivalentné, ale nie v tvare DNF – roznásob a negácie posuň až k premenným.', correct: B.solutionText(m.solutions[0], vars) };
      return { ok: true, feedback: `Najjednoduchší tvar: ${fx(impsHTML(m.solutions[0], vars))}` };
    },
    solution() {
      return `<p>De Morgan: ${fx('<span class="ov">A + B</span> = <span class="ov">A</span>·<span class="ov">B</span>')}, ${fx('<span class="ov">AB</span> = <span class="ov">A</span> + <span class="ov">B</span>')} – zamení sa + a ·, negujú sa všetky písmená.</p>
      <p>${fx('<span class="ov">f</span> = ' + impsHTML(m.solutions[0], vars))}</p><p class="small muted">${fx('<span class="ov">f</span>')} je 1 presne tam, kde f = 0: ${dNotation(comp)}.</p>`;
    },
    summary: { prompt: 'negácia ' + astText(ast), correct: B.solutionText(m.solutions[0], vars) },
    given: () => inp.value,
  };
}

// 5. zákony – platí rovnosť?
const IDENTITIES = [
  ['A + AB', 'A', 'absorpcia'], ['A(A + B)', 'A', 'absorpcia'], ['A + !AB', 'A + B', 'absorpcia negácie'], ['A(!A + B)', 'AB', 'absorpcia negácie'],
  ['AB + A!B', 'A', 'spájanie'], ['(A + B)(A + !B)', 'A', 'spájanie'], ['!(A + B)', '!A!B', 'De Morgan'], ['!(AB)', '!A + !B', 'De Morgan'],
  ['A + BC', '(A + B)(A + C)', 'distributívnosť súčtu'], ['AB + !AC + BC', 'AB + !AC', 'konsenzus'], ['(A + B)(!A + C)(B + C)', '(A + B)(!A + C)', 'konsenzus (duálny)'],
  ['A ⊕ B', 'A!B + !AB', 'XOR'], ['!(A ⊕ B)', 'AB + !A!B', 'XNOR'], ['A + 1', '1', 'agresívnosť 1'], ['A · 0', '0', 'agresívnosť 0'], ['A + !A', '1', 'vylúčenie tretieho'],
  ['A!A', '0', 'spor'], ['!!A', 'A', 'dvojitá negácia'], ['A ↑ A', '!A', 'NAND ako NOT'], ['(A ↓ B) ↓ (A ↓ B)', 'A + B', 'OR z NOR'], ['(A ↑ A) ↑ (B ↑ B)', 'A + B', 'OR z NAND'],
  ['(A ↓ A) ↓ (B ↓ B)', 'AB', 'AND z NOR'], ['(A ↑ B) ↑ (A ↑ B)', 'AB', 'AND z NAND'],
];
const FALSES = [
  ['A + BC', '(A + B)C', 'distributívnosť sa nedá takto'], ['!(AB)', '!A!B', 'pri De Morganovi sa mení aj operátor'], ['!(A + B)', '!A + !B', 'pri De Morganovi sa mení aj operátor'],
  ['A + !AB', 'A', 'správne je A + B'], ['AB + !AC + BC', 'AB + BC', 'vypustiť sa dá iba konsenzus BC'], ['A ⊕ B', 'AB + !A!B', 'to je XNOR'],
  ['A ↑ (B ↑ C)', '(A ↑ B) ↑ C', 'NAND nie je asociatívny'], ['A ↓ (B ↓ C)', '(A ↓ B) ↓ C', 'NOR nie je asociatívny'], ['(A + B)(A + C)', 'A + B + C', 'správne je A + BC'],
  ['AB + !A!B', '1', 'to je XNOR, nie konštanta'], ['A(!A + B)', 'B', 'správne je AB'], ['(A ↑ A) ↑ (B ↑ B)', 'AB', 'to je OR'],
];
function genZakony() {
  const isTrue = Math.random() < 0.55;
  const [l, r, why] = pick(isTrue ? IDENTITIES : FALSES);
  const vars = ['A', 'B', 'C'];
  const L = B.parse(l), R = B.parse(r);
  const real = B.truthVector(L, vars).every((v, i) => v === B.truthVector(R, vars)[i]);
  let answer = null;
  const btns = ['Platí', 'Neplatí'].map((t, k) => h('button', { onclick: () => { answer = k === 0; btns.forEach((b, j) => b.classList.toggle('active', j === k)); } }, t));
  return {
    el: h('div', h('p', 'Platí táto rovnosť pre všetky hodnoty premenných?'), h('p.big', { html: fx(astHTML(L) + ' = ' + astHTML(R)) }), h('div.row', btns)),
    check() {
      if (answer === null) return { incomplete: true, feedback: 'Vyber odpoveď.' };
      const ok = answer === real;
      return { ok, feedback: (real ? 'Rovnosť platí' : 'Rovnosť neplatí') + ` – ${why}.`, correct: real ? 'platí' : 'neplatí' };
    },
    solution() {
      const vl = B.truthVector(L, vars), vr = B.truthVector(R, vars);
      const used = [...new Set([...B.varsOf(L), ...B.varsOf(R)])].sort();
      const rows = [...Array(8).keys()].filter(i => i % (8 >> used.length) === 0 || used.length === 3);
      const t = truthTable(vars.slice(0, 3), [{ name: 'ľavá', values: vl }, { name: 'pravá', values: vr }], { compact: true });
      return h('div', h('p', (real ? 'Platí' : 'Neplatí') + ` (${why}). Porovnanie tabuliek:`), t.el, rows.length ? null : null);
    },
    summary: { prompt: `${l} = ${r} ?`, correct: real ? 'platí' : 'neplatí' },
    given: () => answer === null ? '' : answer ? 'platí' : 'neplatí',
  };
}

// 6. analýza obvodu zo zoznamu hradiel
function genAnalyza({ level }) {
  const vars = varNames(3);
  const gates = level === 1 ? ['AND', 'OR', 'NAND', 'NOR'] : ['AND', 'OR', 'NAND', 'NOR', 'XOR', 'NOT'];
  const sigs = [...vars];
  const list = [];
  const count = level === 1 ? 2 : level === 2 ? 3 : 4;
  for (let g = 0; g < count; g++) {
    const type = g === count - 1 && pick([true, false]) ? pick(['NAND', 'NOR']) : pick(gates);
    const avail = sigs.slice();
    const k = type === 'NOT' ? 1 : 2;
    let ins = shuffle(avail).slice(0, k);
    if (g > 0 && !ins.includes(sigs[sigs.length - 1])) ins[0] = sigs[sigs.length - 1];
    if (g === count - 1 && count > 2 && !ins.includes(sigs[sigs.length - 2]) && type !== 'NOT') ins[1] = sigs[sigs.length - 2];
    ins = [...new Set(ins)];
    if (ins.length < k) ins.push(vars.find(v => !ins.includes(v)));
    const name = g === count - 1 ? 'Y' : 'G' + (g + 1);
    list.push({ name, type, ins });
    sigs.push(name);
  }
  const env = {};
  const toAst = (s) => {
    if (vars.includes(s)) return { t: 'var', n: s };
    const g = list.find(x => x.name === s);
    const args = g.ins.map(toAst);
    if (g.type === 'NOT') return { t: 'not', a: args[0] };
    return { t: g.type.toLowerCase(), args };
  };
  const ast = toAst('Y');
  const ones = onesOf(ast, vars);
  const m = B.minimize(3, ones);
  const inp = exprInput({ label: 'Y', vars });
  return {
    el: h('div', h('p', 'Obvod je zadaný zoznamom hradiel. Urči výstup Y a zapíš ho čo najjednoduchšie (MDNF).'),
      h('table.t', h('tr', h('th', 'signál'), h('th', 'hradlo'), h('th', 'vstupy')), list.map(g => h('tr', h('td', { html: `<b>${g.name}</b>` }), h('td', g.type), h('td', { html: g.ins.map(varHTML).join(', ') })))),
      inp.el, syntaxHelp()),
    check() {
      const r = judgeMinimal(inp.value, vars, ones, [], 'dnf');
      if (r.ok || r.incomplete) return r;
      if (r.score) return { ...r, ok: false };
      return r;
    },
    solution() {
      const lines = list.map(g => `<li><b>${g.name}</b> = ${fx(astHTML(toAst(g.name)))}</li>`).join('');
      return `<ol>${lines}</ol><p>Po zjednodušení: ${fx('Y = ' + impsHTML(m.solutions[0], vars))}</p>`;
    },
    summary: { prompt: 'analýza: ' + list.map(g => `${g.name}=${g.type}(${g.ins.join(',')})`).join('; '), correct: B.solutionText(m.solutions[0], vars) },
    given: () => inp.value,
  };
}

export default {
  id: 'boole', title: 'Booleova algebra', icon: '∧',
  desc: 'Tabuľky, ÚDNF/ÚKNF, zjednodušovanie, De Morgan, zákony, analýza obvodu',
  intro: 'Základy pre všetky ďalšie témy. Výrazy píš z klávesnice, náhľad pod políčkom ukáže, ako ich program číta.',
  modes: [
    { id: 'tabulka', label: 'Pravdivostná tabuľka', levels: true, gen: genTabulka },
    { id: 'uplna', label: 'ÚDNF / ÚKNF', levels: true, gen: genUplna },
    { id: 'zjednodus', label: 'Zjednoduš výraz', levels: true, gen: genZjednodus },
    { id: 'negacia', label: 'Negácia (De Morgan)', levels: true, gen: genNegacia },
    { id: 'zakony', label: 'Platí rovnosť?', gen: genZakony },
    { id: 'analyza', label: 'Analýza obvodu', levels: true, gen: genAnalyza },
  ],
};
