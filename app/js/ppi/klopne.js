// Preklápacie (klopné) obvody: časové priebehy, budiace tabuľky, charakteristické rovnice, realizácia PO pomocou iného PO
import { h, mount, esc, pick, rint, shuffle } from '../core/ui.js';
import * as B from '../lib/boolean.js';
import * as A from '../lib/automata.js';
import { fx, exprInput, syntaxHelp, judgeMinimal, impsHTML, varHTML, kmap, valuesFrom, COLORS } from './common.js';

export const FF_INPUTS = { D: ['D'], T: ['T'], JK: ['J', 'K'], SR: ['S', 'R'] };
const lower = (x) => x.toLowerCase();

function randomInputs(type, len) {
  const ins = FF_INPUTS[type];
  return Array.from({ length: len }, () => {
    let v;
    do { v = Object.fromEntries(ins.map(i => [lower(i), Math.random() < 0.5 ? 1 : 0])); } while (type === 'SR' && v.s && v.r);
    return v;
  });
}

// SVG časového diagramu. rows: [{ label, values: [..] (po taktoch), offset: 0 | 0.5 }], user: riadok na klikanie
function waveSVG({ periods, rows, userRow, onToggle, wrong = [] }) {
  const W = 56, H = 26, L = 54, gap = 16;
  const totalRows = rows.length + 1 + (userRow ? 1 : 0);
  const width = L + periods * W + 20, height = totalRows * (H + gap) + 10;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
  const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, width: Math.round(width * 1.45), height: Math.round(height * 1.45) });
  const yOf = (r) => 8 + r * (H + gap);
  // hodiny: nízko v prvej polovici, nábežná hrana v strede periódy
  let d = '', y0 = yOf(0);
  for (let k = 0; k < periods; k++) {
    const x = L + k * W;
    d += `${k ? 'L' : 'M'}${x},${y0 + H} L${x + W / 2},${y0 + H} L${x + W / 2},${y0} L${x + W},${y0} L${x + W},${y0 + H} `;
  }
  svg.append(el('path', { d, class: 'sig' }));
  const t = el('text', { x: 6, y: y0 + H - 6, class: 'lbl' }); t.textContent = 'CLK'; svg.append(t);
  for (let k = 0; k < periods; k++) {
    svg.append(el('line', { x1: L + k * W + W / 2, x2: L + k * W + W / 2, y1: 0, y2: height, class: 'edge' }));
  }
  const drawSig = (values, r, offset, cls) => {
    const y = yOf(r);
    let p = '';
    values.forEach((v, k) => {
      const x1 = Math.max(L, L + (k + offset) * W), x2 = Math.min(L + (k + 1 + offset) * W, L + periods * W);
      if (v == null) return;
      const yy = v ? y : y + H;
      p += `${p ? 'L' : 'M'}${x1},${yy} L${x2},${yy} `;
    });
    svg.append(el('path', { d: p, class: 'sig ' + (cls || '') }));
  };
  rows.forEach((row, i) => {
    drawSig(row.values, i + 1, row.offset || 0, row.cls);
    const tx = el('text', { x: 6, y: yOf(i + 1) + H - 6, class: 'lbl' }); tx.textContent = row.label; svg.append(tx);
  });
  if (userRow) {
    const r = rows.length + 1;
    const tx = el('text', { x: 6, y: yOf(r) + H - 6, class: 'lbl' }); tx.textContent = userRow.label; svg.append(tx);
    drawSig([userRow.initial], r, 0, 'user');
    // úseky po každej nábežnej hrane
    userRow.values.forEach((v, k) => {
      const x1 = L + k * W + W / 2, x2 = Math.min(x1 + W, L + periods * W);
      const rect = el('rect', { x: x1, y: yOf(r) - 4, width: x2 - x1, height: H + 8, class: 'slot' + (wrong.includes(k) ? ' bad' : '') });
      rect.addEventListener('click', () => onToggle(k));
      svg.append(rect);
    });
    const vals = [userRow.initial, ...userRow.values];
    let p = '';
    vals.forEach((v, k) => {
      const x1 = k === 0 ? L : L + (k - 1) * W + W / 2, x2 = k === 0 ? L + W / 2 : Math.min(L + k * W + W / 2, L + periods * W);
      if (v == null) { p += ''; return; }
      const yy = v ? yOf(r) : yOf(r) + H;
      p += `${p ? 'L' : 'M'}${x1},${yy} L${x2},${yy} `;
    });
    const path = el('path', { d: p, class: 'sig user' }); path.style.pointerEvents = 'none'; svg.append(path);
    userRow.values.forEach((v, k) => {
      if (v != null) return;
      const q = el('text', { x: L + k * W + W / 2 + W / 2 - 4, y: yOf(r) + H / 2 + 5 }); q.textContent = '?'; q.style.fill = 'var(--muted)'; q.style.pointerEvents = 'none'; svg.append(q);
    });
  }
  return svg;
}

function genPriebeh({ level }) {
  const type = level === 1 ? pick(['D', 'T']) : pick(['JK', 'JK', 'SR', 'T', 'D']);
  const periods = level === 1 ? 6 : 8;
  const inputs = randomInputs(type, periods);
  const q0 = rint(0, 1);
  const ref = []; let q = q0;
  inputs.forEach(inp => { q = A.ffNext(type, q, inp); ref.push(q); });
  const user = Array(periods).fill(null);
  const box = h('div.wave');
  let wrong = [];
  const render = () => mount(box, waveSVG({
    periods,
    rows: FF_INPUTS[type].map(i => ({ label: i, values: inputs.map(x => x[lower(i)]) })),
    userRow: { label: 'Q', initial: q0, values: user },
    wrong,
    onToggle: (k) => { user[k] = user[k] == null ? 1 : user[k] ? 0 : 1; wrong = []; render(); },
  }));
  render();
  return {
    el: h('div', h('p', { html: `Synchrónny <b>PO-${type}</b> reaguje na <b>nábežnú hranu</b> CLK (zvislé čiary). Počiatočný stav Q = ${q0}. Klikaním na úseky za hranami nakresli priebeh Q (klik: 1 → 0 → 1…).` }), box,
      h('p.small.muted', { html: { D: 'D: Q⁺ = D', T: 'T: T = 1 preklopí, T = 0 drží', JK: 'JK: 00 drží, 10 nastaví 1, 01 nastaví 0, 11 preklopí', SR: 'SR: 10 nastaví, 01 vynuluje, 00 drží, 11 je zakázané' }[type] })),
    check() {
      if (user.some(v => v == null)) return { incomplete: true, feedback: 'Nastav Q vo všetkých úsekoch.' };
      wrong = ref.map((v, k) => v !== user[k] ? k : -1).filter(k => k >= 0);
      render();
      return { ok: !wrong.length, score: 1 - wrong.length / periods, feedback: wrong.length ? `Chyba po hranách č. ${wrong.map(k => k + 1).join(', ')} (červené).` : '', correct: ref.join('') };
    },
    solution() {
      const s = h('div.wave');
      s.append(waveSVG({ periods, rows: [...FF_INPUTS[type].map(i => ({ label: i, values: inputs.map(x => x[lower(i)]) })), { label: 'Q', values: [q0, ...ref], offset: -0.5, cls: 'ref' }] }));
      const steps = inputs.map((inp, k) => `${k + 1}. ${FF_INPUTS[type].map(i => `${i}=${inp[lower(i)]}`).join(' ')} → ${A.ffCommand(type, inp)} → Q = ${ref[k]}`);
      return h('div', s, h('p.small', { html: steps.join('<br>') }));
    },
    summary: { prompt: `priebeh PO-${type}, Q0=${q0}, vstupy ${inputs.map(x => Object.values(x).join('')).join(' ')}`, correct: ref.join('') },
    given: () => user.map(v => v ?? '?').join(''),
  };
}

function genExcitacia() {
  const type = pick(['JK', 'SR', 'T', 'D', 'JK']);
  const ins = FF_INPUTS[type];
  const trans = [[0, 0], [0, 1], [1, 0], [1, 1]];
  const cells = trans.map(() => ins.map(() => h('select', ['', '0', '1', 'X'].map(v => h('option', { value: v }, v || '—')))));
  return {
    el: h('div', h('p', { html: `Doplň <b>budiacu tabuľku</b> (inverznú prechodovú funkciu p<sup>−1</sup>) pre <b>PO-${type}</b>: aké vstupy treba na prechod Q → Q⁺? Kde na vstupe nezáleží, daj X.` }),
      h('table.t', h('tr', h('th', 'Q'), h('th', 'Q⁺'), ins.map(i => h('th', i))), trans.map(([q, qn], r) => h('tr', h('td', q), h('td', qn), cells[r].map(c => h('td', c)))))),
    check() {
      let bad = 0, empty = 0;
      trans.forEach(([q, qn], r) => {
        const e = A.ffExcitation(type, q, qn);
        ins.forEach((i, k) => { const s = cells[r][k]; if (!s.value) empty++; const ok = s.value === e[i]; s.className = ok ? 'ok' : 'bad'; if (!ok) bad++; });
      });
      if (empty === trans.length * ins.length) return { incomplete: true, feedback: 'Vyplň tabuľku.' };
      return { ok: !bad, score: 1 - bad / (trans.length * ins.length), feedback: bad ? 'Červené políčka sú zle.' : '', correct: trans.map(([q, qn]) => Object.values(A.ffExcitation(type, q, qn)).join('')).join(' ') };
    },
    solution() {
      const rows = trans.map(([q, qn]) => `<tr><td>${q}</td><td>${qn}</td>${ins.map(i => `<td>${A.ffExcitation(type, q, qn)[i]}</td>`).join('')}</tr>`).join('');
      const tip = { JK: 'Pri Q = 0 rozhoduje iba J (K = X), pri Q = 1 iba K (J = X).', SR: 'Pri 0 → 0 stačí S = 0 (R = X), pri 1 → 1 stačí R = 0 (S = X).', T: 'T = Q ⊕ Q⁺ – jednotka iba pri zmene.', D: 'D = Q⁺ – vždy to, čo má byť ďalej.' }[type];
      return `<table class="t"><tr><th>Q</th><th>Q⁺</th>${ins.map(i => `<th>${i}</th>`).join('')}</tr>${rows}</table><p class="small">${tip}</p>`;
    },
    summary: { prompt: `budiaca tabuľka PO-${type}`, correct: '' },
  };
}

function charFunc(type) {
  // premenné: vstupy PO + Q (Q ako najnižší bit)
  const ins = FF_INPUTS[type];
  const vars = [...ins, 'Q'];
  const ones = [], dcs = [];
  for (let idx = 0; idx < (1 << vars.length); idx++) {
    const env = {}; vars.forEach((v, k) => { env[v] = (idx >> (vars.length - 1 - k)) & 1; });
    const nx = A.ffNext(type, env.Q, Object.fromEntries(ins.map(i => [lower(i), env[i]])));
    if (nx === null) dcs.push(idx); else if (nx) ones.push(idx);
  }
  return { vars, ones, dcs };
}
function genCharakteristicka() {
  const type = pick(['JK', 'SR', 'T', 'D']);
  const { vars, ones, dcs } = charFunc(type);
  const inp = exprInput({ label: 'Q⁺', vars });
  return {
    el: h('div', h('p', { html: `Napíš <b>charakteristickú rovnicu</b> PO-${type}: Q⁺ ako funkciu vstupov ${FF_INPUTS[type].join(', ')} a súčasného stavu Q (v MDNF).${type === 'SR' ? ' Kombinácia S = R = 1 je zakázaná (X).' : ''}` }), inp.el, syntaxHelp()),
    check: () => judgeMinimal(inp.value, vars, ones, dcs, 'dnf'),
    solution() {
      const r = B.minimize(vars.length, ones, dcs);
      const km = kmap(vars.length, vars, valuesFrom(vars.length, ones, dcs), {});
      km.setMarks(r.solutions[0].map((p, i) => ({ imp: p, color: COLORS[i] })));
      return h('div.row.top', km.el, h('p', { html: fx('Q⁺ = ' + impsHTML(r.solutions[0], vars)) }));
    },
    summary: { prompt: `charakteristická rovnica PO-${type}`, correct: B.solutionText(B.minimize(vars.length, ones, dcs).solutions[0], vars) },
    given: () => inp.value,
  };
}

// Realizácia PO typu target pomocou PO typu base
function genPrevod() {
  const types = ['D', 'T', 'JK', 'SR'];
  let target, base;
  do { target = pick(types); base = pick(types); } while (target === base || (target === 'SR' && base === 'JK' && Math.random() < 0.5));
  const tins = FF_INPUTS[target], bins = FF_INPUTS[base];
  const vars = [...tins, 'Q'];
  const funcs = bins.map(() => ({ ones: [], dcs: [] }));
  for (let idx = 0; idx < (1 << vars.length); idx++) {
    const env = {}; vars.forEach((v, k) => { env[v] = (idx >> (vars.length - 1 - k)) & 1; });
    const nx = A.ffNext(target, env.Q, Object.fromEntries(tins.map(i => [lower(i), env[i]])));
    if (nx === null) { funcs.forEach(f => f.dcs.push(idx)); continue; }
    const e = A.ffExcitation(base, env.Q, nx);
    bins.forEach((b, k) => { if (e[b] === '1') funcs[k].ones.push(idx); else if (e[b] === 'X') funcs[k].dcs.push(idx); });
  }
  const inputs = bins.map(b => exprInput({ label: b, vars }));
  const correctAll = bins.map((b, k) => `${b} = ${B.solutionText(B.minimize(vars.length, funcs[k].ones, funcs[k].dcs).solutions[0], vars)}`).join('; ');
  return {
    el: h('div', h('p', { html: `Realizuj <b>PO-${target}</b> pomocou <b>PO-${base}</b> a kombinačnej logiky. Vyjadri vstupy ${bins.join(', ')} ako funkcie ${tins.join(', ')} a Q (MDNF).` }),
      h('p.small.muted', 'Postup: pre každú kombináciu vstupov nového PO a Q urči Q⁺ (charakteristika nového PO), potom z budiacej tabuľky pôvodného PO zisti potrebné vstupy.'),
      h('div.stack', inputs.map(i => i.el)), syntaxHelp()),
    check() {
      const rs = inputs.map((inp, k) => judgeMinimal(inp.value, vars, funcs[k].ones, funcs[k].dcs, 'dnf'));
      const inc = rs.find(r => r.incomplete); if (inc) return inc;
      rs.forEach((r, k) => inputs[k].mark(r.ok));
      const good = rs.filter(r => r.ok).length;
      return { ok: good === rs.length, score: rs.reduce((s, r) => s + (r.ok ? 1 : r.score || 0), 0) / rs.length, feedback: rs.map((r, k) => `<p><b>${bins[k]}:</b> ${r.ok ? '✓ ' : ''}${typeof r.feedback === 'string' ? r.feedback : ''}</p>`).join(''), correct: bins.map((b, k) => `${b} = ${B.solutionText(B.minimize(vars.length, funcs[k].ones, funcs[k].dcs).solutions[0], vars)}`).join('; ') };
    },
    solution() {
      const rows = [];
      for (let idx = 0; idx < (1 << vars.length); idx++) {
        const bits = idx.toString(2).padStart(vars.length, '0');
        const env = {}; vars.forEach((v, k) => { env[v] = Number(bits[k]); });
        const nx = A.ffNext(target, env.Q, Object.fromEntries(tins.map(i => [lower(i), env[i]])));
        const e = nx === null ? null : A.ffExcitation(base, env.Q, nx);
        rows.push(`<tr>${bits.split('').map(b => `<td>${b}</td>`).join('')}<td class="vsep">${nx ?? 'X'}</td>${bins.map(b => `<td>${e ? e[b] : 'X'}</td>`).join('')}</tr>`);
      }
      return `<table class="t compact"><tr>${vars.map(v => `<th>${v}</th>`).join('')}<th class="vsep">Q⁺</th>${bins.map(b => `<th>${b}</th>`).join('')}</tr>${rows.join('')}</table>
        <p>${bins.map((b, k) => fx(`${b} = ${impsHTML(B.minimize(vars.length, funcs[k].ones, funcs[k].dcs).solutions[0], vars)}`)).join('<br>')}</p>`;
    },
    summary: { prompt: `PO-${target} z PO-${base}`, correct: correctAll },
    given: () => inputs.map((i, k) => `${bins[k]} = ${i.value}`).join('; '),
  };
}

function genRychle() {
  const qs = Array.from({ length: 4 }, () => {
    const type = pick(['D', 'T', 'JK', 'SR']);
    const [inp] = randomInputs(type, 1);
    const q = rint(0, 1);
    return { type, inp, q, ans: A.ffNext(type, q, inp) };
  });
  const sels = qs.map(() => h('select', h('option', { value: '' }, '—'), h('option', { value: '0' }, '0'), h('option', { value: '1' }, '1')));
  return {
    el: h('div', h('p', 'Aký bude stav Q⁺ po nábežnej hrane?'), h('table.t', h('tr', h('th', 'PO'), h('th', 'Q'), h('th', 'vstupy'), h('th', 'Q⁺')),
      qs.map((x, k) => h('tr', h('td', 'PO-' + x.type), h('td', x.q), h('td.mono', FF_INPUTS[x.type].map(i => `${i}=${x.inp[lower(i)]}`).join(' ')), h('td', sels[k]))))),
    check() {
      if (sels.some(s => !s.value)) return { incomplete: true, feedback: 'Vyplň všetko.' };
      let good = 0;
      qs.forEach((x, k) => { const ok = Number(sels[k].value) === x.ans; sels[k].className = ok ? 'ok' : 'bad'; good += ok; });
      return { ok: good === 4, score: good / 4, feedback: qs.map(x => `PO-${x.type}: ${A.ffCommand(x.type, x.inp)} → ${x.ans}`).join('<br>') };
    },
    solution() { return qs.map(x => `PO-${x.type}, Q = ${x.q}: ${A.ffCommand(x.type, x.inp)} → Q⁺ = <b>${x.ans}</b>`).join('<br>'); },
    summary: { prompt: 'rýchle Q⁺', correct: qs.map(x => x.ans).join('') },
  };
}


// ---------- CV4: udalosti (zmena vstupu, zostupná a nábežná hrana, reset) ----------
const EVENT_TEXT = { rise: 'nábežná hrana ↑', fall: 'zostupná hrana ↓', reset: 'asynchrónny RESET (krátky impulz)' };
function genUdalosti({ level }) {
  const type = level === 1 ? 'D' : pick(['D', 'JK', 'T', 'D', 'JK']);
  const ins = FF_INPUTS[type];
  let q = rint(0, 1);
  const q0 = q;
  let clk = rint(0, 1);
  let cur = Object.fromEntries(ins.map(i => [lower(i), rint(0, 1)]));
  const start = { ...cur };
  const events = [];
  let rises = 0;
  const n = level === 1 ? 6 : 8;
  while (events.length < n || rises < 2) {
    const r = Math.random();
    if (level === 3 && r < 0.1 && events.length > 2 && !events.some(e => e.kind === 'reset')) {
      q = 0; events.push({ kind: 'reset', q });
    } else if (r < 0.45) {
      // zmena jedného vstupu
      const i = pick(ins);
      cur = { ...cur, [lower(i)]: 1 - cur[lower(i)] };
      events.push({ kind: 'in', name: i, value: cur[lower(i)], q });
    } else {
      const kind = clk ? 'fall' : 'rise';
      clk = 1 - clk;
      if (kind === 'rise') { q = A.ffNext(type, q, cur); rises++; }
      events.push({ kind, q, inp: { ...cur } });
    }
    if (events.length > 14) break;
  }
  const sels = events.map(() => h('select', h('option', { value: '' }, '–'), h('option', { value: '0' }, '0'), h('option', { value: '1' }, '1')));
  const desc = (e) => e.kind === 'in' ? `${e.name} sa zmení na ${e.value}` : EVENT_TEXT[e.kind];
  return {
    el: h('div', h('p', { html: `<b>PO-${type}</b> mení stav na <b>nábežnej hrane</b>. Na začiatku je Q = <b>${q0}</b>, ${startClk(events)}, ${ins.map(i => `${i} = ${start[lower(i)]}`).join(', ')}. Zapíš Q po každej udalosti.` }),
      h('table.t', h('tr', h('th', '#'), h('th.l', 'udalosť'), h('th', 'Q po udalosti')), events.map((e, k) => h('tr', h('td', k + 1), h('td.l', desc(e)), h('td', sels[k]))))),
    check() {
      if (sels.some(s => !s.value)) return { incomplete: true, feedback: 'Vyplň Q po každej udalosti.' };
      let bad = 0;
      events.forEach((e, k) => { const ok = Number(sels[k].value) === e.q; sels[k].className = ok ? 'ok' : 'bad'; bad += !ok; });
      return { ok: !bad, score: 1 - bad / events.length, feedback: bad ? 'Pamätaj: zmena vstupu ani zostupná hrana stav nemenia. Rozhoduje hodnota vstupu tesne pred nábežnou hranou.' : '', correct: events.map(e => e.q).join(' ') };
    },
    solution() {
      return h('table.t', h('tr', h('th', '#'), h('th.l', 'udalosť'), h('th.l', 'čo sa stane'), h('th', 'Q')), events.map((e, k) => h('tr', h('td', k + 1), h('td.l', desc(e)),
        h('td.l', e.kind === 'rise' ? `vstupy pred hranou ${ins.map(i => `${i}=${e.inp[lower(i)]}`).join(' ')} → ${A.ffCommand(type, e.inp)}` : e.kind === 'reset' ? 'reset pôsobí hneď, bez hrany → Q = 0' : 'stav sa nemení'),
        h('td', h('b', e.q)))));
    },
    summary: { prompt: `udalosti PO-${type}: ${events.map(desc).join(', ')}`, correct: events.map(e => e.q).join(' ') },
    given: () => sels.map(s => s.value || '?').join(' '),
  };
}
function startClk(events) {
  const first = events.find(e => e.kind === 'rise' || e.kind === 'fall');
  return `CLK = ${first && first.kind === 'fall' ? 1 : 0}`;
}

// ---------- CV4: príkaz, doterajší a nový stav pre každú hranu ----------
const COMMANDS = { D: ['zapíše 0', 'zapíše 1'], T: ['drží', 'preklopí'], JK: ['drží', 'nastaví (1)', 'vynuluje (0)', 'preklopí'], SR: ['drží', 'nastaví (1)', 'vynuluje (0)'] };
function genHrany({ level }) {
  const type = level === 1 ? pick(['JK', 'T']) : pick(['JK', 'JK', 'SR', 'T', 'D']);
  const ins = FF_INPUTS[type];
  const inputs = randomInputs(type, 5);
  let q = rint(0, 1);
  const q0 = q;
  const rows = inputs.map(inp => { const p = q; q = A.ffNext(type, q, inp); return { inp, cmd: A.ffCommand(type, inp), p, q }; });
  const mk = (opts) => h('select', h('option', { value: '' }, '–'), opts.map(o => h('option', { value: o }, o)));
  const cells = rows.map(() => ({ cmd: mk(COMMANDS[type]), p: mk(['0', '1']), q: mk(['0', '1']) }));
  return {
    el: h('div', h('p', { html: `<b>PO-${type}</b> začína v stave Q = <b>${q0}</b>. Na piatich nábežných hranách má (${ins.join(', ')}) postupne hodnoty ${inputs.map(x => '(' + ins.map(i => x[lower(i)]).join(',') + ')').join(', ')}. Pre každú hranu zapíš príkaz, doterajší a nový stav.` }),
      h('table.t', h('tr', h('th', 'hrana'), ins.map(i => h('th', i)), h('th', 'príkaz'), h('th', 'Q (doterajší)'), h('th', 'Q⁺ (nový)')),
        rows.map((r, k) => h('tr', h('td', k + 1), ins.map(i => h('td', r.inp[lower(i)])), h('td', cells[k].cmd), h('td', cells[k].p), h('td', cells[k].q))))),
    check() {
      if (cells.some(c => !c.cmd.value || !c.p.value || !c.q.value)) return { incomplete: true, feedback: 'Vyplň celú tabuľku.' };
      let bad = 0;
      rows.forEach((r, k) => {
        [[cells[k].cmd, r.cmd], [cells[k].p, String(r.p)], [cells[k].q, String(r.q)]].forEach(([s, w]) => { const ok = s.value === w; s.className = ok ? 'ok' : 'bad'; bad += !ok; });
      });
      return { ok: !bad, score: 1 - bad / (rows.length * 3), feedback: bad ? 'Doterajší stav hrany = nový stav predchádzajúcej hrany.' : '', correct: rows.map(r => `${r.cmd}: ${r.p}→${r.q}`).join(', ') };
    },
    solution() { return h('table.t', h('tr', h('th', 'hrana'), h('th', 'vstupy'), h('th', 'príkaz'), h('th', 'Q'), h('th', 'Q⁺')), rows.map((r, k) => h('tr', h('td', k + 1), h('td.mono', ins.map(i => r.inp[lower(i)]).join('')), h('td', r.cmd), h('td', r.p), h('td', h('b', r.q))))); },
    summary: { prompt: `PO-${type} od Q=${q0}: ${inputs.map(x => ins.map(i => x[lower(i)]).join('')).join(' ')}`, correct: rows.map(r => r.q).join('') },
    given: () => cells.map(c => `${c.cmd.value} ${c.p.value}→${c.q.value}`).join(', '),
  };
}

// ---------- CV4: potrebuje systém pamäť? ----------
const SYSTEMS = [
  ['kontrolka, ktorá svieti iba počas držania tlačidla', false, 'výstup závisí iba od aktuálneho stavu tlačidla'],
  ['dvojvstupové hradlo AND', false, 'výstup je funkcia aktuálnych vstupov'],
  ['dekodér 3 → 8', false, 'aktívny výstup určujú iba aktuálne adresové vstupy'],
  ['dekodér číslice pre 7-segmentový displej', false, 'segmenty závisia iba od práve privedenej číslice'],
  ['porovnávač dvoch 4-bitových čísel (A > B)', false, 'porovnáva iba aktuálne hodnoty'],
  ['sčítačka dvoch 4-bitových čísel', false, 'súčet je funkcia aktuálnych vstupov'],
  ['multiplexor 4 : 1', false, 'výstup = vstup vybraný aktuálnou adresou'],
  ['prevodník kódu BCD na Excess-3', false, 'každá výstupná kombinácia závisí iba od vstupnej'],
  ['siréna, ktorá znie, kým sú otvorené dvere a alarm je zapnutý', false, 'rozhodujú iba aktuálne hodnoty snímačov'],
  ['generátor parity z 8 bitov', false, 'parita aktuálnych bitov, bez histórie'],
  ['lampa, ktorá po krátkom stlačení tlačidla zostane svietiť', true, 'po pustení tlačidla si musí pamätať, že bola zapnutá'],
  ['počítadlo impulzov', true, 'musí si pamätať doterajší počet'],
  ['signalizácia dvoch po sebe idúcich jednotiek na vstupe', true, 'musí si pamätať predchádzajúci vstup'],
  ['semafor, ktorý v čase strieda fázy', true, 'musí vedieť, v ktorej fáze práve je'],
  ['detektor postupnosti 101', true, 'pamätá si, koľko z postupnosti už prišlo'],
  ['turniket, ktorý si pamätá vloženú mincu', true, 'stav odomknutý/zamknutý závisí od minulosti'],
  ['jedno tlačidlo, ktoré striedavo zapína a vypína svetlo', true, 'rovnaký vstup má iný účinok podľa doterajšieho stavu'],
  ['detektor zmeny vstupu z 0 na 1', true, 'potrebuje poznať predchádzajúcu hodnotu vstupu'],
  ['posuvný register', true, 'uchováva bity z predchádzajúcich taktov'],
  ['stopky', true, 'pamätajú si nameraný čas'],
];
function genPamat() {
  const items = shuffle(SYSTEMS).slice(0, 6);
  const sels = items.map(() => h('select', h('option', { value: '' }, '–'), h('option', { value: 'k' }, 'nepotrebuje (kombinačný)'), h('option', { value: 's' }, 'potrebuje (sekvenčný)')));
  return {
    el: h('div', h('p', 'Rozhodni, ktoré systémy potrebujú pamäť. Kľúčová otázka: stačí na určenie výstupu poznať aktuálne vstupy, alebo treba vedieť aj niečo z minulosti?'),
      h('table.t', items.map(([t], k) => h('tr', h('td.l', t), h('td', sels[k]))))),
    check() {
      if (sels.some(s => !s.value)) return { incomplete: true, feedback: 'Rozhodni pri všetkých systémoch.' };
      let bad = 0;
      items.forEach(([, mem], k) => { const ok = (sels[k].value === 's') === mem; sels[k].className = ok ? 'ok' : 'bad'; bad += !ok; });
      return { ok: !bad, score: 1 - bad / items.length, feedback: items.map(([t, mem, why]) => `<b>${t}</b>: ${mem ? 'potrebuje pamäť' : 'bez pamäte'} – ${why}.`).join('<br>') };
    },
    solution() { return items.map(([t, mem, why]) => `<b>${t}</b>: ${mem ? 'potrebuje pamäť (sekvenčný)' : 'nepotrebuje pamäť (kombinačný)'} – ${why}.`).join('<br>'); },
    summary: { prompt: 'pamäť: ' + items.map(i => i[0]).join('; '), correct: items.map(i => i[1] ? 'S' : 'K').join('') },
  };
}

export default {
  id: 'klopne', title: 'Klopné obvody', icon: '⏱',
  desc: 'PO-D, T, JK, SR: priebehy, budiace tabuľky, charakteristické rovnice, prevody',
  intro: 'Synchrónne preklápacie obvody reagujúce na nábežnú hranu hodín.',
  modes: [
    { id: 'udalosti', label: 'Udalosti a hrany (CV4)', levels: true, gen: genUdalosti },
    { id: 'hrany', label: 'Príkaz pre každú hranu', levels: true, gen: genHrany },
    { id: 'pamat', label: 'Potrebuje pamäť?', gen: genPamat },
    { id: 'priebeh', label: 'Časový priebeh', levels: true, gen: genPriebeh },
    { id: 'rychle', label: 'Rýchle Q⁺', gen: genRychle },
    { id: 'excitacia', label: 'Budiaca tabuľka p⁻¹', gen: genExcitacia },
    { id: 'charakteristicka', label: 'Charakteristická rovnica', gen: genCharakteristicka },
    { id: 'prevod', label: 'PO z iného PO', gen: genPrevod },
  ],
};
