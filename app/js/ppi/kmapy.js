// Karnaughove mapy: MDNF, MKNF, vyplnenie mapy, bezhazardné formy, vlastná funkcia
import { h, mount, esc, pick, rint, toast } from '../core/ui.js';
import * as B from '../lib/boolean.js';
import * as M from '../lib/multi.js';
import { varNames, varHTML, fx, fnHead, kmap, valuesFrom, cubeOf, truthTable, exprInput, syntaxHelp, judgeMinimal, impsHTML,
  dNotation, zerosOf, niceFn, randomExpr, astHTML, onesOf, COLORS, bitsOf } from './common.js';

// Pracovná K-mapa: vypĺňanie hodnôt a kreslenie slučiek, ktoré skladajú výraz
export function kmapWorkbench(n, vars, { values, locked = false, kind = 'dnf', exprTarget = null, label = 'f' } = {}) {
  const vals = values ? [...values] : Array(1 << n).fill('');
  let loops = [];
  let mode = locked ? 'loops' : 'fill';
  const chips = h('div.loops');
  const info = h('div.small.muted');
  const km = kmap(n, vars, vals, { interactive: locked ? 'select' : 'cycle', onChange: () => {}, onSelect: () => {} });
  const wrap = h('div');
  const modeBtns = locked ? null : h('div.seg',
    h('button.small', { class: 'active', onclick: (e) => setMode('fill', e.target) }, '✎ Vypĺňať'),
    h('button.small', { onclick: (e) => setMode('loops', e.target) }, '◯ Kresliť slučky'));
  function setMode(m, btn) {
    mode = m;
    [...modeBtns.children].forEach(b => b.classList.toggle('active', b === btn));
    const fresh = kmap(n, vars, km.values, { interactive: m === 'fill' ? 'cycle' : 'select' });
    Object.assign(km, fresh);
    mount(mapBox, fresh.el);
    fresh.setMarks(loops.map((l, i) => ({ imp: l, color: COLORS[i % COLORS.length] })));
    addBtn.classList.toggle('hidden', m !== 'loops');
    info.innerHTML = m === 'fill' ? 'Klikni na políčko: 0 → 1 → X. DE číslo je v rohu.' : 'Ťahaj alebo klikaj po políčkach a potom „Pridať slučku“. Slučka môže ísť cez okraj mapy.';
  }
  const mapBox = h('div', km.el);
  const addBtn = h('button.small', { class: locked ? '' : 'hidden', onclick: addLoop }, '+ Pridať slučku');
  function addLoop() {
    const sel = km.selection();
    const cube = cubeOf(sel, n);
    if (!cube) { toast(sel.length ? `Výber ${sel.length} políčok nie je pravidelná konfigurácia (obdĺžnik 1, 2, 4, 8… susedných políčok).` : 'Najprv vyber políčka.', 'bad'); return; }
    const forbidden = kind === 'dnf' ? '0' : '1';
    const cur = km.values;
    if (sel.some(i => cur[i] === forbidden)) { toast(`Slučka obsahuje ${forbidden === '0' ? 'nulu' : 'jednotku'} – pri ${kind === 'dnf' ? 'MDNF pokrývame iba 1 a X' : 'MKNF pokrývame iba 0 a X'}.`, 'bad'); return; }
    if (loops.includes(cube)) { toast('Táto slučka už je.', ''); km.clearSelection(); return; }
    loops.push(cube); km.clearSelection(); renderLoops();
  }
  function renderLoops() {
    mount(chips, loops.map((l, i) => h('span.loop-chip', { style: { '--c': COLORS[i % COLORS.length] } },
      h('span', { html: impsHTML([l], vars, kind) }),
      h('button.ghost.small', { title: 'Odstrániť', onclick: () => { loops.splice(i, 1); renderLoops(); } }, '×'))));
    km.setMarks(loops.map((l, i) => ({ imp: l, color: COLORS[i % COLORS.length] })));
    if (exprTarget) {
      const txt = loops.length ? B.termsToText(loops.map(p => B.impToTerm(p, vars, kind)), kind) : '';
      if (!exprTarget.value.trim() || exprTarget.value === exprTarget._auto) { exprTarget.value = txt; exprTarget._auto = txt; }
    }
  }
  wrap.append(h('div.row', { style: { marginBottom: '6px' } }, modeBtns, addBtn, loops.length ? null : null), mapBox, chips, info);
  info.innerHTML = locked ? 'Ťahaj alebo klikaj po políčkach a potom „Pridať slučku“. Slučka môže ísť cez okraj mapy.' : 'Klikni na políčko: 0 → 1 → X. Potom prepni na „Kresliť slučky“.';
  return {
    el: wrap,
    values: () => km.values,
    loops: () => loops,
    setWrong: (w) => km.setWrong(w),
    show(imps) { loops = [...imps]; renderLoops(); },
  };
}

function solutionView(n, vars, ones, dcs, kind) {
  const r = kind === 'dnf' ? B.minimize(n, ones, dcs) : B.minimizeKNF(n, ones, dcs);
  const km = kmap(n, vars, valuesFrom(n, ones, dcs), {});
  const sol = r.solutions[0];
  km.setMarks(sol.map((imp, i) => ({ imp, color: COLORS[i % COLORS.length] })));
  const name = kind === 'dnf' ? 'MDNF' : 'MKNF';
  const primes = r.primes.map(p => `${fx(impsHTML([p], vars, kind))}${r.essential?.includes(p) ? ' <span class="badge ok">podstatný</span>' : ''}`).join(', ');
  return h('div',
    h('div.row.top', km.el, h('div', { style: { maxWidth: '460px' } },
      h('p', { html: `${name}: ${fx(label(kind) + ' = ' + impsHTML(sol, vars, kind))}` }),
      h('div.loops', sol.map((imp, i) => h('span.loop-chip', { style: { '--c': COLORS[i % COLORS.length], paddingRight: '10px' }, html: impsHTML([imp], vars, kind) }))),
      r.solutions.length > 1 ? h('p.small', { html: `Ďalšie rovnocenné riešenia: ${r.solutions.slice(1, 4).map(s => fx(impsHTML(s, vars, kind))).join(', ')}` }) : null,
      h('p.small.muted', { html: `${kind === 'dnf' ? 'Prosté implikanty' : 'Prosté implicenty'}: ${primes}` }),
      h('p.small.muted', { html: kind === 'dnf' ? 'Postup: najprv slučky, ktoré sú pre niektorú jednotku jediné možné (podstatné), potom čo najmenej čo najväčších slučiek na zvyšok. X použi iba vtedy, keď slučku zväčší.' : 'MKNF: pokrývame nuly. Premenná, ktorá má v slučke hodnotu 0, je v súčte priamo, hodnota 1 → negovaná.' }))));
}
const label = (kind) => 'f';

function presentFn(n, vars, ones, dcs, fmt) {
  const zeros = zerosOf(n, ones, dcs);
  if (fmt === 'D') return h('p', { html: `${fx(fnHead('f', vars))} = ${dNotation(ones, dcs)}` + (dcs.length ? ' <span class="muted small">(v { } sú body, kde na hodnote nezáleží – X)</span>' : '') });
  if (fmt === 'K') return h('p', { html: `${fx(fnHead('f', vars))} = ${dNotation(zeros, dcs, 'K')} <span class="muted small">(K = body, kde je funkcia 0)</span>` });
  if (fmt === 'table') {
    const v = valuesFrom(n, ones, dcs);
    return h('div', h('p', 'Funkcia je daná pravdivostnou tabuľkou:'), truthTable(vars, [{ name: 'f', values: v }], { compact: true }).el);
  }
  return null; // 'map' → hodnoty sú priamo v mape
}

function genMinimal(kind) {
  return ({ level }) => {
    const n = level === 1 ? 3 : level === 2 ? 4 : pick([4, 4, 5]);
    const vars = varNames(n);
    const dcRate = level === 1 ? 0 : level === 2 ? (Math.random() < 0.5 ? 0.12 : 0) : 0.12;
    const f = niceFn(n, { minTerms: 2, maxTerms: n === 5 ? 4 : 4, dc: dcRate, kind });
    const fmt = level === 1 ? pick(['map', 'map', 'D']) : pick(['map', 'D', 'K', 'table', 'D']);
    const values = valuesFrom(n, f.ones, f.dcs);
    const inp = exprInput({ label: 'f', vars, placeholder: kind === 'dnf' ? 'napr. AB + !CD' : 'napr. (A + B)(!C + D)' });
    const wb = kmapWorkbench(n, vars, { values: fmt === 'map' ? values : null, locked: fmt === 'map', kind, exprTarget: inp });
    return {
      el: h('div',
        h('p', { html: `Nájdi <b>${kind === 'dnf' ? 'minimálnu DNF (MDNF)' : 'minimálnu KNF (MKNF)'}</b> funkcie${fmt === 'map' ? ' danej Karnaughovou mapou' : ''}.` }),
        presentFn(n, vars, f.ones, f.dcs, fmt),
        h('div.row.top', { style: { gap: '24px', marginTop: '8px' } }, wb.el,
          h('div', { style: { flex: 1, minWidth: '280px' } }, h('p.small.muted', fmt === 'map' ? 'Zakresli slučky – výraz sa poskladá sám. Alebo ho napíš ručne.' : 'Mapu si môžeš vyplniť ako pomôcku (nekontroluje sa).'), inp.el, syntaxHelp()))),
      check() {
        const r = judgeMinimal(inp.value, vars, f.ones, f.dcs, kind);
        if (r.wrong) wb.setWrong(r.wrong);
        return r;
      },
      solution: () => solutionView(n, vars, f.ones, f.dcs, kind),
      summary: { prompt: `${kind === 'dnf' ? 'MDNF' : 'MKNF'} pre ${dNotation(f.ones, f.dcs)} (${n} prem.)`, correct: B.solutionText((kind === 'dnf' ? B.minimize : B.minimizeKNF)(n, f.ones, f.dcs).solutions[0], vars, kind) },
      given: () => inp.value,
    };
  };
}

function genVypln({ level }) {
  const n = level === 1 ? 3 : 4;
  const vars = varNames(n);
  const useExpr = Math.random() < 0.5;
  let ones, dcs = [], prompt;
  if (useExpr) {
    let ast;
    do { ast = randomExpr(vars, level === 1 ? 2 : 3); ones = onesOf(ast, vars); } while (ones.length < 2 || ones.length > (1 << n) - 2);
    prompt = `Vyplň Karnaughovu mapu funkcie ${fx('f = ' + astHTML(ast))}`;
  } else {
    const f = niceFn(n, { dc: level === 3 ? 0.15 : 0 });
    ones = f.ones; dcs = f.dcs;
    prompt = Math.random() < 0.5 ? `Vyplň mapu funkcie ${dNotation(ones, dcs)}.` : `Vyplň mapu funkcie ${dNotation(zerosOf(n, ones, dcs), dcs, 'K')} (K = nuly, ostatné sú 1).`;
  }
  const target = valuesFrom(n, ones, dcs);
  const vals = Array(1 << n).fill('0');
  const km = kmap(n, vars, vals, { interactive: 'cycle', allowX: dcs.length > 0 });
  return {
    el: h('div', h('p', { html: prompt }), h('p.small.muted', 'Klikni na políčko: 0 → 1' + (dcs.length ? ' → X' : '') + '. Všímaj si DE čísla v rohu a poradie stĺpcov.'), km.el),
    check() {
      const wrong = target.map((v, i) => (vals[i] || '0') !== v ? i : -1).filter(i => i >= 0);
      km.setWrong(wrong);
      return { ok: !wrong.length, score: 1 - wrong.length / target.length, feedback: wrong.length ? `Zle vyplnené políčka (DE): ${wrong.join(', ')}.` : '', correct: dNotation(ones, dcs) };
    },
    solution() { return kmap(n, vars, target, {}).el; },
    summary: { prompt: 'vyplň mapu: ' + prompt.replace(/<[^>]+>/g, ''), correct: dNotation(ones, dcs) },
  };
}

function genHazard({ level }) {
  const n = level === 1 ? 3 : 4;
  const vars = varNames(n);
  const kind = level === 3 && Math.random() < 0.5 ? 'knf' : 'dnf';
  let f, hf, mm;
  for (let i = 0; i < 300; i++) {
    f = niceFn(n, { minTerms: 2, maxTerms: 4, kind });
    hf = M.hazardFree(n, f.ones, f.dcs, kind);
    mm = kind === 'dnf' ? B.minimize(n, f.ones, f.dcs) : B.minimizeKNF(n, f.ones, f.dcs);
    if (hf.terms > mm.terms) break; // aby bezhazardná forma bola iná ako minimálna
  }
  const inp = exprInput({ label: 'f', vars });
  const wb = kmapWorkbench(n, vars, { values: valuesFrom(n, f.ones, f.dcs), locked: true, kind, exprTarget: inp });
  return {
    el: h('div', h('p', { html: `Nájdi <b>bezhazardnú ${kind === 'dnf' ? 'DNF' : 'KNF'}</b> s čo najmenším počtom členov. Každá dvojica susedných ${kind === 'dnf' ? 'jednotiek' : 'núl'} musí ležať v spoločnej slučke.` }),
      h('div.row.top', { style: { gap: '24px' } }, wb.el, h('div', { style: { flex: 1, minWidth: '280px' } }, inp.el, syntaxHelp()))),
    check() {
      let ast; try { ast = B.parse(inp.value); } catch (e) { return { incomplete: true, feedback: esc(e.message) }; }
      let cmp; try { cmp = B.compareWith(ast, vars, f.ones, f.dcs); } catch (e) { return { incomplete: true, feedback: esc(e.message) }; }
      const refHTML = fx(impsHTML(hf.solutions[0], vars, kind));
      if (!cmp.ok) return { ok: false, feedback: 'Výraz nie je ekvivalentný s funkciou. Bezhazardná forma: ' + refHTML, correct: refHTML };
      const terms = kind === 'dnf' ? B.asDNF(ast) : B.asKNF(ast);
      if (!terms) return { ok: false, feedback: `Výraz nie je v tvare ${kind.toUpperCase()}.`, correct: refHTML };
      // člen → implikant
      const imps = terms.map(t => { let s = Array(n).fill('-'); t.forEach(l => { const neg = l.startsWith('!'); const k = vars.indexOf(l.replace('!', '')); s[k] = kind === 'dnf' ? (neg ? '0' : '1') : (neg ? '1' : '0'); }); return s.join(''); });
      const un = M.uncoveredPairs(imps, hf.pairs);
      if (un.length) return { ok: false, score: .4, feedback: `Hazard zostal medzi susednými bodmi ${un.slice(0, 4).map(p => `${p[0]}–${p[1]}`).join(', ')} (DE). Pridaj člen, ktorý ich pokryje spolu. Riešenie: ${refHTML}`, correct: refHTML };
      if (terms.length > hf.terms) return { ok: false, score: .7, feedback: `Bez hazardov, ale s ${terms.length} členmi – dá sa s ${hf.terms}: ${refHTML}`, correct: refHTML };
      return { ok: true, feedback: `Minimálna forma by bola ${fx(impsHTML(mm.solutions[0], vars, kind))}; bezhazardná pridáva prekrývajúce slučky.` };
    },
    solution() {
      const km = kmap(n, vars, valuesFrom(n, f.ones, f.dcs), {});
      km.setMarks(hf.solutions[0].map((imp, i) => ({ imp, color: COLORS[i % COLORS.length] })));
      return h('div.row.top', km.el, h('div', h('p', { html: `Bezhazardná ${kind.toUpperCase()}: ${fx('f = ' + impsHTML(hf.solutions[0], vars, kind))}` }),
        h('p.small.muted', { html: `Minimálna: ${fx(impsHTML(mm.solutions[0], vars, kind))}. Statický hazard vzniká pri zmene jednej premennej medzi dvoma susednými ${kind === 'dnf' ? 'jednotkami' : 'nulami'}, ktoré nie sú v spoločnej slučke – preto pridávame „premosťujúce“ členy.` })));
    },
    summary: { prompt: `bezhazardná ${kind.toUpperCase()} pre ${dNotation(f.ones, f.dcs)}`, correct: B.solutionText(hf.solutions[0], vars, kind) },
    given: () => inp.value,
  };
}

// vlastná funkcia – iba kontrola vlastného riešenia (bez prezradenia výsledku)
function genVlastna() {
  const nSel = h('select', [3, 4, 5].map(k => h('option', { value: k, selected: k === 4 }, k + ' premenné')));
  const kindSel = h('select', h('option', { value: 'dnf' }, 'MDNF'), h('option', { value: 'knf' }, 'MKNF'));
  const onesIn = h('input.mono', { placeholder: 'napr. 0, 2, 5, 7, 8', style: { width: '18em' } });
  const dcIn = h('input.mono', { placeholder: 'napr. 10, 11 (nepovinné)', style: { width: '14em' } });
  const inp = exprInput({ label: 'f' });
  const parseList = (s, N) => s.split(/[^0-9]+/).filter(Boolean).map(Number).filter(x => x < N);
  return {
    noSolution: true,
    el: h('div', h('p', 'Zadaj vlastnú funkciu (napr. z knihy alebo z cvičenia) a svoje riešenie. Program povie, či je správne a minimálne. Výsledok neprezradí – ak sa mýliš, ukáže iba, v ktorých bodoch.'),
      h('div.row', nSel, kindSel), h('div.row', h('span', 'D (jednotky):'), onesIn, h('span', 'X:'), dcIn), h('div', { style: { marginTop: '10px' } }, inp.el), syntaxHelp()),
    check() {
      const n = Number(nSel.value), N = 1 << n, vars = varNames(n);
      const ones = parseList(onesIn.value, N), dcs = parseList(dcIn.value, N).filter(x => !ones.includes(x));
      if (!ones.length) return { incomplete: true, feedback: 'Zadaj body, kde je funkcia 1.' };
      const r = B.checkMinimalForm(inp.value, vars, ones, dcs, kindSel.value);
      if (r.status === 'parse') return { incomplete: true, feedback: esc(r.msg) };
      if (r.status === 'wrong') return { ok: false, feedback: `Výraz sa líši od funkcie v bodoch (DE): ${r.wrong.join(', ')}.` };
      if (r.status === 'notform') return { ok: false, feedback: esc(r.msg) };
      if (r.status === 'notmin') return { ok: false, score: .5, feedback: `Správne, ale nie minimálne: máš ${r.terms} členov / ${r.literals} literálov, minimum je ${r.ref.terms} / ${r.ref.literals}.` };
      return { ok: true, feedback: 'Správne a minimálne.' };
    },
    solution: () => '',
    summary: { prompt: 'vlastná funkcia' },
  };
}

export default {
  id: 'kmapy', title: 'Karnaughove mapy', icon: '▦',
  desc: 'MDNF, MKNF, vyplnenie mapy, bezhazardné formy, 3–5 premenných',
  intro: 'Poradie stĺpcov (zošit 00 01 11 10 alebo prednáška 00 10 11 01 s pruhmi) a názvy premenných zmeníš v Nastaveniach.',
  modes: [
    { id: 'mdnf', label: 'MDNF', levels: true, gen: genMinimal('dnf') },
    { id: 'mknf', label: 'MKNF', levels: true, gen: genMinimal('knf') },
    { id: 'vypln', label: 'Vyplň mapu', levels: true, gen: genVypln },
    { id: 'hazard', label: 'Bezhazardná forma', levels: true, gen: genHazard },
    { id: 'vlastna', label: 'Vlastná funkcia (kontrola)', gen: genVlastna },
  ],
};
