// Skupinová minimalizácia viacerých funkcií a hodnotenie obvodov podľa pravidiel z cvičení PPI:
//   1. počet logických členov vrátane NOT, 2. súčet vstupov všetkých členov, 3. počet literálov.
// Spoločné členy sa realizujú iba raz, pevný výstup 0/1 nepotrebuje hradlo.
import { primeImplicants, covers, impToTerm, termsToText, minimize } from './boolean.js';

const sortKey = (lits) => [...lits].sort().join('·');

// outputs: [{ terms: [[lit...]...] }] – DNF (terms = súčiny) alebo KNF (terms = súčty)
// constant: true pri pevnom výstupe
export function circuitCost(outputs, kind = 'dnf') {
  const negs = new Set();
  const inner = new Map(); // kľúč člena → počet literálov (iba členy s ≥ 2 literálmi potrebujú hradlo)
  const distinct = new Map();
  let outer = 0, outerInputs = 0;
  for (const o of outputs) {
    if (o.constant) continue;
    for (const t of o.terms) {
      t.forEach(l => { if (l.startsWith('!')) negs.add(l); });
      const k = sortKey(t);
      distinct.set(k, t.length);
      if (t.length >= 2) inner.set(k, t.length);
    }
    if (o.terms.length >= 2) { outer++; outerInputs += o.terms.length; }
  }
  let innerInputs = 0; for (const v of inner.values()) innerInputs += v;
  let literals = 0; for (const v of distinct.values()) literals += v;
  return {
    gates: negs.size + inner.size + outer,
    inputs: negs.size + innerInputs + outerInputs,
    literals,
    detail: { not: negs.size, inner: inner.size, outer, shared: sharedCount(outputs) },
    kind,
  };
}

function sharedCount(outputs) {
  const use = new Map();
  outputs.forEach(o => { if (!o.constant) new Set(o.terms.map(sortKey)).forEach(k => use.set(k, (use.get(k) || 0) + 1)); });
  return [...use.values()].filter(v => v > 1).length;
}

// porovnanie podľa kritérií; vráti záporné číslo, ak je a lepšie
export function compareCost(a, b) {
  return (a.gates - b.gates) || (a.inputs - b.inputs) || (a.literals - b.literals);
}
export function decidingCriterion(a, b) {
  if (a.gates !== b.gates) return 'počet členov (vrátane NOT)';
  if (a.inputs !== b.inputs) return 'súčet vstupov';
  if (a.literals !== b.literals) return 'počet literálov';
  return null;
}

// funcs: [{ ones, dcs }] nad n premennými; kind 'dnf' (pokrývame jednotky) alebo 'knf' (nuly)
export function groupMinimize(n, funcs, kind = 'dnf', { limit = 400000 } = {}) {
  const N = 1 << n;
  // pre KNF pracujeme s nulami ako s „jednotkami“ doplnku
  const F = funcs.map(f => {
    const one = new Set(f.ones), dc = new Set(f.dcs || []);
    const on = [];
    for (let i = 0; i < N; i++) {
      if (dc.has(i)) continue;
      if (kind === 'dnf' ? one.has(i) : !one.has(i)) on.push(i);
    }
    const allowed = new Set([...on, ...dc]);
    return { on, dcs: [...dc], allowed, constant: on.length === 0 ? 'zero' : allowed.size === N ? 'full' : null };
  });

  // viacvýstupové prosté implikanty: prosté implikanty súčinov všetkých podmnožín funkcií
  const cand = new Map();
  const active = F.map((f, i) => i).filter(i => !F[i].constant);
  for (let mask = 1; mask < (1 << active.length); mask++) {
    const S = active.filter((_, k) => mask >> k & 1);
    const inter = [];
    for (let i = 0; i < N; i++) if (S.every(j => F[j].allowed.has(i))) inter.push(i);
    const ones = inter.filter(i => S.some(j => F[j].on.includes(i)));
    if (!ones.length) continue;
    const dcs = inter.filter(i => !ones.includes(i));
    for (const p of primeImplicants(n, ones, dcs)) {
      if (cand.has(p)) continue;
      const tag = active.filter(j => [...Array(N).keys()].filter(i => covers(p, i)).every(i => F[j].allowed.has(i)));
      cand.set(p, tag);
    }
  }
  const C = [...cand.keys()];

  // nepredĺžiteľné pokrytia pre každý výstup
  let capped = false;
  const coversFor = active.map(j => {
    const list = irredundantCovers(F[j].on, C.filter(p => cand.get(p).includes(j)), 3000);
    if (list.length >= 3000) capped = true;
    return list;
  });
  const literalsOf = (imp) => [...imp].filter(c => c !== '-').length;
  // predspracovanie pokrytí: kľúče členov, negované premenné (bitová maska), vonkajšie hradlo
  const negMaskOf = (imp) => { let m = 0; [...imp].forEach((c, i) => { if (c === (kind === 'dnf' ? '0' : '1')) m |= 1 << i; }); return m; };
  const prep = coversFor.map(list => list.map(cv => ({
    imps: cv,
    neg: cv.reduce((m, p) => m | negMaskOf(p), 0),
    outer: cv.length >= 2 ? 1 : 0,
    outerIn: cv.length >= 2 ? cv.length : 0,
  })).sort((a, b) => a.imps.length - b.imps.length || a.imps.reduce((s, p) => s + literalsOf(p), 0) - b.imps.reduce((s, p) => s + literalsOf(p), 0)));
  const pop = (m) => { let c = 0; for (; m; m &= m - 1) c++; return c; };

  let best = null, bestCost = null, visits = 0, exhaustive = !capped;
  const LIMIT = limit * 5;
  const pick = new Array(active.length);
  const used = new Map(); // člen → počet použití
  const rec = (k, neg, outer, outerIn) => {
    if (++visits > LIMIT) { exhaustive = false; return; }
    // aktuálna (čiastočná) cena – všetky tri kritériá sú monotónne, preto môžeme orezávať
    let inner = 0, innerIn = 0, lits = 0;
    for (const [p] of used) { const l = literalsOf(p); lits += l; if (l >= 2) { inner++; innerIn += l; } }
    const cost = { gates: pop(neg) + inner + outer, inputs: pop(neg) + innerIn + outerIn, literals: lits };
    if (bestCost && compareCost(cost, bestCost) >= 0) return;
    if (k === active.length) { bestCost = cost; best = pick.map(x => x); return; }
    for (const cv of prep[k]) {
      pick[k] = cv.imps;
      cv.imps.forEach(p => used.set(p, (used.get(p) || 0) + 1));
      rec(k + 1, neg | cv.neg, outer + cv.outer, outerIn + cv.outerIn);
      cv.imps.forEach(p => { const c = used.get(p) - 1; if (c) used.set(p, c); else used.delete(p); });
      if (visits > LIMIT) break;
    }
  };
  if (prep.every(l => l.length)) rec(0, 0, 0, 0);
  if (!best) {
    best = active.map(j => minimize(n, F[j].on, F[j].dcs).solutions[0]);
    exhaustive = false;
  }
  const toOutputs = (choice) => F.map((f, j) => {
    if (f.constant) return { constant: true, terms: [] };
    return { terms: choice[active.indexOf(j)].map(p => impToTerm(p, Array.from({ length: n }, (_, i) => 'v' + i), kind)) };
  });
  bestCost = circuitCost(toOutputs(best), kind);
  return {
    candidates: C.map(p => ({ imp: p, tag: cand.get(p), literals: literalsOf(p) })),
    solution: F.map((f, j) => f.constant ? { constant: true, value: kind === 'dnf' ? (f.constant === 'full' ? 1 : 0) : (f.constant === 'full' ? 0 : 1) } : { imps: best[active.indexOf(j)] }),
    cost: bestCost,
    exhaustive,
  };
}

// všetky nepredĺžiteľné (irredundantné) pokrytia množiny on kandidátmi
export function irredundantCovers(on, cands, cap = 3000) {
  const res = new Map();
  const cov = cands.map(p => new Set(on.filter(m => covers(p, m))));
  const rec = (chosen, uncovered) => {
    if (res.size >= cap) return;
    if (!uncovered.length) {
      // odstráň nadbytočné
      const ok = chosen.every((c, k) => {
        const others = chosen.filter((_, i) => i !== k);
        return on.some(m => cov[c].has(m) && !others.some(o => cov[o].has(m)));
      });
      if (ok) { const key = [...chosen].sort((a, b) => a - b).join(','); if (!res.has(key)) res.set(key, chosen.map(c => cands[c])); }
      return;
    }
    const m = uncovered[0];
    for (let c = 0; c < cands.length; c++) {
      if (!cov[c].has(m) || chosen.includes(c)) continue;
      rec([...chosen, c], uncovered.filter(x => !cov[c].has(x)));
    }
  };
  rec([], [...on]);
  return [...res.values()];
}

export function solutionTexts(res, vars, kind = 'dnf') {
  return res.solution.map(o => o.constant ? String(o.value) : termsToText(o.imps.map(p => impToTerm(p, vars, kind)), kind));
}

// ---------- Bezhazardná forma ----------
// Každá dvojica susedných jednotiek (pri KNF núl) musí ležať v spoločnom člene.
export function hazardPairs(n, ones, dcs = [], kind = 'dnf') {
  const N = 1 << n, one = new Set(ones), dc = new Set(dcs);
  const target = [];
  for (let i = 0; i < N; i++) if (!dc.has(i) && (kind === 'dnf' ? one.has(i) : !one.has(i))) target.push(i);
  const T = new Set(target), pairs = [];
  for (const a of target) for (let b = 0; b < n; b++) { const c = a ^ (1 << b); if (c > a && T.has(c)) pairs.push([a, c]); }
  return { target, pairs };
}
export function hazardFree(n, ones, dcs = [], kind = 'dnf') {
  const { target, pairs } = hazardPairs(n, ones, dcs, kind);
  if (!target.length) return { solutions: [[]], terms: 0, literals: 0, pairs };
  const primes = primeImplicants(n, target, dcs);
  const elems = [...target.map(m => [m]), ...pairs];
  const cov = primes.map(p => elems.map((e, k) => e.every(m => covers(p, m)) ? k : -1).filter(k => k >= 0));
  const lit = (p) => [...p].filter(c => c !== '-').length;
  let best = [];
  for (let k = 1; k <= primes.length && !best.length; k++) {
    const combo = (start, chosen) => {
      if (chosen.length === k) {
        const c = new Set(chosen.flatMap(i => cov[i]));
        if (c.size === elems.length) best.push(chosen.map(i => primes[i]));
        return;
      }
      for (let i = start; i < primes.length; i++) combo(i + 1, [...chosen, i]);
    };
    combo(0, []);
  }
  const L = (s) => s.reduce((a, p) => a + lit(p), 0);
  const minL = Math.min(...best.map(L));
  const solutions = best.filter(s => L(s) === minL);
  return { solutions, terms: solutions[0].length, literals: minL, pairs };
}
// over, či zadané členy (implikanty ako reťazce 01-) pokrývajú všetky susedné dvojice
export function uncoveredPairs(imps, pairs) {
  return pairs.filter(pr => !imps.some(p => pr.every(m => covers(p, m))));
}
