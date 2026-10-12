// Číselné sústavy, kódy čísel, sčítanie v doplnkovom kóde, kódy číslic
import { h, esc, rint, pick } from '../core/ui.js';
import * as N from '../lib/numbers.js';

const BASE_NAME = { 2: 'BIN', 8: 'OCT', 10: 'DEC', 16: 'HEX' };
const sub = (s, b) => `<span class="mono">${esc(s)}</span><sub>${b}</sub>`;
const norm = (s) => String(s).trim().toUpperCase().replace(/\s+/g, '').replace(',', '.').replace(/^0+(?=[0-9A-F])/, '');
const normBits = (s) => String(s).replace(/\s+/g, '');

function divisionSteps(v, base) {
  const rows = [];
  let x = v;
  if (x === 0) rows.push([0, 0, 0]);
  while (x > 0) { rows.push([x, Math.floor(x / base), x % base]); x = Math.floor(x / base); }
  return `<table class="t compact"><tr><th>číslo</th><th>: ${base}</th><th>zvyšok</th></tr>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td><b>${N.DIGITS[r[2]]}</b></td></tr>`).join('')}</table>
  <p class="small">Zvyšky čítame <b>odspodu nahor</b>: ${sub(N.toBase(v, base), base)}</p>`;
}
function positional(str, base) {
  const digits = str.toUpperCase().split('');
  const parts = digits.map((d, i) => `${N.DIGITS.indexOf(d)}·${base}<sup>${digits.length - 1 - i}</sup>`);
  return `<p>${sub(str, base)} = ${parts.join(' + ')} = <b>${N.fromBase(str, base)}</b></p>`;
}
function grouping(bin, k, base) {
  const padded = bin.padStart(Math.ceil(bin.length / k) * k, '0');
  const groups = padded.match(new RegExp(`.{${k}}`, 'g'));
  return `<p>Zoskupíme po ${k} bity sprava: ${groups.map(g => `<span class="mono">${g}</span>`).join(' | ')} → ${groups.map(g => `<b>${N.DIGITS[parseInt(g, 2)]}</b>`).join(' ')} = ${sub(N.toBase(parseInt(bin, 2), base), base)}</p>`;
}

function genPrevod({ level }) {
  const pairs = level === 1 ? [[10, 2], [2, 10]] : [[10, 2], [2, 10], [2, 16], [16, 2], [10, 16], [16, 10], [2, 8], [8, 2], [16, 8]];
  const [from, to] = pick(pairs);
  if (level === 3 && Math.random() < 0.6) return genFraction();
  const max = level === 1 ? 255 : level === 2 ? 4095 : 65535;
  const v = rint(level === 1 ? 5 : 30, max);
  const src = N.toBase(v, from), ans = N.toBase(v, to);
  const input = h('input.mono', { style: { width: '14em' }, placeholder: `číslo v ${BASE_NAME[to]}` });
  return {
    el: h('div', h('p', { html: `Preveď ${sub(src, from)} do sústavy so základom <b>${to}</b> (${BASE_NAME[to]}).` }),
      h('div.row', h('span', { html: `${sub(src, from)} = ` }), input, h('sub', to))),
    check() {
      if (!input.value.trim()) return { incomplete: true, feedback: 'Napíš výsledok.' };
      const ok = norm(input.value) === norm(ans);
      return { ok, feedback: ok ? '' : `Správne je ${sub(ans, to)}.`, correct: ans };
    },
    solution() {
      let s = '';
      if (from === 10) s = divisionSteps(v, to);
      else if (to === 10) s = positional(src, from);
      else if (from === 2 && (to === 16 || to === 8)) s = grouping(src, to === 16 ? 4 : 3, to);
      else if (to === 2) s = `<p>Každú číslicu prepíšeme na ${from === 16 ? 4 : 3} bity: ${src.split('').map(d => `<b>${d}</b> → <span class="mono">${N.pad(N.toBase(N.DIGITS.indexOf(d), 2), from === 16 ? 4 : 3)}</span>`).join(', ')}</p><p>Výsledok: ${sub(ans, 2)} (úvodné nuly môžeš vynechať)</p>`;
      else { const bin = N.toBase(v, 2); s = `<p>Cez dvojkovú sústavu: ${sub(src, from)} = ${sub(bin, 2)}</p>` + grouping(bin, 3, 8); }
      return s;
    },
    summary: { prompt: `${src}<sub>${from}</sub> → základ ${to}`, correct: ans },
    given: () => input.value,
  };
}

function genFraction() {
  const whole = rint(1, 60), den = pick([4, 8, 16]), num = rint(1, den - 1);
  const v = whole + num / den;
  const k = Math.log2(den);
  const ans = N.toBase(whole, 2) + '.' + N.fractionToBase(num / den, 2, k).replace(/0+$/, '');
  const input = h('input.mono', { style: { width: '14em' } });
  return {
    el: h('div', h('p', { html: `Preveď desatinné číslo <b>${String(v).replace('.', ',')}</b><sub>10</sub> do dvojkovej sústavy.` }), h('div.row', input, h('sub', 2))),
    check() {
      const g = norm(input.value).replace(/0+$/, '').replace(/\.$/, '');
      const ok = g === norm(ans);
      return { ok, feedback: ok ? '' : `Správne je ${sub(ans, 2)}.`, correct: ans };
    },
    solution() {
      let f = num / den, rows = '';
      for (let i = 0; i < k && f > 0; i++) { const x = f * 2; rows += `<tr><td>${f} · 2</td><td>${x}</td><td><b>${Math.floor(x)}</b></td></tr>`; f = x - Math.floor(x); }
      return `<p>Celú časť ${whole} prevedieme delením: ${sub(N.toBase(whole, 2), 2)}.</p><p>Desatinnú časť <b>násobíme dvomi</b> a odoberáme celé časti (čítame zhora):</p>
      <table class="t compact"><tr><th>výpočet</th><th>výsledok</th><th>bit</th></tr>${rows}</table><p>Spolu: ${sub(ans, 2)}</p>`;
    },
    summary: { prompt: `${v} → BIN`, correct: ans },
    given: () => input.value,
  };
}

function genKody({ level }) {
  const n = level === 1 ? 8 : pick([6, 8, 8, 10]);
  const reverse = level >= 2 && Math.random() < 0.4;
  const lim = 2 ** (n - 1) - 1;
  const v = Math.random() < 0.8 ? -rint(1, lim) : rint(0, lim);
  if (reverse) {
    const code = pick(['priamy', 'inverzný', 'doplnkový']);
    const bits = code === 'priamy' ? N.signMagnitude(v, n) : code === 'inverzný' ? N.onesComplement(v, n) : N.twosComplement(v, n);
    const input = h('input', { type: 'number', style: { width: '8em' } });
    return {
      el: h('div', h('p', { html: `Aké číslo (v desiatkovej sústave) predstavuje ${n}-bitový zápis <b class="mono">${bits}</b> v <b>${code}m kóde</b>?` }), input),
      check() { const ok = Number(input.value) === v && input.value !== ''; return { ok, feedback: ok ? '' : `Správne je <b>${v}</b>.`, correct: String(v) }; },
      solution() {
        if (bits[0] === '0') return `<p>Znamienkový bit je 0, číslo je kladné: ${sub(bits, 2)} = <b>${v}</b>.</p>`;
        if (code === 'priamy') return `<p>Prvý bit 1 = mínus, zvyšné bity sú absolútna hodnota: <span class="mono">${bits.slice(1)}</span> = ${-v} → <b>${v}</b>.</p>`;
        if (code === 'inverzný') return `<p>Prvý bit 1 = záporné. Invertujeme všetky bity: <span class="mono">${bits.split('').map(c => c === '0' ? 1 : 0).join('')}</span> = ${-v} → <b>${v}</b>.</p>`;
        const inv = bits.split('').map(c => c === '0' ? '1' : '0').join('');
        return `<p>Prvý bit 1 = záporné. Invertujeme <span class="mono">${inv}</span> a pripočítame 1 → <span class="mono">${N.pad(N.toBase(-v, 2), n)}</span> = ${-v} → <b>${v}</b>.</p><p class="small muted">Alebo: váha znamienkového bitu je −2<sup>${n - 1}</sup>: −${2 ** (n - 1)} + ${parseInt(bits.slice(1), 2)} = ${v}.</p>`;
      },
      summary: { prompt: `${bits} v ${code}m kóde (${n} b)`, correct: String(v) },
      given: () => input.value,
    };
  }
  const want = { priamy: N.signMagnitude(v, n), inverzný: N.onesComplement(v, n), doplnkový: N.twosComplement(v, n) };
  const inputs = Object.fromEntries(Object.keys(want).map(k => [k, h('input.bits', { placeholder: '0'.repeat(n), maxlength: n + 4, style: { width: (n * 0.75 + 2) + 'em' } })]));
  return {
    el: h('div', h('p', { html: `Zapíš číslo <b>${v}</b> v ${n}-bitovom kóde:` }),
      h('table.t', Object.keys(want).map(k => h('tr', h('th.l', k + ' kód'), h('td', inputs[k]))))),
    check() {
      let good = 0;
      for (const k of Object.keys(want)) { const ok = normBits(inputs[k].value) === want[k]; inputs[k].classList.toggle('ok', ok); inputs[k].classList.toggle('bad', !ok); if (ok) good++; }
      return { ok: good === 3, score: good / 3, feedback: good === 3 ? '' : Object.entries(want).map(([k, b]) => `${k}: <b class="mono">${b}</b>`).join(' · '), correct: Object.values(want).join(' / ') };
    },
    solution() {
      const a = N.pad(N.toBase(Math.abs(v), 2), n - 1);
      if (v >= 0) return `<p>Pre kladné číslo sú všetky tri kódy rovnaké: <span class="mono">0${a}</span>.</p>`;
      return `<ul><li><b>priamy:</b> znamienko 1 + absolútna hodnota ${-v} = <span class="mono">${a}</span> → <span class="mono">${want.priamy}</span></li>
        <li><b>inverzný:</b> invertujeme všetky bity kladného ${-v} = <span class="mono">${N.pad(N.toBase(-v, 2), n)}</span> → <span class="mono">${want.inverzný}</span></li>
        <li><b>doplnkový:</b> inverzný + 1 → <span class="mono">${want.doplnkový}</span></li></ul>`;
    },
    summary: { prompt: `${v} v ${n}-bitových kódoch`, correct: Object.values(want).join(' / ') },
    given: () => Object.values(inputs).map(i => i.value).join(' / '),
  };
}

function genScitanie({ level }) {
  const n = level === 1 ? 4 : level === 2 ? 6 : 8;
  const [lo, hi] = N.ranges(n).twos;
  const wantOverflow = Math.random() < 0.4;
  let a, b, op;
  for (let i = 0; i < 200; i++) {
    a = rint(lo, hi); b = rint(lo, hi); op = Math.random() < 0.35 ? '-' : '+';
    if (op === '-' && b === lo) continue;
    const s = op === '+' ? a + b : a - b;
    if ((s < lo || s > hi) === wantOverflow) break;
  }
  const bb = op === '+' ? b : -b;
  const r = N.addTwos(a, bb, n);
  const res = h('input.bits', { placeholder: '0'.repeat(n), style: { width: (n * 0.75 + 2) + 'em' } });
  const ov = h('select', h('option', { value: '' }, '—'), h('option', { value: '1' }, 'áno'), h('option', { value: '0' }, 'nie'));
  return {
    el: h('div', h('p', { html: `Vypočítaj v <b>${n}-bitovom doplnkovom kóde</b>: <b>${a} ${op} ${b < 0 && op === '-' ? '(' + b + ')' : b}</b>` }),
      h('table.t', h('tr', h('th.l', 'výsledok (bity)'), h('td', res)), h('tr', h('th.l', 'nastalo pretečenie?'), h('td', ov)))),
    check() {
      if (!ov.value) return { incomplete: true, feedback: 'Vyber, či nastalo pretečenie.' };
      const okBits = normBits(res.value) === r.bits, okOv = (ov.value === '1') === r.overflow;
      res.classList.toggle('ok', okBits); res.classList.toggle('bad', !okBits);
      ov.className = okOv ? 'ok' : 'bad';
      return { ok: okBits && okOv, score: (okBits + okOv) / 2, feedback: okBits && okOv ? (r.overflow ? 'Pretečenie: výsledok mimo rozsahu, bity nedávajú správnu hodnotu.' : `Výsledok ${r.value}.`) : `Správne: <b class="mono">${r.bits}</b>, pretečenie: <b>${r.overflow ? 'áno' : 'nie'}</b>.`, correct: `${r.bits}, ${r.overflow ? 'pretečenie' : 'bez pretečenia'}` };
    },
    solution() {
      const A = N.twosComplement(a, n), Bv = N.twosComplement(bb, n);
      const sub2 = op === '-' ? `<p>Odčítanie = pripočítanie opačného čísla: ${a} − ${b} = ${a} + (${-b}).</p>` : '';
      // prenosy
      let carry = 0, carries = '';
      for (let i = n - 1; i >= 0; i--) { const s = Number(A[i]) + Number(Bv[i]) + carry; carry = s >> 1; carries = carry + carries; }
      return `${sub2}<pre class="code">  prenosy: ${carries}
       ${A}   (${a})
     + ${Bv}   (${bb})
     ${'-'.repeat(n + 2)}
       ${r.bits}   ${r.overflow ? '→ pretečenie!' : '(' + r.value + ')'}</pre>
      <p>Rozsah ${n}-bitového doplnkového kódu je ${lo} až ${hi}. Skutočný súčet je ${a + bb}${r.overflow ? ', čo sa doň <b>nezmestí</b>' : ', zmestí sa'}.</p>
      <p class="small">Pravidlo: pretečenie nastane, keď sčítame dve čísla s <b>rovnakým znamienkom</b> a výsledok má <b>opačné</b> znamienko (prenos do znamienkového bitu ≠ prenos zo znamienkového bitu). Prenos z najvyššieho bitu sa zahodí.</p>`;
    },
    summary: { prompt: `${a} ${op} ${b} (${n} b, doplnkový kód)`, correct: r.bits },
    given: () => `${res.value}, ${ov.value === '1' ? 'pretečenie' : 'bez'}`,
  };
}

function genRozsahy() {
  const n = rint(3, 16);
  const kind = pick(['bez znamienka', 'priamy kód', 'inverzný kód', 'doplnkový kód']);
  const R = N.ranges(n);
  const [lo, hi] = kind === 'bez znamienka' ? R.unsigned : kind === 'priamy kód' ? R.signMagnitude : kind === 'inverzný kód' ? R.ones : R.twos;
  const a = h('input', { type: 'number', style: { width: '8em' } }), b = h('input', { type: 'number', style: { width: '8em' } });
  return {
    el: h('div', h('p', { html: `Aký je rozsah <b>${n}-bitového</b> čísla (${kind})?` }), h('div.row', 'od', a, 'do', b)),
    check() {
      const ok = Number(a.value) === lo && Number(b.value) === hi && a.value !== '' && b.value !== '';
      return { ok, feedback: ok ? '' : `Rozsah je <b>${lo}</b> až <b>${hi}</b>.`, correct: `${lo} … ${hi}` };
    },
    solution() {
      return `<ul><li>bez znamienka: 0 … 2<sup>n</sup> − 1</li><li>priamy a inverzný: −(2<sup>n−1</sup> − 1) … 2<sup>n−1</sup> − 1 (dve nuly)</li><li>doplnkový: −2<sup>n−1</sup> … 2<sup>n−1</sup> − 1 (jedna nula, o jedno záporné číslo viac)</li></ul><p>Pre n = ${n}: <b>${lo} … ${hi}</b></p>`;
    },
    summary: { prompt: `rozsah ${n} b, ${kind}`, correct: `${lo}…${hi}` },
    given: () => `${a.value}…${b.value}`,
  };
}

function genKodyCislic({ level }) {
  const codes = Object.keys(N.DIGIT_CODES);
  const code = level === 1 ? pick(['8421 (BCD)', 'Excess-3 (+3)']) : pick(codes);
  const digits = level === 1 ? 2 : 3;
  const num = rint(10 ** (digits - 1), 10 ** digits - 1);
  const want = String(num).split('').map(d => N.pad(N.toBase(N.DIGIT_CODES[code][Number(d)], 2), 4)).join(' ');
  const decode = level >= 2 && Math.random() < 0.4;
  const input = h('input.mono', { style: { width: decode ? '8em' : '16em' } });
  const table = h('table.t.compact', h('tr', h('th', 'číslica'), [...Array(10).keys()].map(d => h('th', d))), h('tr', h('th', code), N.DIGIT_CODES[code].map(c => h('td.mono', N.pad(N.toBase(c, 2), 4)))));
  return {
    el: h('div', decode
      ? h('p', { html: `Aké desiatkové číslo je zapísané v kóde <b>${code}</b>: <b class="mono">${want}</b>?` })
      : h('p', { html: `Zapíš číslo <b>${num}</b> v kóde <b>${code}</b> (každá číslica 4 bity).` }),
      level < 3 ? h('details', h('summary.small.muted', 'Zobraziť tabuľku kódu'), table) : null, input),
    check() {
      const ok = decode ? Number(input.value) === num : normBits(input.value) === want.replace(/ /g, '');
      return { ok, feedback: ok ? '' : `Správne je <b class="mono">${decode ? num : want}</b>.`, correct: decode ? String(num) : want };
    },
    solution() { return h('div', h('p', { html: `Každú číslicu kódujeme samostatne: ${String(num).split('').map((d, i) => `${d} → <span class="mono">${want.split(' ')[i]}</span>`).join(', ')}` }), table); },
    summary: { prompt: decode ? `${want} (${code}) → DEC` : `${num} → ${code}`, correct: decode ? String(num) : want },
    given: () => input.value,
  };
}

function genGray() {
  const n = pick([3, 4, 4, 5]);
  const v = rint(1, 2 ** n - 1);
  const toGray = Math.random() < 0.5;
  const bin = N.pad(N.toBase(v, 2), n), g = N.pad(N.toBase(N.gray(v), 2), n);
  const input = h('input.bits', { style: { width: (n + 3) + 'em' } });
  return {
    el: h('div', h('p', { html: toGray ? `Preveď binárne číslo <b class="mono">${bin}</b> do <b>Grayovho kódu</b>.` : `Grayov kód <b class="mono">${g}</b> preveď na binárne číslo.` }), input),
    check() { const ok = normBits(input.value) === (toGray ? g : bin); return { ok, feedback: ok ? '' : `Správne je <b class="mono">${toGray ? g : bin}</b>.`, correct: toGray ? g : bin }; },
    solution() {
      return toGray ? `<p>Prvý bit opíšeme, každý ďalší je XOR dvoch susedných bitov binárneho čísla: g<sub>i</sub> = b<sub>i</sub> ⊕ b<sub>i−1</sub>.</p><p class="mono">${bin} → ${g}</p>`
        : `<p>Prvý bit opíšeme, každý ďalší binárny bit = predchádzajúci <b>binárny</b> bit ⊕ aktuálny Grayov bit.</p><p class="mono">${g} → ${bin}</p>`;
    },
    summary: { prompt: toGray ? `${bin} → Gray` : `Gray ${g} → BIN`, correct: toGray ? g : bin },
    given: () => input.value,
  };
}

export default {
  id: 'sustavy', title: 'Číselné sústavy a kódy', icon: '🔢',
  desc: 'Prevody, priamy/inverzný/doplnkový kód, pretečenie, BCD, Grayov kód',
  intro: 'Prevody medzi sústavami, kódy záporných čísel a sčítanie v doplnkovom kóde. Riešenie ukazuje celý postup.',
  modes: [
    { id: 'prevod', label: 'Prevody sústav', levels: true, gen: genPrevod },
    { id: 'kody', label: 'Priamy / inverzný / doplnkový', levels: true, gen: genKody },
    { id: 'scitanie', label: 'Sčítanie a pretečenie', levels: true, gen: genScitanie },
    { id: 'rozsahy', label: 'Rozsahy', gen: genRozsahy },
    { id: 'bcd', label: 'Kódy číslic (BCD…)', levels: true, gen: genKodyCislic },
    { id: 'gray', label: 'Grayov kód', gen: genGray },
  ],
};
