// Konečné automaty: simulácia, návrh zo slovného opisu, Moore ↔ Mealy, minimalizácia
import { h, mount, esc, pick, rint, shuffle } from '../core/ui.js';
import * as A from '../lib/automata.js';

export const inputLabels = (aut) => aut.next[0].length === 2 ? ['0', '1'] : ['00', '01', '10', '11'];

// ---------- graf automatu ----------
export function fsmSVG(aut, { cur = null, size = 360 } = {}) {
  const n = aut.states.length, labels = inputLabels(aut);
  const R = n <= 2 ? 90 : 70 + 22 * n, r = 24, pad = 70;
  const W = 2 * (R + pad), H = n <= 2 ? 200 : 2 * (R + pad);
  const cx = W / 2, cy = H / 2;
  const pos = aut.states.map((_, i) => {
    const a = n <= 2 ? Math.PI * i : -Math.PI / 2 + 2 * Math.PI * i / n;
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
  });
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text != null) e.textContent = text; return e; };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: Math.min(size + 40 * Math.max(0, n - 3), W), class: 'fsm-svg' });
  const mid = 'arr' + Math.random().toString(36).slice(2, 7);
  const defs = el('defs', {});
  const marker = el('marker', { id: mid, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
  marker.append(el('path', { d: 'M0,0 L10,5 L0,10 z' }));
  defs.append(marker); svg.append(defs);
  // zoskupenie hrán
  const edges = new Map();
  aut.next.forEach((row, s) => row.forEach((t, x) => {
    const k = s + '>' + t;
    if (!edges.has(k)) edges.set(k, []);
    edges.get(k).push(aut.type === 'mealy' ? `${labels[x]}/${aut.out[s][x]}` : labels[x]);
  }));
  const gEdges = el('g', {}), gLabels = el('g', {});
  for (const [k, labs] of edges) {
    const [s, t] = k.split('>').map(Number);
    const text = labs.join(', ');
    const [x1, y1] = pos[s], [x2, y2] = pos[t];
    if (s === t) {
      const ang = Math.atan2(y1 - cy, x1 - cx) || -Math.PI / 2;
      const a1 = ang - 0.45, a2 = ang + 0.45;
      const p1 = [x1 + r * Math.cos(a1), y1 + r * Math.sin(a1)], p2 = [x1 + r * Math.cos(a2), y1 + r * Math.sin(a2)];
      const c1 = [x1 + 2.6 * r * Math.cos(a1 - 0.3), y1 + 2.6 * r * Math.sin(a1 - 0.3)], c2 = [x1 + 2.6 * r * Math.cos(a2 + 0.3), y1 + 2.6 * r * Math.sin(a2 + 0.3)];
      gEdges.append(el('path', { d: `M${p1} C${c1} ${c2} ${p2}`, class: 'edge', 'marker-end': `url(#${mid})` }));
      gLabels.append(el('text', { x: x1 + 2.55 * r * Math.cos(ang), y: y1 + 2.55 * r * Math.sin(ang) + 4, 'text-anchor': 'middle', class: 'elabel' }, text));
      continue;
    }
    const both = edges.has(t + '>' + s);
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    const nx = -dy / len, ny = dx / len;
    const off = both ? 28 : 0;
    const mx = (x1 + x2) / 2 + nx * off, my = (y1 + y2) / 2 + ny * off;
    const sa = Math.atan2(my - y1, mx - x1), ea = Math.atan2(my - y2, mx - x2);
    const sx = x1 + r * Math.cos(sa), sy = y1 + r * Math.sin(sa), ex = x2 + r * Math.cos(ea), ey = y2 + r * Math.sin(ea);
    gEdges.append(el('path', { d: `M${sx},${sy} Q${mx},${my} ${ex},${ey}`, class: 'edge', 'marker-end': `url(#${mid})` }));
    const lx = 0.25 * sx + 0.5 * mx + 0.25 * ex, ly = 0.25 * sy + 0.5 * my + 0.25 * ey;
    gLabels.append(el('text', { x: lx + nx * 10, y: ly + ny * 10 + 4, 'text-anchor': 'middle', class: 'elabel' }, text));
  }
  svg.append(gEdges);
  aut.states.forEach((name, i) => {
    const [x, y] = pos[i];
    const g = el('g', { class: 'node' + (i === aut.start ? ' start' : '') + (i === cur ? ' cur' : '') });
    g.append(el('circle', { cx: x, cy: y, r }));
    g.append(el('text', { x, y: y + 5, 'text-anchor': 'middle' }, aut.type === 'moore' ? `${name}/${aut.out[i]}` : name));
    svg.append(g);
  });
  // šípka do počiatočného stavu
  const [sx, sy] = pos[aut.start];
  const ang = Math.atan2(sy - cy, sx - cx) - (n <= 2 ? Math.PI / 2 : 1.35);
  svg.append(el('path', { d: `M${sx + (r + 26) * Math.cos(ang)},${sy + (r + 26) * Math.sin(ang)} L${sx + (r + 2) * Math.cos(ang)},${sy + (r + 2) * Math.sin(ang)}`, class: 'edge', 'marker-end': `url(#${mid})`, style: 'stroke: var(--accent); stroke-width: 2' }));
  svg.append(gLabels);
  return h('div.fsm', svg);
}

export function fsmTable(aut) {
  const labels = inputLabels(aut);
  return h('table.t', h('tr', h('th', 'stav'), labels.map(l => h('th', { html: `${aut.inputNames || 'x'} = ${l}` })), aut.type === 'moore' ? h('th.vsep', 'y') : null),
    aut.states.map((s, i) => h('tr', h('td', { html: (i === aut.start ? '→ ' : '') + `<b>${s}</b>` }),
      aut.next[i].map((t, x) => h('td', aut.type === 'mealy' ? `${aut.states[t]} / ${aut.out[i][x]}` : aut.states[t])),
      aut.type === 'moore' ? h('td.vsep', aut.out[i]) : null)));
}

export function randomAutomaton(n, type, nIn = 2) {
  for (let t = 0; t < 500; t++) {
    const next = Array.from({ length: n }, () => Array.from({ length: nIn }, () => rint(0, n - 1)));
    const out = type === 'moore' ? Array.from({ length: n }, () => rint(0, 1)) : Array.from({ length: n }, () => Array.from({ length: nIn }, () => rint(0, 1)));
    const aut = { type, states: A.names(n), start: 0, next, out };
    const m = A.minimalStateCount(aut);
    if (m.reachable === n && m.minimal === n && next.some((row, s) => row.some(x => x !== s))) return aut;
  }
  return A.sequenceDetector('101', type);
}

// ---------- editor tabuľky automatu ----------
export function fsmEditor(type, { nIn = 2, initialStates = 3, maxStates = 8, inputNames = 'x' } = {}) {
  const labels = nIn === 2 ? ['0', '1'] : ['00', '01', '10', '11'];
  let n = initialStates;
  const box = h('div');
  let rows = [];
  const mkSel = (opts) => h('select', h('option', { value: '' }, '–'), opts.map(o => h('option', { value: o.v }, o.l)));
  function render() {
    const names = A.names(n);
    const old = rows;
    rows = names.map((s, i) => ({
      next: labels.map((_, x) => { const sel = mkSel(names.map((nm, j) => ({ v: j, l: nm }))); const o = old[i]?.next[x]?.value; if (o !== undefined && o !== '' && Number(o) < n) sel.value = o; return sel; }),
      out: type === 'mealy'
        ? labels.map((_, x) => { const sel = mkSel([{ v: 0, l: '0' }, { v: 1, l: '1' }]); const o = old[i]?.out[x]?.value; if (o) sel.value = o; return sel; })
        : [(() => { const sel = mkSel([{ v: 0, l: '0' }, { v: 1, l: '1' }]); const o = old[i]?.out[0]?.value; if (o) sel.value = o; return sel; })()],
    }));
    mount(box,
      h('div.row', { style: { marginBottom: '8px' } }, h('span', 'Počet stavov:'),
        h('button.small', { onclick: () => { if (n > 1) { n--; render(); } } }, '−'), h('b', n), h('button.small', { onclick: () => { if (n < maxStates) { n++; render(); } } }, '+'),
        h('span.small.muted', 'Počiatočný stav je A.')),
      h('table.t.fsm-table', h('tr', h('th', 'stav'), labels.map(l => h('th', type === 'mealy' ? `${inputNames} = ${l}: stav / y` : `${inputNames} = ${l}`)), type === 'moore' ? h('th.vsep', 'y') : null),
        rows.map((r, i) => h('tr', h('td', h('b', names[i])),
          labels.map((_, x) => h('td', r.next[x], type === 'mealy' ? [' / ', r.out[x]] : null)),
          type === 'moore' ? h('td.vsep', r.out[0]) : null))));
  }
  render();
  return {
    el: box,
    read() {
      const empty = rows.some(r => r.next.some(s => s.value === '') || r.out.some(s => s.value === ''));
      if (empty) return null;
      return {
        type, states: A.names(n), start: 0,
        next: rows.map(r => r.next.map(s => Number(s.value))),
        out: type === 'moore' ? rows.map(r => Number(r.out[0].value)) : rows.map(r => r.out.map(s => Number(s.value))),
      };
    },
  };
}

// ---------- simulácia ----------
function genSimulacia({ level }) {
  const type = pick(['moore', 'mealy']);
  const nIn = level === 3 ? 4 : 2;
  const n = level === 1 ? 3 : 4;
  const aut = randomAutomaton(n, type, nIn);
  if (nIn === 4) aut.inputNames = 'x₁x₂';
  const len = level === 1 ? 5 : 7;
  const labels = inputLabels(aut);
  const inputs = Array.from({ length: len }, () => rint(0, nIn - 1));
  const sim = A.simulate(aut, inputs);
  const show = level === 1 ? 'both' : pick(['graph', 'table']);
  const stSel = inputs.map(() => h('select', h('option', { value: '' }, '–'), aut.states.map((s, i) => h('option', { value: i }, s))));
  const outLen = type === 'moore' ? len + 1 : len;
  const outSel = Array.from({ length: outLen }, () => h('select', h('option', { value: '' }, '–'), h('option', { value: 0 }, '0'), h('option', { value: 1 }, '1')));
  const table = h('table.t',
    h('tr', h('th.l', 'takt'), type === 'moore' ? h('th', '0') : null, inputs.map((_, k) => h('th', k + 1))),
    h('tr', h('th.l', `vstup ${aut.inputNames || 'x'}`), type === 'moore' ? h('td', '') : null, inputs.map(x => h('td.mono', labels[x]))),
    h('tr', h('th.l', 'stav'), type === 'moore' ? h('td', aut.states[aut.start]) : null, stSel.map(s => h('td', s))),
    h('tr', h('th.l', 'výstup y'), outSel.map(s => h('td', s))));
  return {
    el: h('div',
      h('p', { html: `${type === 'moore' ? 'Moorov' : 'Mealyho'} automat začína v stave <b>${aut.states[aut.start]}</b>. Urči postupnosť stavov a výstupov pre vstup <b class="mono">${inputs.map(x => labels[x]).join(' ')}</b>.` }),
      h('p.small.muted', type === 'moore' ? 'Moore: výstup závisí iba od stavu (je vo vrchole), preto má o jeden výstup viac – aj pre počiatočný stav.' : 'Mealy: výstup je na hrane – závisí od stavu aj od aktuálneho vstupu. Stav v stĺpci k je stav PO spracovaní k-teho vstupu.'),
      h('div.row.top', { style: { gap: '20px' } }, show !== 'table' ? fsmSVG(aut) : null, show !== 'graph' ? fsmTable(aut) : null),
      h('div.table-wrap', { style: { marginTop: '10px' } }, table)),
    check() {
      if ([...stSel, ...outSel].some(s => s.value === '')) return { incomplete: true, feedback: 'Vyplň všetky stavy a výstupy.' };
      let bad = 0;
      stSel.forEach((s, k) => { const ok = Number(s.value) === sim.states[k + 1]; s.className = ok ? 'ok' : 'bad'; bad += !ok; });
      outSel.forEach((s, k) => { const ok = Number(s.value) === sim.outputs[k]; s.className = ok ? 'ok' : 'bad'; bad += !ok; });
      const tot = stSel.length + outSel.length;
      return { ok: !bad, score: 1 - bad / tot, feedback: bad ? `Chybných políčok: ${bad}.` : '', correct: `stavy ${sim.states.map(s => aut.states[s]).join(' ')}, výstupy ${sim.outputs.join('')}` };
    },
    solution() {
      const steps = inputs.map((x, k) => {
        const s = sim.states[k], t = sim.states[k + 1];
        return `${k + 1}. ${aut.states[s]} --${labels[x]}--> ${aut.states[t]}, y = ${type === 'mealy' ? aut.out[s][x] : aut.out[t]}`;
      });
      return h('div', fsmSVG(aut), h('p.mono.small', { html: (type === 'moore' ? `0. začiatok ${aut.states[aut.start]}, y = ${aut.out[aut.start]}<br>` : '') + steps.join('<br>') }),
        h('p', { html: `Stavy: <b>${sim.states.map(s => aut.states[s]).join(' → ')}</b><br>Výstupy: <b class="mono">${sim.outputs.join(' ')}</b>` }));
    },
    summary: { prompt: `simulácia ${type}, vstup ${inputs.map(x => labels[x]).join(' ')}`, correct: sim.outputs.join('') },
  };
}

// ---------- návrh zo slovného opisu ----------
const twoIn = (rows) => rows; // riadok = [pre 00, 01, 10, 11]
function specs(type) {
  const pat = pick(['101', '110', '011', '1001', '0110', '111', '010', '100']);
  const overlap = Math.random() < 0.6;
  const asType = (m) => type === 'moore' ? m : A.mooreToMealy(m);
  const list = [
    () => ({ text: `výstup y = 1, keď posledné vstupy tvoria postupnosť <b class="mono">${pat}</b> (${overlap ? 's prekrývaním – koniec jednej postupnosti môže byť začiatkom ďalšej' : 'bez prekrývania – po nájdení sa hľadá odznova'})`, aut: A.sequenceDetector(pat, type, overlap) }),
    () => ({ text: 'výstup y = 1, ak doteraz prišiel <b>nepárny počet</b> jednotiek', aut: asType(A.parity(true)) }),
    () => { const k = rint(2, 4); const m = { type: 'moore', states: A.names(k), start: 0, next: Array.from({ length: k }, (_, s) => [s, (s + 1) % k]), out: Array.from({ length: k }, (_, s) => s === 0 ? 1 : 0) }; return { text: `výstup y = 1, ak je počet doteraz prijatých jednotiek <b>deliteľný ${k}</b> (aj 0 jednotiek)`, aut: asType(m) }; },
    () => ({ text: 'výstup y = 1, ak je aktuálny vstup <b>rovnaký ako predchádzajúci</b> (pri prvom vstupe y = 0)', aut: A.windowAutomaton(2, (hh) => hh.length === 2 && hh[0] === hh[1], type) }),
    () => ({ text: 'výstup y = 1, ak medzi <b>poslednými tromi vstupmi sú aspoň dve jednotky</b>', aut: A.windowAutomaton(3, (hh) => hh.filter(x => x).length >= 2, type) }),
    () => ({ text: 'výstup y = 1, ak prišli <b>aspoň dve jednotky za sebou</b> niekedy v minulosti (potom už ostane 1)', aut: asType({ type: 'moore', states: A.names(3), start: 0, next: [[0, 1], [0, 2], [2, 2]], out: [0, 0, 1] }) }),
    // CV4 úloha 8: zmena vstupu
    () => { const v = pick([['z 0 na 1', (h) => h[0] === 0 && h[1] === 1], ['z 1 na 0', (h) => h[0] === 1 && h[1] === 0], ['(z 0 na 1 alebo z 1 na 0)', (h) => h[0] !== h[1]]]);
      return { text: `automat oznámi <b>zmenu vstupu ${v[0]}</b> výstupom y = 1. Pred prvým vstupom považuj poslednú hodnotu za 0`, aut: A.windowAutomaton(2, (h) => h.length === 2 && v[1](h), type, [0]) }; },
    // CV4 úloha 5: cyklické režimy
    () => { const sets = [[['VYP', 'NÍZKY', 'VYSOKÝ'], [0, 1, 1]], [['VYP', 'NÍZKY', 'VYSOKÝ'], [0, 0, 1]], [['VYP', 'NÍZKY', 'STREDNÝ', 'VYSOKÝ'], [0, 1, 1, 1]], [['VYP', 'ZAP', 'BLIKÁ'], [0, 1, 0]], [['ČERVENÁ', 'ZELENÁ', 'ORANŽOVÁ'], [0, 1, 0]]];
      const [names, out] = pick(sets); const k = names.length;
      const m = { type: 'moore', states: A.names(k), start: 0, next: Array.from({ length: k }, (_, s) => [s, (s + 1) % k]), out };
      return { text: `zariadenie má režimy ${names.map((n, i) => `<b>${n}</b>/y=${out[i]}`).join(', ')}. Vstup x = 1 ho prepne na nasledujúci režim v poradí ${names.join(' → ')} → ${names[0]}, pri x = 0 sa režim nemení. Začína v režime ${names[0]}`, aut: asType(m) }; },
    // CV4 úloha 9: vetranie s dvoma príkazmi (Moore)
    () => { const stopWins = Math.random() < 0.6;
      const m = { type: 'moore', states: A.names(2), start: 0, inputNames: 'ez', next: twoIn([[0, 0, 1, stopWins ? 0 : 1], [1, 0, 1, stopWins ? 0 : 1]]), out: [0, 1] };
      return { fixed: 'moore', text: `vetranie sa spustí príkazom <b>e = 1</b> a potom ostane zapnuté aj pri e = 0, kým nepríde príkaz na zastavenie <b>z = 1</b>. Ak prídu e = z = 1 súčasne, prednosť má <b>${stopWins ? 'zastavenie' : 'zapnutie'}</b>. Výstup y = 1, keď vetranie beží. Na začiatku je vypnuté. Tabuľka má stĺpce pre všetky dvojice ez`, aut: m }; },
    // CV4 úloha 11: turniket (Mealy)
    () => ({ fixed: 'mealy', text: 'turniket má vstupy <b>c</b> (minca) a <b>p</b> (zatlačenie). Na začiatku je zamknutý. Minca ho odomkne (ďalšia minca sa neukladá). Zatlačenie odomknutého turniketu povolí prechod, dá výstup <b>y = 1</b> a turniket sa zamkne. Zatlačenie zamknutého nič neurobí. Pri c = p = 1 v zamknutom stave sa započíta minca a zatlačenie sa ignoruje, v odomknutom sa povolí prechod a minca sa ignoruje',
      aut: { type: 'mealy', states: A.names(2), start: 0, inputNames: 'cp', next: [[0, 0, 1, 1], [1, 0, 1, 0]], out: [[0, 0, 0, 0], [0, 1, 0, 1]] } }),
    // počítadlo s povolením a nulovaním (Moore, 2 vstupy)
    () => { const k = pick([3, 4]);
      const next = Array.from({ length: k }, (_, s) => [s, 0, (s + 1) % k, 0]); // pr = 00, 01, 10, 11
      return { fixed: 'moore', text: `počítadlo má vstupy <b>p</b> (počítaj) a <b>r</b> (nuluj). Pri r = 1 sa vynuluje (r má prednosť), pri p = 1, r = 0 pripočíta 1 modulo ${k}, inak drží. Výstup y = 1, keď je stav počítadla ${k - 1}. Začína na 0`,
        aut: { type: 'moore', states: A.names(k), start: 0, inputNames: 'pr', next, out: Array.from({ length: k }, (_, s) => s === k - 1 ? 1 : 0) } }; },
  ];
  return pick(list)();
}
function genNavrh({ level }) {
  let spec = specs(pick(['moore', 'mealy']));
  const type = spec.aut.type;
  const nIn = spec.aut.next[0].length;
  const labels = inputLabels(spec.aut);
  const inName = spec.aut.inputNames || 'x';
  const minimal = A.minimalStateCount(spec.aut).minimal;
  const ed = fsmEditor(type, { nIn, inputNames: inName, initialStates: Math.min(minimal, 3) });
  const fmtIn = (seq) => seq.map(x => labels[x]).join(' ');
  return {
    el: h('div', h('p', { html: `Navrhni <b>${type === 'moore' ? 'Moorov' : 'Mealyho'}</b> automat${nIn === 2 ? ' so vstupom x ∈ {0, 1}' : ''}: ${spec.text}.` }),
      h('p.small.muted', type === 'moore' ? 'Moore: výstup patrí stavu (vrcholu). Výstup počiatočného stavu je výstup pred prvým vstupom.' : 'Mealy: výstup patrí prechodu (hrane) a odčítava sa pri práve nastavenom vstupe.'),
      ed.el),
    check() {
      const user = ed.read();
      if (!user) return { incomplete: true, feedback: 'Vyplň celú tabuľku (každý prechod a výstup).' };
      const eq = A.equivalent(spec.aut, user);
      if (!eq.equal) {
        const inp = eq.counter;
        const want = A.simulate(spec.aut, inp).outputs, got = A.simulate(user, inp).outputs;
        return { ok: false, feedback: `Automat sa správa inak. Protipríklad – vstup ${inName} = <b class="mono">${fmtIn(inp) || '(žiadny)'}</b>: očakávané výstupy <b class="mono">${want.join(' ')}</b>, tvoj automat dáva <b class="mono">${got.join(' ')}</b>.`, correct: `${minimal} stavov` };
      }
      const um = A.minimalStateCount(user).minimal, un = user.states.length;
      if (un > minimal) return { ok: false, score: .7, feedback: `Správanie je správne, ale automat má ${un} stavov. Minimálny má <b>${minimal}</b> – niektoré stavy sú ekvivalentné${um < un ? ' alebo nedosiahnuteľné' : ''}.`, correct: `${minimal} stavov` };
      return { ok: true, feedback: `Správne a minimálne (${minimal} ${minimal < 5 ? 'stavy' : 'stavov'}).` };
    },
    solution() {
      const red = reduce(spec.aut);
      return h('div', h('div.row.top', { style: { gap: '20px' } }, fsmSVG(red), fsmTable(red)),
        h('p.small.muted', 'Iné pomenovanie stavov je v poriadku – kontroluje sa správanie automatu, nie mená.'));
    },
    summary: { prompt: `${type}: ${spec.text.replace(/<[^>]+>/g, '')}`, correct: `${minimal} stavov` },
  };
}

// ---------- graf → tabuľka (CV4 úloha 6) ----------
function genGraf({ level }) {
  const type = pick(['moore', 'mealy']);
  const nIn = level === 3 ? 4 : 2;
  const aut = randomAutomaton(level === 1 ? 3 : 4, type, nIn);
  if (nIn === 4) aut.inputNames = 'x₁x₂';
  const labels = inputLabels(aut);
  const mk = (opts) => h('select', h('option', { value: '' }, '–'), opts.map((o, i) => h('option', { value: i }, o)));
  const nextSel = aut.states.map(() => labels.map(() => mk(aut.states)));
  const outSel = aut.states.map(() => type === 'moore' ? [mk(['0', '1'])] : labels.map(() => mk(['0', '1'])));
  return {
    el: h('div', h('p', { html: `Podľa grafu ${type === 'moore' ? 'Moorovho' : 'Mealyho'} automatu zostav <b>prechodovú a výstupnú tabuľku</b>. ${type === 'moore' ? 'Vo vrchole je stav / výstup.' : 'Na šípke je vstup / výstup.'}` }),
      fsmSVG(aut),
      h('table.t.fsm-table', h('tr', h('th', 'stav'), labels.map(l => h('th', type === 'mealy' ? `${aut.inputNames || 'x'} = ${l}: stav / y` : `${aut.inputNames || 'x'} = ${l}`)), type === 'moore' ? h('th.vsep', 'y') : null),
        aut.states.map((st, i) => h('tr', h('td', { html: (i === aut.start ? '→ ' : '') + `<b>${st}</b>` }),
          labels.map((_, x) => h('td', nextSel[i][x], type === 'mealy' ? [' / ', outSel[i][x]] : null)),
          type === 'moore' ? h('td.vsep', outSel[i][0]) : null)))),
    check() {
      const all = [...nextSel.flat(), ...outSel.flat()];
      if (all.some(s => s.value === '')) return { incomplete: true, feedback: 'Vyplň celú tabuľku.' };
      let bad = 0;
      aut.states.forEach((_, i) => {
        labels.forEach((__, x) => { const ok = Number(nextSel[i][x].value) === aut.next[i][x]; nextSel[i][x].className = ok ? 'ok' : 'bad'; bad += !ok; });
        outSel[i].forEach((sel, x) => { const want = type === 'moore' ? aut.out[i] : aut.out[i][x]; const ok = Number(sel.value) === want; sel.className = ok ? 'ok' : 'bad'; bad += !ok; });
      });
      return { ok: !bad, score: 1 - bad / all.length, feedback: bad ? `Chybných políčok: ${bad}. Pri každom stave prejdi všetky šípky, ktoré z neho vychádzajú.` : '' };
    },
    solution: () => fsmTable(aut),
    summary: { prompt: `graf → tabuľka (${type}, ${aut.states.length} stavy)`, correct: '' },
  };
}

// zredukuje automat na minimálny (spojí ekvivalentné stavy, zahodí nedosiahnuteľné)
export function reduce(aut) {
  const { classes } = A.minimalStateCount(aut);
  const order = []; const seen = new Set();
  const bfs = [aut.start];
  while (bfs.length) { const s = bfs.shift(); const ci = classes.findIndex(c => c.includes(s)); if (seen.has(ci)) continue; seen.add(ci); order.push(ci); aut.next[s].forEach(t => bfs.push(t)); }
  const cls = (s) => order.indexOf(classes.findIndex(c => c.includes(s)));
  const rep = order.map(ci => classes[ci][0]);
  return { type: aut.type, states: A.names(rep.length), start: 0, next: rep.map(s => aut.next[s].map(cls)), out: rep.map(s => aut.out[s]), inputNames: aut.inputNames };
}

// ---------- Moore ↔ Mealy ----------
function genPrevod({ level }) {
  const toMealy = Math.random() < 0.5;
  const src = toMealy ? randomAutomaton(level === 1 ? 3 : 4, 'moore') : randomAutomaton(3, 'mealy');
  const ed = fsmEditor(toMealy ? 'mealy' : 'moore', { initialStates: toMealy ? src.states.length : 4 });
  const ref = toMealy ? A.mooreToMealy(src) : A.mealyToMoore(src);
  const refMin = A.minimalStateCount(ref).minimal;
  return {
    el: h('div', h('p', { html: toMealy ? 'Preveď Moorov automat na <b>ekvivalentný Mealyho</b> automat (rovnaká výstupná postupnosť, bez počiatočného výstupu Moora).' : 'Preveď Mealyho automat na <b>ekvivalentný Moorov</b> automat (výstupy po každom vstupe sa musia zhodovať).' }),
      h('div.row.top', { style: { gap: '20px' } }, fsmSVG(src), fsmTable(src)), h('h3', 'Tvoj automat'), ed.el),
    check() {
      const u = ed.read();
      if (!u) return { incomplete: true, feedback: 'Vyplň celú tabuľku.' };
      const cmpU = toMealy ? u : A.mooreToMealy(u);
      const cmpR = toMealy ? ref : src;
      const eq = A.equivalent(cmpR, cmpU);
      if (!eq.equal) {
        const inp = eq.counter;
        return { ok: false, feedback: `Nie je ekvivalentný. Pre vstup <b class="mono">${inp.join(' ')}</b> majú byť výstupy <b class="mono">${A.simulate(cmpR, inp).outputs.join(' ')}</b>, tvoj dáva <b class="mono">${A.simulate(cmpU, inp).outputs.join(' ')}</b>.` };
      }
      return { ok: true, feedback: toMealy ? 'Výstup prechodu = výstup cieľového stavu.' : `Minimálny Moorov automat má ${refMin} stavov.` };
    },
    solution() {
      const r = reduce(ref);
      return h('div', h('p', { html: toMealy ? 'Mealy: výstup na hrane s → t pri vstupe x je výstup Moorovho stavu t.' : 'Moore: stav, do ktorého sa vchádza s rôznymi výstupmi, rozdelíme na viac stavov (stav × výstup). Výstup nového stavu je výstup hrany, ktorou sa doň vošlo.' }),
        h('div.row.top', { style: { gap: '20px' } }, fsmSVG(r), fsmTable(r)));
    },
    summary: { prompt: toMealy ? 'Moore → Mealy' : 'Mealy → Moore', correct: '' },
  };
}

// ---------- minimalizácia ----------
function genMinimalizacia({ level }) {
  const type = pick(['moore', 'mealy']);
  let aut, m;
  for (let attempt = 0; attempt < 200; attempt++) {
    const base = randomAutomaton(level === 1 ? 2 : 3, type);
    // rozšírime o kópie stavov (kópia má rovnaké výstupy aj prechody → je ekvivalentná)
    const extra = level === 3 ? 3 : 2;
    aut = JSON.parse(JSON.stringify(base));
    for (let e = 0; e < extra; e++) {
      const orig = rint(0, base.states.length - 1);
      const id = aut.next.length;
      aut.next.push([...aut.next[orig]]);
      aut.out.push(JSON.parse(JSON.stringify(aut.out[orig])));
      let moved = 0;
      aut.next.forEach((row, s2) => row.forEach((t, x) => { if (t === orig && s2 !== id && Math.random() < 0.5) { aut.next[s2][x] = id; moved++; } }));
      if (!moved) { const s2 = rint(0, id - 1); aut.next[s2][rint(0, 1)] = id; }
    }
    aut.states = A.names(aut.next.length);
    m = A.minimalStateCount(aut);
    if (m.reachable === aut.states.length && m.minimal === base.states.length) break;
  }
  // premiešaj mená, aby kópie neboli na konci
  const sel = aut.states.map(() => h('select', h('option', { value: '' }, '–'), ['I', 'II', 'III', 'IV', 'V', 'VI'].map(c => h('option', { value: c }, c))));
  const reach = new Set(m.classes.flat());
  return {
    el: h('div', h('p', 'Nájdi ekvivalentné stavy: každému stavu priraď triedu (I, II, III…). Ekvivalentné stavy dostanú rovnakú triedu. Nedosiahnuteľné stavy tu nie sú.'),
      h('div.row.top', { style: { gap: '20px' } }, fsmTable(aut), fsmSVG(aut)),
      h('table.t', { style: { marginTop: '10px' } }, h('tr', h('th', 'stav'), aut.states.map(s => h('th', s))), h('tr', h('th', 'trieda'), sel.map(s => h('td', s))))),
    check() {
      if (sel.some(s => !s.value)) return { incomplete: true, feedback: 'Priraď triedu každému stavu.' };
      const userCls = sel.map(s => s.value);
      const truth = aut.states.map((_, i) => m.classes.findIndex(c => c.includes(i)));
      let ok = true;
      for (let i = 0; i < truth.length; i++) for (let j = 0; j < truth.length; j++) if ((truth[i] === truth[j]) !== (userCls[i] === userCls[j])) ok = false;
      const desc = m.classes.map(c => '{' + c.map(i => aut.states[i]).join(', ') + '}').join(' ');
      return { ok, feedback: ok ? `Minimálny automat má ${m.minimal} stavov: ${desc}.` : `Správny rozklad: ${desc} (${m.minimal} stavov).`, correct: desc };
    },
    solution() {
      const desc = m.classes.map(c => '{' + c.map(i => aut.states[i]).join(', ') + '}').join(' ');
      return h('div', h('p', { html: `Postup rozkladom: najprv rozdeľ stavy podľa výstupov${type === 'mealy' ? ' (riadok výstupov pre x = 0, 1)' : ''}. Potom opakovane rozdeľuj triedy, ktorých stavy prechádzajú pri rovnakom vstupe do rôznych tried, až kým sa nič nezmení.` }),
        h('p', { html: `Výsledok: <b>${desc}</b>` }), h('div.row.top', { style: { gap: '20px' } }, fsmSVG(reduce(aut)), fsmTable(reduce(aut))));
    },
    summary: { prompt: `minimalizácia ${type} (${aut.states.length} stavov)`, correct: `${m.minimal} stavov` },
  };
}

export default {
  id: 'automaty', title: 'Konečné automaty', icon: '⟳',
  desc: 'Moore a Mealy: simulácia, návrh zo slovného opisu, prevody, minimalizácia',
  intro: 'Príprava na TEST 3 (stavový automat). Návrh sa kontroluje podľa správania – mená stavov môžu byť ľubovoľné, pri chybe dostaneš najkratší protipríklad.',
  modes: [
    { id: 'simulacia', label: 'Simulácia (odozva)', levels: true, gen: genSimulacia },
    { id: 'graf', label: 'Graf → tabuľka', levels: true, gen: genGraf },
    { id: 'navrh', label: 'Návrh automatu', gen: genNavrh },
    { id: 'prevod', label: 'Moore ↔ Mealy', levels: true, gen: genPrevod },
    { id: 'minimalizacia', label: 'Ekvivalentné stavy', levels: true, gen: genMinimalizacia },
  ],
};
