import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../app/js/lib/automata.js';
import * as N from '../app/js/lib/numbers.js';

const rnd = (n) => Array.from({ length: n }, () => Math.random() < 0.5 ? 1 : 0);

test('detektor postupnosti (Moore aj Mealy) zodpovedá definícii', () => {
  for (const pat of ['10', '11', '101', '110', '1001', '0110', '111', '0101']) {
    const p = pat.split('').map(Number), m = p.length;
    const moore = A.sequenceDetector(pat, 'moore'), mealy = A.sequenceDetector(pat, 'mealy');
    for (let k = 0; k < 200; k++) {
      const inp = rnd(12);
      const mo = A.simulate(moore, inp).outputs, me = A.simulate(mealy, inp).outputs;
      inp.forEach((_, t) => {
        const ends = t + 1 >= m && inp.slice(t + 1 - m, t + 1).every((v, i) => v === p[i]) ? 1 : 0;
        assert.equal(me[t], ends, `mealy ${pat} ${inp}`);
        assert.equal(mo[t + 1], ends, `moore ${pat} ${inp}`);
      });
    }
    assert.equal(A.minimalStateCount(moore).minimal, m + 1);
    assert.equal(A.minimalStateCount(mealy).minimal, m);
  }
});

test('ekvivalencia a protipríklad', () => {
  const a = A.sequenceDetector('101', 'moore');
  const b = JSON.parse(JSON.stringify(a));
  assert.ok(A.equivalent(a, b).equal);
  b.out[3] = 0;
  const r = A.equivalent(a, b);
  assert.equal(r.equal, false);
  assert.deepEqual(r.counter, [1, 0, 1]);
});

test('automat s nadbytočným stavom je ekvivalentný, ale nie minimálny', () => {
  const par = A.parity(true);
  const big = { type: 'moore', states: ['A', 'B', 'C'], start: 0, next: [[0, 1], [1, 2], [2, 1]], out: [0, 1, 0] };
  assert.ok(A.equivalent(par, big).equal);
  assert.equal(A.minimalStateCount(big).minimal, 2);
});

test('klopné obvody', () => {
  assert.equal(A.ffNext('JK', 1, { j: 1, k: 1 }), 0);
  assert.equal(A.ffNext('JK', 0, { j: 0, k: 1 }), 0);
  assert.equal(A.ffNext('T', 1, { t: 1 }), 0);
  assert.equal(A.ffNext('SR', 0, { s: 1, r: 1 }), null);
  // inverzná prechodová funkcia je konzistentná s ffNext
  for (const type of ['D', 'T', 'JK', 'SR']) for (const q of [0, 1]) for (const qn of [0, 1]) {
    const ex = A.ffExcitation(type, q, qn);
    const keys = Object.keys(ex);
    const combos = [{}];
    for (const k of keys) {
      const vals = ex[k] === 'X' ? [0, 1] : [Number(ex[k])];
      const nc = []; combos.forEach(c => vals.forEach(v => nc.push({ ...c, [k.toLowerCase()]: v }))); combos.splice(0, combos.length, ...nc);
    }
    for (const c of combos) if (!(type === 'SR' && c.s && c.r)) assert.equal(A.ffNext(type, q, c), qn, `${type} ${q}->${qn} ${JSON.stringify(c)}`);
  }
});

test('číselné sústavy a kódy', () => {
  assert.equal(N.toBase(255, 16), 'FF');
  assert.equal(N.fromBase('1011', 2), 11);
  assert.equal(N.twosComplement(-5, 8), '11111011');
  assert.equal(N.fromTwos('11111011'), -5);
  assert.equal(N.onesComplement(-5, 8), '11111010');
  assert.equal(N.signMagnitude(-5, 8), '10000101');
  assert.deepEqual(N.ranges(8).twos, [-128, 127]);
  assert.equal(N.addTwos(100, 50, 8).overflow, true);
  assert.equal(N.addTwos(-3, 5, 8).bits, '00000010');
  for (let v = 0; v < 64; v++) assert.equal(N.fromGray(N.gray(v)), v);
  assert.equal(N.fractionToBase(0.625, 2, 4), '1010');
  for (const [name, codes] of Object.entries(N.DIGIT_CODES)) assert.equal(new Set(codes).size, 10, name);
});

test('detektor bez prekrytia', () => {
  for (const pat of ['11', '101', '110', '1001', '0110']) {
    const p = pat.split('').map(Number), m = p.length;
    for (const type of ['moore', 'mealy']) {
      const aut = A.sequenceDetector(pat, type, false);
      for (let k = 0; k < 200; k++) {
        const inp = rnd(14);
        const out = A.simulate(aut, inp).outputs;
        // referencia: greedy hľadanie zhody, po zhode sa začína od ďalšieho symbolu
        let last = -1;
        inp.forEach((_, t) => {
          let hit = 0;
          if (t + 1 - m > last && t + 1 >= m && inp.slice(t + 1 - m, t + 1).every((v, i) => v === p[i])) { hit = 1; last = t; }
          assert.equal(type === 'moore' ? out[t + 1] : out[t], hit, `${type} ${pat} ${inp}`);
        });
      }
    }
  }
});

test('okno, prevody Moore ↔ Mealy', () => {
  const diff = A.windowAutomaton(2, (h) => h.length === 2 && h[0] !== h[1], 'mealy');
  const ref = A.sameAsPrevious();
  for (let k = 0; k < 100; k++) {
    const inp = rnd(10);
    const a = A.simulate(diff, inp).outputs, b = A.simulate(ref, inp).outputs;
    a.forEach((v, t) => assert.equal(v, t === 0 ? 0 : 1 - b[t]));
  }
  const moore = A.sequenceDetector('101', 'moore');
  const mealy = A.mooreToMealy(moore);
  const back = A.mealyToMoore(mealy);
  for (let k = 0; k < 100; k++) {
    const inp = rnd(10);
    assert.deepEqual(A.simulate(mealy, inp).outputs, A.simulate(moore, inp).outputs.slice(1));
    assert.deepEqual(A.simulate(back, inp).outputs.slice(1), A.simulate(moore, inp).outputs.slice(1));
  }
});

test('detektor zmeny 0 → 1 s počiatočnou hodnotou 0 (CV4 úloha 8)', () => {
  const aut = A.windowAutomaton(2, (h) => h.length === 2 && h[0] === 0 && h[1] === 1, 'mealy', [0]);
  assert.equal(A.simulate(aut, [0, 1, 1, 0, 1]).outputs.join(''), '01001');
  assert.equal(A.minimalStateCount(aut).minimal, 2);
});
