// Číselné sústavy, kódy celých čísel a kódy desiatkových číslic.

export const DIGITS = '0123456789ABCDEF';

export function toBase(n, base) {
  if (n === 0) return '0';
  let s = '', x = Math.abs(n);
  while (x > 0) { s = DIGITS[x % base] + s; x = Math.floor(x / base); }
  return (n < 0 ? '-' : '') + s;
}

export function fromBase(str, base) {
  const s = String(str).trim().toUpperCase().replace(/^0[XB]/, '');
  if (!s) return NaN;
  let v = 0;
  for (const c of s) {
    const d = DIGITS.indexOf(c);
    if (d < 0 || d >= base) return NaN;
    v = v * base + d;
  }
  return v;
}

// desatinná časť → reťazec číslic v základe base (k číslic, orezané)
export function fractionToBase(frac, base, k) {
  let s = '';
  for (let i = 0; i < k; i++) { frac *= base; const d = Math.floor(frac + 1e-12); s += DIGITS[d]; frac -= d; }
  return s;
}

export const pad = (s, n) => s.padStart(n, '0');

// Kódy celých čísel v n bitoch
export function signMagnitude(v, n) {
  return (v < 0 ? '1' : '0') + pad(toBase(Math.abs(v), 2), n - 1);
}
export function onesComplement(v, n) {
  if (v >= 0) return pad(toBase(v, 2), n);
  return pad(toBase(-v, 2), n).split('').map(c => c === '0' ? '1' : '0').join('');
}
export function twosComplement(v, n) {
  const m = v < 0 ? (1 << n) + v : v;
  return pad(toBase(m, 2), n);
}
export function fromTwos(bits) {
  const n = bits.length, u = parseInt(bits, 2);
  return bits[0] === '1' ? u - (1 << n) : u;
}
export function ranges(n) {
  return {
    unsigned: [0, (1 << n) - 1],
    signMagnitude: [-(2 ** (n - 1) - 1), 2 ** (n - 1) - 1],
    ones: [-(2 ** (n - 1) - 1), 2 ** (n - 1) - 1],
    twos: [-(2 ** (n - 1)), 2 ** (n - 1) - 1],
  };
}
// súčet v doplnkovom kóde s detekciou pretečenia
export function addTwos(a, b, n) {
  const sum = a + b;
  const [lo, hi] = ranges(n).twos;
  const raw = ((a + b) % (1 << n) + (1 << n)) % (1 << n);
  return { bits: pad(toBase(raw, 2), n), overflow: sum < lo || sum > hi, value: fromTwos(pad(toBase(raw, 2), n)) };
}

export function gray(v) { return v ^ (v >> 1); }
export function fromGray(g) { let v = 0; for (; g; g >>= 1) v ^= g; return v; }

export function bcd(v) {
  return String(v).split('').map(d => pad(toBase(Number(d), 2), 4)).join(' ');
}

// Kódy desiatkových číslic (4 bity) – na úlohy s kódovými prevodníkmi
export const DIGIT_CODES = {
  '8421 (BCD)': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  'Aiken 2421': [0, 1, 2, 3, 4, 11, 12, 13, 14, 15],
  'Excess-3 (+3)': [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  '5421': [0, 1, 2, 3, 4, 8, 9, 10, 11, 12],
  'Grayov kód': [0, 1, 3, 2, 6, 7, 5, 4, 12, 13],
  '7421': [0, 1, 2, 3, 4, 5, 6, 8, 9, 10],
};
