import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../app/js/lib/boolean.js';
import * as M from '../app/js/lib/multi.js';

const V3 = ['A', 'B', 'C'];

test('šípky ↑ ↓ a počítanie hradiel', () => {
  const ast = B.parse('(A↑(B↑B))↑(C↑C)'); // A!B + C
  assert.ok(B.compareWith(ast, V3, [1, 3, 4, 5, 7]).ok);
  assert.deepEqual([...B.nodeTypes(ast)].sort(), ['nand', 'var']);
  assert.equal(B.countGates(ast).gates, 4);
  assert.throws(() => B.parse('A↑B↑C'), B.ParseError);
  const nor = B.parse('(A↓C)↓((B↓B)↓C)'); // (A+C)(!B+C)
  assert.ok(B.compareWith(nor, V3, [1, 3, 4, 5, 7]).ok);
});

test('circuitCost podľa pravidiel cvičenia (úloha 1: chodbové svetlo)', () => {
  // L = R + MD: AND + OR = 2 členy
  const dnf = M.circuitCost([{ terms: [['R'], ['M', 'D']] }]);
  assert.equal(dnf.gates, 2);
  // L = (R+M)(R+D): 2× OR + AND = 3 členy
  const knf = M.circuitCost([{ terms: [['R', 'M'], ['R', 'D']] }], 'knf');
  assert.equal(knf.gates, 3);
  assert.equal(M.decidingCriterion(dnf, knf), 'počet členov (vrátane NOT)');
});

test('úloha 7 z CV3: spoločný člen a pevné výstupy', () => {
  // F = AB + !AC, G = A!B + !AC, H = 1, K = 0
  const F = { ones: [1, 3, 6, 7] }, G = { ones: [1, 3, 4, 5] }, H = { ones: [0, 1, 2, 3, 4, 5, 6, 7] }, K = { ones: [] };
  const r = M.groupMinimize(3, [F, G, H, K]);
  const texts = M.solutionTexts(r, V3);
  assert.equal(texts[2], '1');
  assert.equal(texts[3], '0');
  // !AC je zdieľaný: členy AB, A!B, !AC (3 AND) + 2 OR + NOT A, NOT B = 7
  assert.equal(r.cost.gates, 7);
  for (const [i, f] of [F, G].entries()) assert.ok(B.compareWith(B.parse(texts[i]), V3, f.ones).ok);
});

test('skupinová minimalizácia nie je horšia ako samostatná (náhodné funkcie)', () => {
  const V = ['A', 'B', 'C', 'D'];
  for (let k = 0; k < 40; k++) {
    const funcs = [0, 1, 2].map(() => {
      const ones = [], dcs = [];
      for (let i = 0; i < 16; i++) { const r = Math.random(); if (r < 0.45) ones.push(i); else if (r < 0.55) dcs.push(i); }
      return { ones, dcs };
    });
    for (const kind of ['dnf', 'knf']) {
      const r = M.groupMinimize(4, funcs, kind);
      const texts = M.solutionTexts(r, V, kind);
      texts.forEach((t, i) => assert.ok(B.compareWith(B.parse(t), V, funcs[i].ones, funcs[i].dcs).ok, kind + ' ' + t + ' ' + JSON.stringify(funcs[i])));
      const sep = funcs.map(f => {
        const m = kind === 'dnf' ? B.minimize(4, f.ones, f.dcs) : B.minimizeKNF(4, f.ones, f.dcs);
        const zeroOrFull = kind === 'dnf' ? f.ones.length === 0 : f.ones.length + f.dcs.length === 16;
        const allDc = kind === 'dnf' ? f.ones.length + f.dcs.length === 16 : f.ones.length === 0;
        if (zeroOrFull || allDc) return { constant: true, terms: [] };
        return { terms: m.solutions[0].map(p => B.impToTerm(p, V, kind)) };
      });
      if (r.exhaustive) assert.ok(M.compareCost(r.cost, M.circuitCost(sep, kind)) <= 0);
    }
  }
});

test('bezhazardná forma pokrýva všetky susedné dvojice', () => {
  // f = A!B + BC má hazard medzi 101 a 111; bezhazardná pridá AC
  const ones = [3, 4, 5, 7];
  const r = M.hazardFree(3, ones);
  assert.equal(r.terms, 3);
  assert.equal(M.uncoveredPairs(r.solutions[0], r.pairs).length, 0);
  const plain = B.minimize(3, ones);
  assert.ok(M.uncoveredPairs(plain.solutions[0], r.pairs).length > 0);
});
