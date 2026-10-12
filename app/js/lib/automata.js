// Konečné automaty (Moore / Mealy) s binárnym vstupom x ∈ {0,1}, klopné obvody.

// Automat: { type: 'moore'|'mealy', states: ['A','B',...], start: 0,
//            next: [[s_pri_x0, s_pri_x1], ...]   (pri k-bitovom vstupe má každý riadok 2^k prvkov),
//            out: moore → [y pre stav], mealy → [[y pri x0, y pri x1], ...] }

export function simulate(aut, inputs) {
  let s = aut.start;
  const states = [s], outputs = [];
  if (aut.type === 'moore') outputs.push(aut.out[s]);
  for (const x of inputs) {
    if (aut.type === 'mealy') outputs.push(aut.out[s][x]);
    s = aut.next[s][x];
    states.push(s);
    if (aut.type === 'moore') outputs.push(aut.out[s]);
  }
  return { states, outputs };
}

// Ekvivalencia správania (rovnaká výstupná postupnosť pre každú vstupnú postupnosť).
// Vráti { equal, counter } – najkratší vstup, na ktorom sa líšia.
export function equivalent(a, b) {
  if (a.type !== b.type) throw new Error('Rôzne typy automatov');
  const key = (p, q) => p + ',' + q;
  const seen = new Map();
  const queue = [[a.start, b.start]];
  seen.set(key(a.start, b.start), []);
  if (a.type === 'moore' && a.out[a.start] !== b.out[b.start]) return { equal: false, counter: [] };
  while (queue.length) {
    const [p, q] = queue.shift();
    const path = seen.get(key(p, q));
    for (let x = 0; x < a.next[p].length; x++) {
      const np = a.next[p][x], nq = b.next[q][x];
      const np2 = path.concat(x);
      if (a.type === 'mealy' && a.out[p][x] !== b.out[q][x]) return { equal: false, counter: np2 };
      if (a.type === 'moore' && a.out[np] !== b.out[nq]) return { equal: false, counter: np2 };
      if (!seen.has(key(np, nq))) { seen.set(key(np, nq), np2); queue.push([np, nq]); }
    }
  }
  return { equal: true };
}

// Počet stavov minimálneho ekvivalentného automatu (iba dosiahnuteľné stavy, rozklad na triedy).
export function minimalStateCount(aut) {
  const reach = new Set([aut.start]);
  const st = [aut.start];
  while (st.length) { const s = st.pop(); for (const n of aut.next[s]) { if (!reach.has(n)) { reach.add(n); st.push(n); } } }
  const R = [...reach];
  const sig0 = (s) => aut.type === 'moore' ? String(aut.out[s]) : aut.out[s].join('');
  let cls = new Map(R.map(s => [s, sig0(s)]));
  while (true) {
    const ids = new Map(); let k = 0;
    const next = new Map();
    for (const s of R) {
      const sig = cls.get(s) + '|' + aut.next[s].map(n => cls.get(n)).join('|');
      if (!ids.has(sig)) ids.set(sig, k++);
      next.set(s, String(ids.get(sig)));
    }
    const before = new Set(cls.values()).size, after = new Set(next.values()).size;
    cls = next;
    if (after === before) {
      const classes = {};
      for (const s of R) (classes[cls.get(s)] ||= []).push(s);
      return { minimal: after, reachable: R.length, classes: Object.values(classes) };
    }
  }
}

// ---------- Generátory automatov zo slovného opisu ----------
// Detektor postupnosti (s prekrytím)
export function sequenceDetector(pattern, type = 'moore', overlap = true) {
  const m = pattern.length;
  const p = pattern.split('').map(Number);
  // najdlhší suffix postupnosti seq (dĺžky ≤ maxLen), ktorý je zároveň prefixom vzoru
  const lps = (seq, maxLen) => {
    for (let k = Math.min(seq.length, maxLen); k >= 0; k--) {
      if (seq.slice(seq.length - k).every((v, i) => v === p[i])) return k;
    }
    return 0;
  };
  const next = [], out = [];
  if (type === 'moore') {
    for (let s = 0; s <= m; s++) {
      const prefix = s === m && !overlap ? [] : p.slice(0, s); // bez prekrytia začína po zhode odznova
      next.push([0, 1].map(x => lps(prefix.concat(x), m)));
      out.push(s === m ? 1 : 0);
    }
    return { type, states: names(m + 1), start: 0, next, out };
  }
  for (let s = 0; s < m; s++) {
    const nx = [], ox = [];
    for (const x of [0, 1]) {
      const seq = p.slice(0, s).concat(x);
      if (lps(seq, m) === m) { ox.push(1); nx.push(overlap ? lps(seq, m - 1) : 0); } // po zhode pokračuje najdlhším vlastným okrajom
      else { ox.push(0); nx.push(lps(seq, m - 1)); }
    }
    next.push(nx); out.push(ox);
  }
  return { type, states: names(m), start: 0, next, out };
}

export function counterMod(n) {
  const next = [], out = [];
  for (let s = 0; s < n; s++) { next.push([s, (s + 1) % n]); out.push(s === n - 1 ? 1 : 0); }
  return { type: 'moore', states: names(n), start: 0, next, out };
}

export function parity(odd = true) {
  // y = 1, ak doteraz prišiel nepárny (odd) / párny počet jednotiek
  return { type: 'moore', states: names(2), start: 0, next: [[0, 1], [1, 0]], out: odd ? [0, 1] : [1, 0] };
}

export function sameAsPrevious() {
  // Mealy: y = 1, ak je vstup rovnaký ako predchádzajúci; stav A = začiatok, B = predtým 0, C = predtým 1
  return { type: 'mealy', states: names(3), start: 0, next: [[1, 2], [1, 2], [1, 2]], out: [[0, 0], [1, 0], [0, 1]] };
}

export function names(n) { return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i)); }

// ---------- Klopné obvody ----------
// type: 'D' (vstup d), 'T' (t), 'JK' (j,k), 'SR' (s,r) – synchrónne, menia stav na nábežnej hrane
export function ffNext(type, q, inp) {
  switch (type) {
    case 'D': return inp.d;
    case 'T': return inp.t ? 1 - q : q;
    case 'JK': return inp.j && inp.k ? 1 - q : inp.j ? 1 : inp.k ? 0 : q;
    case 'SR':
      if (inp.s && inp.r) return null; // zakázaná kombinácia
      return inp.s ? 1 : inp.r ? 0 : q;
  }
  throw new Error('Neznámy typ ' + type);
}

export function ffCommand(type, inp) {
  switch (type) {
    case 'D': return inp.d ? 'zapíše 1' : 'zapíše 0';
    case 'T': return inp.t ? 'preklopí' : 'drží';
    case 'JK': return inp.j && inp.k ? 'preklopí' : inp.j ? 'nastaví (1)' : inp.k ? 'vynuluje (0)' : 'drží';
    case 'SR': return inp.s && inp.r ? 'zakázané' : inp.s ? 'nastaví (1)' : inp.r ? 'vynuluje (0)' : 'drží';
  }
}

// Inverzná prechodová funkcia: aké vstupy treba na prechod q → q'
// výsledok: objekt vstup → '0' | '1' | 'X'
export function ffExcitation(type, q, qn) {
  switch (type) {
    case 'D': return { D: String(qn) };
    case 'T': return { T: String(q ^ qn) };
    case 'JK': return q === 0 ? { J: String(qn), K: 'X' } : { J: 'X', K: String(1 - qn) };
    case 'SR':
      if (q === 0) return qn ? { S: '1', R: '0' } : { S: '0', R: 'X' };
      return qn ? { S: 'X', R: '0' } : { S: '0', R: '1' };
  }
}

// Automat s pamäťou posledných k vstupov; výstup = pred(história) (história kratšia ako k → pred dostane kratšie pole)
// init = predpokladaná história pred prvým vstupom (napr. [0] = „posledná hodnota bola 0“)
export function windowAutomaton(k, pred, type = 'moore', init = []) {
  const key = (h) => h.join('');
  const states = [[...init]], index = new Map([[key(init), 0]]);
  const next = [], out = [];
  for (let i = 0; i < states.length; i++) {
    const hist = states[i];
    const row = [], orow = [];
    for (const x of [0, 1]) {
      const nh = [...hist, x].slice(-k);
      if (!index.has(key(nh))) { index.set(key(nh), states.length); states.push(nh); }
      row.push(index.get(key(nh)));
      orow.push(pred([...hist, x].slice(-k)) ? 1 : 0);
    }
    next.push(row);
    out.push(type === 'moore' ? (pred(hist) ? 1 : 0) : orow);
  }
  return { type, states: names(states.length), start: 0, next, out };
}

// Moore → Mealy (výstup pri prechode = výstup cieľového stavu)
export function mooreToMealy(aut) {
  return { type: 'mealy', states: aut.states, start: aut.start, next: aut.next, out: aut.next.map(row => row.map(t => aut.out[t])) };
}
// Mealy → Moore (stav × výstup, ktorým sa doň vstúpilo)
export function mealyToMoore(aut) {
  const pairs = [], idx = new Map();
  const get = (s, y) => { const k = s + ',' + y; if (!idx.has(k)) { idx.set(k, pairs.length); pairs.push([s, y]); } return idx.get(k); };
  get(aut.start, 0);
  const next = [];
  for (let i = 0; i < pairs.length; i++) {
    const [s] = pairs[i];
    next.push(aut.next[s].map((t, x) => get(t, aut.out[s][x])));
  }
  return { type: 'moore', states: names(pairs.length), start: 0, next, out: pairs.map(p => p[1]) };
}
