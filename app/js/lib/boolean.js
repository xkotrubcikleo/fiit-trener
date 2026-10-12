// Booleovské výrazy: parser, vyhodnotenie, analýza tvaru a minimalizácia (Quine–McCluskey + Petrick).
// Modul beží v prehliadači aj v Node (testy).

// ---------- Tokenizer a parser ----------
// Premenná: písmeno a za ním voliteľne číslice (a, B, x1, q2). Veľké a malé písmená sa nerozlišujú.
// Negácia: !a  ~a  ¬a  a'      Súčin: a*b  a.b  a·b  a&b  ab      Súčet: a+b  a|b
// Funkcie: nand(a,b,...)  nor(...)  xor(...)  not(a)      Konštanty: 0 1
// Šípky z prednášky: a ↑ b (NAND), a ↓ b (NOR) – nie sú asociatívne, reťazenie vyžaduje zátvorky

const FUNCS = ['nand', 'nor', 'xor', 'xnor', 'not', 'and', 'or'];

export class ParseError extends Error {
  constructor(msg, pos) { super(msg); this.pos = pos; }
}

function tokenize(src) {
  const toks = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    const low = src.slice(i).toLowerCase();
    const fn = FUNCS.find(f => new RegExp('^' + f + '\\s*\\(').test(low));
    if (fn) { toks.push({ t: 'func', v: fn, pos: i }); i += fn.length; continue; }
    if (/[a-zA-Z]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[0-9]/.test(src[j])) j++;
      toks.push({ t: 'var', v: src.slice(i, j).toUpperCase(), pos: i }); i = j; continue;
    }
    if (c === '0' || c === '1') { toks.push({ t: 'const', v: Number(c), pos: i }); i++; continue; }
    if ('!~¬'.includes(c)) { toks.push({ t: 'not', pos: i }); i++; continue; }
    if (c === "'" || c === '’') { toks.push({ t: 'post', pos: i }); i++; continue; }
    if ('*.·&∧'.includes(c)) { toks.push({ t: 'and', pos: i }); i++; continue; }
    if ('+|∨'.includes(c)) { toks.push({ t: 'or', pos: i }); i++; continue; }
    if (c === '⊕') { toks.push({ t: 'xor', pos: i }); i++; continue; }
    if (c === '↑') { toks.push({ t: 'arrow', v: 'nand', pos: i }); i++; continue; }
    if (c === '↓') { toks.push({ t: 'arrow', v: 'nor', pos: i }); i++; continue; }
    if (c === '(' || c === '[') { toks.push({ t: 'lp', pos: i }); i++; continue; }
    if (c === ')' || c === ']') { toks.push({ t: 'rp', pos: i }); i++; continue; }
    if (c === ',') { toks.push({ t: 'comma', pos: i }); i++; continue; }
    throw new ParseError(`Neznámy znak „${c}“`, i);
  }
  toks.push({ t: 'end', pos: src.length });
  return toks;
}

export function parse(src) {
  if (!src || !src.trim()) throw new ParseError('Prázdny výraz', 0);
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const eat = (t) => {
    if (toks[p].t !== t) throw new ParseError(`Očakával som ${t === 'rp' ? '„)“' : t}`, toks[p].pos);
    return toks[p++];
  };
  const startsUnary = (tk) => ['var', 'const', 'not', 'lp', 'func'].includes(tk.t);

  function parseArrow() {
    const left = parseOr();
    if (peek().t !== 'arrow') return left;
    const op = toks[p++];
    const right = parseOr();
    if (peek().t === 'arrow') throw new ParseError('↑ a ↓ nie sú asociatívne – pridaj zátvorky', peek().pos);
    return { t: op.v, args: [left, right] };
  }
  function parseOr() {
    const args = [parseXor()];
    while (peek().t === 'or') { p++; args.push(parseXor()); }
    return args.length === 1 ? args[0] : { t: 'or', args };
  }
  function parseXor() {
    const args = [parseAnd()];
    while (peek().t === 'xor') { p++; args.push(parseAnd()); }
    return args.length === 1 ? args[0] : { t: 'xor', args };
  }
  function parseAnd() {
    const args = [parseUnary()];
    while (true) {
      if (peek().t === 'and') { p++; args.push(parseUnary()); continue; }
      if (startsUnary(peek())) { args.push(parseUnary()); continue; }
      break;
    }
    return args.length === 1 ? args[0] : { t: 'and', args };
  }
  function parseUnary() {
    if (peek().t === 'not') { p++; return { t: 'not', a: parseUnary() }; }
    let node = parsePrimary();
    while (peek().t === 'post') { p++; node = { t: 'not', a: node }; }
    return node;
  }
  function parsePrimary() {
    const tk = peek();
    if (tk.t === 'var') { p++; return { t: 'var', n: tk.v }; }
    if (tk.t === 'const') { p++; return { t: 'const', v: tk.v }; }
    if (tk.t === 'lp') { p++; const e = parseArrow(); eat('rp'); return e; }
    if (tk.t === 'func') {
      p++; eat('lp');
      const args = [parseArrow()];
      while (peek().t === 'comma') { p++; args.push(parseArrow()); }
      eat('rp');
      if (tk.v === 'not') {
        if (args.length !== 1) throw new ParseError('not() má jeden argument', tk.pos);
        return { t: 'not', a: args[0] };
      }
      return { t: tk.v, args };
    }
    if (tk.t === 'end') throw new ParseError('Výraz je neúplný', tk.pos);
    throw new ParseError('Tu nemôže byť operátor', tk.pos);
  }

  const ast = parseArrow();
  if (peek().t !== 'end') throw new ParseError('Nadbytočný znak (chýba operátor alebo zátvorka?)', peek().pos);
  return ast;
}

// ---------- Vyhodnotenie ----------
export function evaluate(ast, env) {
  switch (ast.t) {
    case 'var':
      if (!(ast.n in env)) throw new Error(`Neznáma premenná ${ast.n}`);
      return env[ast.n] ? 1 : 0;
    case 'const': return ast.v;
    case 'not': return evaluate(ast.a, env) ? 0 : 1;
    case 'and': return ast.args.every(a => evaluate(a, env)) ? 1 : 0;
    case 'or': return ast.args.some(a => evaluate(a, env)) ? 1 : 0;
    case 'xor': return ast.args.reduce((s, a) => s ^ evaluate(a, env), 0);
    case 'xnor': return ast.args.reduce((s, a) => s ^ evaluate(a, env), 0) ? 0 : 1;
    case 'nand': return ast.args.every(a => evaluate(a, env)) ? 0 : 1;
    case 'nor': return ast.args.some(a => evaluate(a, env)) ? 0 : 1;
    default: throw new Error('Neznámy uzol ' + ast.t);
  }
}

export function varsOf(ast, acc = new Set()) {
  if (ast.t === 'var') acc.add(ast.n);
  else if (ast.t === 'not') varsOf(ast.a, acc);
  else if (ast.args) ast.args.forEach(a => varsOf(a, acc));
  return acc;
}

// index vstupu: prvá premenná je najvyšší bit (A B C D → A = MSB), ako v pravdivostných tabuľkách na cvičení
export function envFromIndex(vars, idx) {
  const env = {};
  const n = vars.length;
  vars.forEach((v, k) => { env[v] = (idx >> (n - 1 - k)) & 1; });
  return env;
}

export function truthVector(ast, vars) {
  const unknown = [...varsOf(ast)].filter(v => !vars.includes(v));
  if (unknown.length) throw new ParseError(`Premenná ${unknown.join(', ')} v úlohe nie je (povolené: ${vars.join(', ')})`, 0);
  const out = [];
  for (let i = 0; i < (1 << vars.length); i++) out.push(evaluate(ast, envFromIndex(vars, i)));
  return out;
}

// Porovnanie s funkciou danou jednotkami a don't care. Vráti indexy, kde sa výraz líši.
export function compareWith(ast, vars, ones, dcs = []) {
  const vec = truthVector(ast, vars);
  const oneSet = new Set(ones), dcSet = new Set(dcs);
  const wrong = [];
  vec.forEach((v, i) => {
    if (dcSet.has(i)) return;
    if (v !== (oneSet.has(i) ? 1 : 0)) wrong.push(i);
  });
  return { ok: wrong.length === 0, wrong, vec };
}

// ---------- Analýza tvaru (DNF / KNF) ----------
function isLiteral(n) { return n.t === 'var' || (n.t === 'not' && n.a.t === 'var'); }
function litKey(n) { return n.t === 'var' ? n.n : '!' + n.a.n; }

// Vráti pole súčinových členov (každý = pole literálov) alebo null, ak výraz nie je v DNF
export function asDNF(ast) {
  const terms = ast.t === 'or' ? ast.args : [ast];
  const out = [];
  for (const t of terms) {
    if (isLiteral(t)) out.push([litKey(t)]);
    else if (t.t === 'and' && t.args.every(isLiteral)) out.push(t.args.map(litKey));
    else if (t.t === 'const') out.push(t.v ? [] : null);
    else return null;
  }
  return out.filter(x => x !== null);
}

export function asKNF(ast) {
  const clauses = ast.t === 'and' ? ast.args : [ast];
  const out = [];
  for (const c of clauses) {
    if (isLiteral(c)) out.push([litKey(c)]);
    else if (c.t === 'or' && c.args.every(isLiteral)) out.push(c.args.map(litKey));
    else if (c.t === 'const') out.push(c.v ? null : []);
    else return null;
  }
  return out.filter(x => x !== null);
}

export function countLiterals(terms) { return terms.reduce((s, t) => s + t.length, 0); }

// Počet hradiel a vstupov dvojúrovňovej realizácie (NOT sa počíta ako hradlo, pre každú negovanú premennú raz).
export function gateStats(terms, kind = 'dnf') {
  const negs = new Set();
  let gates = 0, inputs = 0;
  terms.forEach(t => t.forEach(l => { if (l.startsWith('!')) negs.add(l); }));
  gates += negs.size; inputs += negs.size;
  const inner = terms.filter(t => t.length >= 2);
  gates += inner.length; inputs += inner.reduce((s, t) => s + t.length, 0);
  if (terms.length >= 2) { gates += 1; inputs += terms.length; }
  return { gates, inputs, literals: countLiterals(terms), kind };
}

// ---------- Quine–McCluskey ----------
// implikant = reťazec dĺžky n z '0', '1', '-'
function bitsOf(idx, n) { return idx.toString(2).padStart(n, '0'); }
function combine(a, b) {
  let diff = 0, out = '';
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) out += a[i];
    else if (a[i] !== '-' && b[i] !== '-') { diff++; out += '-'; }
    else return null;
  }
  return diff === 1 ? out : null;
}
export function covers(imp, idx) {
  const b = bitsOf(idx, imp.length);
  for (let i = 0; i < imp.length; i++) if (imp[i] !== '-' && imp[i] !== b[i]) return false;
  return true;
}
export function primeImplicants(n, ones, dcs = []) {
  let current = [...new Set([...ones, ...dcs])].map(i => bitsOf(i, n));
  const primes = new Set();
  while (current.length) {
    const used = new Set(), next = new Set();
    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const c = combine(current[i], current[j]);
        if (c) { next.add(c); used.add(current[i]); used.add(current[j]); }
      }
    }
    current.forEach(c => { if (!used.has(c)) primes.add(c); });
    current = [...next];
  }
  // implikanty pokrývajúce iba don't care nie sú potrebné
  return [...primes].filter(p => ones.some(o => covers(p, o)));
}
const impLiterals = (imp) => [...imp].filter(c => c !== '-').length;

function* combinations(arr, k, start = 0, prefix = []) {
  if (prefix.length === k) { yield prefix; return; }
  for (let i = start; i <= arr.length - (k - prefix.length); i++) yield* combinations(arr, k, i + 1, [...prefix, arr[i]]);
}

// Všetky minimálne pokrytia (najprv min. počet členov, potom min. počet literálov)
export function minimize(n, ones, dcs = []) {
  if (ones.length === 0) return { primes: [], solutions: [[]], terms: 0, literals: 0, constant: 0 };
  const care = [...new Set(ones)];
  if (care.length + dcs.length === (1 << n)) {
    return { primes: ['-'.repeat(n)], solutions: [['-'.repeat(n)]], terms: 1, literals: 0, constant: 1 };
  }
  const primes = primeImplicants(n, care, dcs);
  const essential = new Set();
  for (const m of care) {
    const cov = primes.filter(p => covers(p, m));
    if (cov.length === 1) essential.add(cov[0]);
  }
  const ess = [...essential];
  const remaining = care.filter(m => !ess.some(p => covers(p, m)));
  const others = primes.filter(p => !essential.has(p));
  let best = [];
  if (remaining.length === 0) best = [ess];
  else {
    for (let k = 1; k <= others.length; k++) {
      for (const combo of combinations(others, k)) {
        if (remaining.every(m => combo.some(p => covers(p, m)))) best.push([...ess, ...combo]);
      }
      if (best.length) break;
    }
  }
  const lit = (sol) => sol.reduce((s, p) => s + impLiterals(p), 0);
  const minLit = Math.min(...best.map(lit));
  const solutions = best.filter(s => lit(s) === minLit);
  return { primes, essential: ess, solutions, terms: solutions[0].length, literals: minLit };
}

// minimálna KNF = minimalizácia núl
export function minimizeKNF(n, ones, dcs = []) {
  const zeros = [];
  const dcSet = new Set(dcs), oneSet = new Set(ones);
  for (let i = 0; i < (1 << n); i++) if (!oneSet.has(i) && !dcSet.has(i)) zeros.push(i);
  return minimize(n, zeros, dcs);
}

// ---------- Formátovanie ----------
export function impToTerm(imp, vars, kind = 'dnf') {
  const lits = [];
  [...imp].forEach((c, i) => {
    if (c === '-') return;
    if (kind === 'dnf') lits.push(c === '1' ? vars[i] : '!' + vars[i]);
    else lits.push(c === '0' ? vars[i] : '!' + vars[i]); // KNF: nula pri premennej = nenegovaná v súčte
  });
  return lits;
}
export function termsToText(terms, kind = 'dnf') {
  if (kind === 'dnf') {
    if (terms.length === 0) return '0';
    return terms.map(t => t.length === 0 ? '1' : t.join('')).join(' + ');
  }
  if (terms.length === 0) return '1';
  if (terms.some(t => t.length === 0)) return '0'; // prázdny súčet = konštanta 0
  return terms.map(t => t.length === 1 ? t[0] : '(' + t.join(' + ') + ')').join('');
}
export function solutionText(sol, vars, kind = 'dnf') {
  return termsToText(sol.map(imp => impToTerm(imp, vars, kind)), kind);
}

// HTML s nadčiarknutím pre negáciu
export function litHTML(l) {
  return l.startsWith('!') ? `<span class="ov">${l.slice(1)}</span>` : l;
}
export function termsToHTML(terms, kind = 'dnf') {
  if (kind === 'dnf') {
    if (terms.length === 0) return '0';
    return terms.map(t => t.length === 0 ? '1' : t.map(litHTML).join('')).join(' + ');
  }
  if (terms.length === 0) return '1';
  if (terms.some(t => t.length === 0)) return '0';
  return terms.map(t => t.length === 1 ? litHTML(t[0]) : '(' + t.map(litHTML).join(' + ') + ')').join('');
}

// AST → HTML (pre zobrazenie zadaných výrazov)
export function astToHTML(ast, parentPrec = 0) {
  const prec = { or: 1, xor: 2, and: 3 };
  switch (ast.t) {
    case 'var': return ast.n;
    case 'const': return String(ast.v);
    case 'not': return `<span class="ov">${astToHTML(ast.a, 0)}</span>`;
    case 'and': {
      const s = ast.args.map(a => astToHTML(a, 3)).join('');
      return parentPrec > 3 ? `(${s})` : s;
    }
    case 'or': case 'xor': {
      const op = ast.t === 'or' ? ' + ' : ' ⊕ ';
      const s = ast.args.map(a => astToHTML(a, prec[ast.t])).join(op);
      return parentPrec >= prec[ast.t] ? `(${s})` : s;
    }
    case 'nand': case 'nor':
      if (ast.args.length === 2) return `(${astToHTML(ast.args[0], 0)} ${ast.t === 'nand' ? '↑' : '↓'} ${astToHTML(ast.args[1], 0)})`;
      if (ast.args.length === 1) return `(${astToHTML(ast.args[0], 0)} ${ast.t === 'nand' ? '↑' : '↓'} ${astToHTML(ast.args[0], 0)})`;
      return `${ast.t.toUpperCase()}(${ast.args.map(a => astToHTML(a, 0)).join(', ')})`;
    default: return `${ast.t}(${ast.args.map(a => astToHTML(a, 0)).join(', ')})`;
  }
}

// ---------- Hodnotenie odpovede: minimálna DNF/KNF ----------
export function checkMinimalForm(src, vars, ones, dcs, kind = 'dnf') {
  let ast;
  try { ast = parse(src); } catch (e) { return { status: 'parse', msg: e.message, pos: e.pos }; }
  let cmp;
  try { cmp = compareWith(ast, vars, ones, dcs); } catch (e) { return { status: 'parse', msg: e.message }; }
  const ref = kind === 'dnf' ? minimize(vars.length, ones, dcs) : minimizeKNF(vars.length, ones, dcs);
  const refText = ref.solutions.map(s => solutionText(s, vars, kind));
  if (!cmp.ok) return { status: 'wrong', wrong: cmp.wrong, ref, refText };
  const terms = kind === 'dnf' ? asDNF(ast) : asKNF(ast);
  if (!terms) return { status: 'notform', ref, refText, msg: kind === 'dnf' ? 'Výraz je správny, ale nie je v tvare DNF (súčet súčinov).' : 'Výraz je správny, ale nie je v tvare KNF (súčin súčtov).' };
  const t = terms.length, l = countLiterals(terms);
  if (t === ref.terms && l === ref.literals) return { status: 'ok', ref, refText, terms: t, literals: l };
  return { status: 'notmin', ref, refText, terms: t, literals: l };
}

// ---------- Štruktúra obvodu (na úlohy NAND/NOR a analýzu) ----------
// Vráti množinu typov uzlov použitých vo výraze
export function nodeTypes(ast, acc = new Set()) {
  acc.add(ast.t);
  if (ast.a) nodeTypes(ast.a, acc);
  if (ast.args) ast.args.forEach(a => nodeTypes(a, acc));
  return acc;
}
// Počet hradiel stromu výrazu (rovnaké podvýrazy sa realizujú raz). Negácia premennej = 1 NOT (ak je povolená ako hradlo).
export function countGates(ast) {
  const seen = new Map();
  const key = (n) => {
    switch (n.t) {
      case 'var': return n.n;
      case 'const': return String(n.v);
      case 'not': return '!' + key(n.a);
      default: {
        const ks = n.args.map(key);
        const comm = ['and', 'or', 'nand', 'nor', 'xor', 'xnor'].includes(n.t);
        return n.t + '(' + (comm ? [...ks].sort() : ks).join(',') + ')';
      }
    }
  };
  const visit = (n) => {
    if (n.t === 'var' || n.t === 'const') return;
    const k = key(n);
    if (seen.has(k)) return;
    const inputs = n.t === 'not' ? 1 : n.args.length;
    seen.set(k, inputs);
    if (n.a) visit(n.a);
    if (n.args) n.args.forEach(visit);
  };
  visit(ast);
  let inputs = 0; for (const v of seen.values()) inputs += v;
  return { gates: seen.size, inputs };
}
