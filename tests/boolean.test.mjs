import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../app/js/lib/boolean.js';

const V3 = ['A', 'B', 'C'];

test('parser: rôzne zápisy negácie a súčinu', () => {
  for (const s of ["A!B + C", "a~b+c", "a¬b|c", "AB' + C", "A*!B + C", "A.(!B) + C", "A & !B | C"]) {
    assert.deepEqual(B.truthVector(B.parse(s), V3), B.truthVector(B.parse('A!B+C'), V3), s);
  }
});

test('parser: funkcie nand/nor a zátvorky', () => {
  const nandAnd = B.parse('nand(nand(A,B),nand(A,B))'); // = AB
  assert.deepEqual(B.truthVector(nandAnd, ['A', 'B']), [0, 0, 0, 1]);
  const nor = B.parse('nor(A,B)');
  assert.deepEqual(B.truthVector(nor, ['A', 'B']), [1, 0, 0, 0]);
  assert.deepEqual(B.truthVector(B.parse('(A+B)(A+!B)'), ['A', 'B']), [0, 0, 1, 1]);
});

test('parser: chyby', () => {
  assert.throws(() => B.parse('A + '), B.ParseError);
  assert.throws(() => B.parse('A $ B'), B.ParseError);
  assert.throws(() => B.parse('(A+B'), B.ParseError);
  assert.throws(() => B.truthVector(B.parse('A+E'), V3), B.ParseError);
});

test('premenné s číslami (q1, x)', () => {
  const ast = B.parse('q1!q2 + x');
  assert.deepEqual([...B.varsOf(ast)].sort(), ['Q1', 'Q2', 'X']);
});

test('QM: klasický príklad f = Σm(0,1,2,5,6,7)', () => {
  const r = B.minimize(3, [0, 1, 2, 5, 6, 7]);
  assert.equal(r.terms, 3);
  assert.equal(r.literals, 6);
  assert.equal(r.solutions.length, 2); // cyklický prípad má dve minimálne pokrytia
});

test('QM s don\'t care', () => {
  // f = Σm(1,3,7,11,15) + d(0,2,5)  → CD + A'B' (alebo ekvivalent)
  const r = B.minimize(4, [1, 3, 7, 11, 15], [0, 2, 5]);
  assert.equal(r.terms, 2);
  for (const sol of r.solutions) {
    const ast = B.parse(B.solutionText(sol, ['A', 'B', 'C', 'D']));
    assert.ok(B.compareWith(ast, ['A', 'B', 'C', 'D'], [1, 3, 7, 11, 15], [0, 2, 5]).ok);
  }
});

test('náhodné funkcie: riešenie QM je vždy ekvivalentné (DNF aj KNF)', () => {
  const V = ['A', 'B', 'C', 'D'];
  for (let k = 0; k < 300; k++) {
    const ones = [], dcs = [];
    for (let i = 0; i < 16; i++) { const r = Math.random(); if (r < 0.4) ones.push(i); else if (r < 0.5) dcs.push(i); }
    const d = B.minimize(4, ones, dcs);
    const dAst = B.parse(B.solutionText(d.solutions[0], V, 'dnf'));
    assert.ok(B.compareWith(dAst, V, ones, dcs).ok, 'DNF ' + JSON.stringify({ ones, dcs }));
    const kn = B.minimizeKNF(4, ones, dcs);
    const kAst = B.parse(B.solutionText(kn.solutions[0], V, 'knf'));
    assert.ok(B.compareWith(kAst, V, ones, dcs).ok, 'KNF ' + JSON.stringify({ ones, dcs }));
  }
});

test('QM minimalita overená hrubou silou pre 3 premenné', () => {
  // porovná počet členov s exhaustívnym hľadaním medzi všetkými 27 možnými súčinmi
  const all = [];
  const rec = (s) => { if (s.length === 3) { all.push(s); return; } for (const c of '01-') rec(s + c); };
  rec('');
  for (let f = 0; f < 256; f++) {
    const ones = []; for (let i = 0; i < 8; i++) if ((f >> i) & 1) ones.push(i);
    if (!ones.length) continue;
    const r = B.minimize(3, ones);
    const zeros = [0, 1, 2, 3, 4, 5, 6, 7].filter(i => !ones.includes(i));
    const valid = all.filter(t => !zeros.some(z => B.covers(t, z)));
    let best = Infinity;
    for (let k = 1; k <= 4 && best === Infinity; k++) {
      const comb = (start, chosen) => {
        if (chosen.length === k) { if (ones.every(o => chosen.some(t => B.covers(t, o)))) best = k; return; }
        for (let i = start; i < valid.length; i++) comb(i + 1, [...chosen, valid[i]]);
      };
      comb(0, []);
    }
    assert.equal(r.terms, best, 'f=' + f);
  }
});

test('checkMinimalForm: správne, neminimálne, zlé, zlý tvar', () => {
  const ones = [3, 5, 6, 7]; // väčšina: AB + AC + BC
  assert.equal(B.checkMinimalForm('AB + AC + BC', V3, ones, [], 'dnf').status, 'ok');
  assert.equal(B.checkMinimalForm('AB + AC + BC + ABC', V3, ones, [], 'dnf').status, 'notmin');
  assert.equal(B.checkMinimalForm('AB + AC', V3, ones, [], 'dnf').status, 'wrong');
  assert.equal(B.checkMinimalForm('A(B+C) + BC', V3, ones, [], 'dnf').status, 'notform');
  assert.equal(B.checkMinimalForm('(A+B)(A+C)(B+C)', V3, ones, [], 'knf').status, 'ok');
  assert.equal(B.checkMinimalForm('A +', V3, ones, [], 'dnf').status, 'parse');
});

test('gateStats', () => {
  const t = B.asDNF(B.parse('A!B + !AC + BC'));
  const g = B.gateStats(t);
  // NOT: !A, !B (2), AND: 3, OR: 1 → 6 hradiel; vstupy 2 + 6 + 3 = 11
  assert.equal(g.gates, 6);
  assert.equal(g.inputs, 11);
});
