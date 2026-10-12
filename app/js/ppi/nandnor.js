// Realizácia iba z NAND (SNF) alebo iba z NOR (PNF) a analýza takých obvodov
import { h, esc, pick } from '../core/ui.js';
import * as B from '../lib/boolean.js';
import { varNames, fx, fnHead, exprInput, syntaxHelp, impsHTML, dNotation, niceFn, astHTML, astText, wrongTable, judgeMinimal, zerosOf } from './common.js';

// SNF z MDNF (kind 'dnf', hradlo nand) alebo PNF z MKNF (kind 'knf', hradlo nor)
export function buildUniversal(imps, vars, kind, negInputs) {
  const g = kind === 'dnf' ? 'nand' : 'nor';
  const V = (n) => ({ t: 'var', n });
  const inv = (node) => negInputs && node.t === 'var' ? { t: 'not', a: node } : { t: g, args: [node, node] };
  const terms = imps.map(p => B.impToTerm(p, vars, kind));
  const lit = (l) => l.startsWith('!') ? inv(V(l.slice(1))) : V(l);
  const termNode = (t) => {
    if (t.length === 1) { const l = t[0]; return l.startsWith('!') ? V(l.slice(1)) : inv(V(l)); } // jednopísmenový člen ide do výstupného hradla negovaný
    return { t: g, args: t.map(lit) };
  };
  if (terms.length === 0) return null;
  if (terms.length === 1) {
    const t = terms[0];
    if (t.length === 1) return lit(t[0]);
    const inner = { t: g, args: t.map(lit) };
    return { t: g, args: [inner, inner] };
  }
  return { t: g, args: terms.map(termNode) };
}

function gatesOf(ast, negInputs) {
  // pri dostupných negovaných vstupoch sa ¬premenná nepočíta ako hradlo
  if (!negInputs) return B.countGates(ast);
  const strip = (n) => n.t === 'not' && n.a.t === 'var' ? { t: 'var', n: '¬' + n.a.n } : n.a ? { ...n, a: strip(n.a) } : n.args ? { ...n, args: n.args.map(strip) } : n;
  return B.countGates(strip(ast));
}

function genRealize(kind) {
  return ({ level, settings }) => {
    const n = level === 1 ? 2 + (Math.random() < 0.5 ? 1 : 0) : 3;
    const vars = varNames(n);
    const f = niceFn(n, { minTerms: level === 1 ? 1 : 2, maxTerms: level === 3 ? 3 : 2, kind });
    const r = kind === 'dnf' ? B.minimize(n, f.ones) : B.minimizeKNF(n, f.ones);
    const neg = !!settings.negInputs;
    const ref = buildUniversal(r.solutions[0], vars, kind, neg);
    const refCost = gatesOf(ref, neg);
    const g = kind === 'dnf' ? 'NAND' : 'NOR', arrow = kind === 'dnf' ? '↑' : '↓';
    const showAs = pick(['expr', 'D']);
    const inp = exprInput({ label: 'f', vars, placeholder: kind === 'dnf' ? 'napr. (A ↑ B) ↑ (C ↑ C)' : 'napr. (A ↓ B) ↓ (C ↓ C)' });
    const insertBtn = h('button.small', { type: 'button', onclick: () => { const i = inp.input; const p = i.selectionStart ?? i.value.length; i.value = i.value.slice(0, p) + ` ${arrow} ` + i.value.slice(i.selectionEnd ?? p); i.dispatchEvent(new Event('input')); i.focus(); i.selectionStart = i.selectionEnd = p + 3; } }, `vložiť ${arrow}`);
    return {
      el: h('div',
        h('p', { html: `Realizuj funkciu ${showAs === 'expr' ? fx('f = ' + impsHTML(r.solutions[0], vars, kind)) : fx(fnHead('f', vars)) + ' = ' + dNotation(f.ones)} <b>iba z hradiel ${g}</b> s čo najmenším počtom hradiel.` }),
        h('p.small.muted', { html: neg ? 'Negované vstupy sú k dispozícii (môžeš písať !A).' : `Negované vstupy <b>nie sú</b> k dispozícii – negáciu urob ako A ${arrow} A. (Zmeníš v Nastaveniach.)` }),
        h('div.row', { style: { alignItems: 'flex-start' } }, h('div', { style: { flex: 1 } }, inp.el), insertBtn), syntaxHelp()),
      check() {
        let ast; try { ast = B.parse(inp.value); } catch (e) { return { incomplete: true, feedback: esc(e.message) }; }
        let cmp; try { cmp = B.compareWith(ast, vars, f.ones); } catch (e) { return { incomplete: true, feedback: esc(e.message) }; }
        const types = [...B.nodeTypes(ast)];
        const allowed = new Set(['var', kind === 'dnf' ? 'nand' : 'nor']);
        const bad = types.filter(t => !allowed.has(t) && !(t === 'not' && neg));
        const notOnlyVars = neg && (function chk(n) { return n.t === 'not' ? n.a.t !== 'var' || false : (n.args || []).some(chk) || (n.a ? chk(n.a) : false); })(ast);
        const refHTML = fx(astHTML(ref));
        if (!cmp.ok) return { ok: false, feedback: 'Obvod nerealizuje danú funkciu:' + wrongTable(vars, cmp.wrong, cmp.vec, f.ones), correct: refHTML };
        if (bad.length || notOnlyVars) return { ok: false, score: .3, feedback: `Funkcia sedí, ale použil si aj iné operácie (${bad.map(t => ({ and: 'AND', or: 'OR', not: 'NOT', xor: 'XOR', nand: 'NAND', nor: 'NOR' }[t] || t)).join(', ') || 'negáciu výrazu'}). Povolené je iba ${g}.`, correct: refHTML };
        const c = gatesOf(ast, neg);
        if (c.gates <= refCost.gates) return { ok: true, feedback: `${c.gates} ${c.gates === 1 ? 'hradlo' : c.gates < 5 ? 'hradlá' : 'hradiel'} ${g}${c.gates < refCost.gates ? ' – ešte lepšie ako vzorové riešenie!' : '.'}` };
        return { ok: false, score: .6, feedback: `Správne, ale použil si ${c.gates} hradiel. Stačí ${refCost.gates}: ${refHTML}`, correct: refHTML };
      },
      solution() {
        const name = kind === 'dnf' ? 'SNF (NAND/NAND)' : 'PNF (NOR/NOR)';
        const base = kind === 'dnf' ? 'MDNF' : 'MKNF';
        return `<p>1. ${base}: ${fx('f = ' + impsHTML(r.solutions[0], vars, kind))}</p>
          <p>2. Dvojitá negácia a De Morgan: ${kind === 'dnf' ? 'súčet súčinov → NAND z NAND-ov jednotlivých súčinov' : 'súčin súčtov → NOR z NOR-ov jednotlivých súčtov'}. Jednopísmenový člen ide do výstupného hradla <b>negovaný</b>${neg ? '' : `, negácia premennej = X ${arrow} X`}.</p>
          <p>3. ${name}: ${fx('f = ' + astHTML(ref))} &nbsp;<span class="badge">${refCost.gates} hradiel</span></p>`;
      },
      summary: { prompt: `${g} realizácia ${dNotation(f.ones)} (${n} prem.)`, correct: astText(ref) },
      given: () => inp.value,
    };
  };
}

function genAnalyzeUniversal({ level, settings }) {
  const kind = pick(['dnf', 'knf']);
  const n = level === 1 ? 2 : 3;
  const vars = varNames(n);
  const f = niceFn(n, { minTerms: 2, maxTerms: level === 3 ? 3 : 2, kind });
  const r = kind === 'dnf' ? B.minimize(n, f.ones) : B.minimizeKNF(n, f.ones);
  const ast = buildUniversal(r.solutions[0], vars, kind, false);
  const inp = exprInput({ label: 'f', vars });
  return {
    el: h('div', h('p', { html: `Aká funkcia je realizovaná obvodom ${fx('f = ' + astHTML(ast))}? Zapíš ju ako <b>MDNF</b>.` }), inp.el, syntaxHelp()),
    check: () => judgeMinimal(inp.value, vars, f.ones, [], 'dnf'),
    solution() {
      const md = B.minimize(n, f.ones);
      return `<p>Postupuj od vstupov: ${kind === 'dnf' ? 'A ↑ A = <span class="ov">A</span>, NAND = negovaný súčin, vonkajší NAND z negovaných súčinov = súčet súčinov (De Morgan).' : 'A ↓ A = <span class="ov">A</span>, NOR = negovaný súčet, vonkajší NOR z negovaných súčtov = súčin súčtov.'}</p><p>${fx('f = ' + impsHTML(md.solutions[0], vars))}</p>`;
    },
    summary: { prompt: 'analýza ' + astText(ast), correct: B.solutionText(B.minimize(n, f.ones).solutions[0], vars) },
    given: () => inp.value,
  };
}

export default {
  id: 'nandnor', title: 'NAND a NOR formy', icon: '⊼',
  desc: 'SNF (NAND/NAND), PNF (NOR/NOR), analýza obvodov z univerzálnych hradiel',
  intro: 'Šípky ↑ (NAND) a ↓ (NOR) nie sú asociatívne, preto vždy používaj zátvorky. Funguje aj zápis nand(A, B, C) pre viacvstupové hradlo.',
  modes: [
    { id: 'nand', label: 'Iba NAND (SNF)', levels: true, gen: genRealize('dnf') },
    { id: 'nor', label: 'Iba NOR (PNF)', levels: true, gen: genRealize('knf') },
    { id: 'analyza', label: 'Analýza NAND/NOR obvodu', levels: true, gen: genAnalyzeUniversal },
  ],
};
