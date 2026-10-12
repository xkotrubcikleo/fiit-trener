// Preklad a testovanie C programov (clang + AddressSanitizer/UBSan). Používa server aj tools/build-prpr.mjs.
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

let queue = Promise.resolve();
// programy sa spúšťajú po jednom, aby sa navzájom neovplyvňovali časové limity
export function enqueue(fn) { const p = queue.then(fn, fn); queue = p.catch(() => {}); return p; }

export function run(cmd, args, { cwd, input = '', timeout = 3000, maxOut = 200_000 } = {}) {
  return new Promise((resolve) => {
    const ch = spawn(cmd, args, { cwd, env: { PATH: process.env.PATH, ASAN_OPTIONS: 'detect_leaks=0:abort_on_error=0', UBSAN_OPTIONS: 'print_stacktrace=0' } });
    let out = '', err = '', killed = false, truncated = false;
    const timer = setTimeout(() => { killed = true; ch.kill('SIGKILL'); }, timeout);
    ch.stdout.on('data', d => { if (out.length < maxOut) out += d; else { truncated = true; ch.kill('SIGKILL'); } });
    ch.stderr.on('data', d => { if (err.length < maxOut) err += d; });
    ch.on('error', e => { clearTimeout(timer); resolve({ code: -1, out, err: String(e), killed }); });
    ch.on('close', (code, signal) => { clearTimeout(timer); resolve({ code, signal, out, err, killed, truncated }); });
    ch.stdin.on('error', () => {});
    ch.stdin.end(input);
  });
}

export function explainRuntime(r) {
  if (r.killed && !r.truncated) return 'Program neskončil do časového limitu (nekonečný cyklus, alebo čaká na vstup, ktorý nepríde).';
  if (r.truncated) return 'Program vypísal príliš veľa textu (pravdepodobne nekonečný cyklus s výpisom).';
  const e = r.err || '';
  if (/stack-buffer-overflow|heap-buffer-overflow|global-buffer-overflow|stack-buffer-underflow/.test(e)) return 'Prístup mimo poľa (čítanie alebo zápis za koniec poľa).';
  if (/heap-use-after-free/.test(e)) return 'Použitie pamäte po free().';
  if (/double-free|attempting double-free/.test(e)) return 'Dvojité uvoľnenie pamäte (free na ten istý ukazovateľ dvakrát).';
  if (/SEGV|segmentation/i.test(e) || r.signal === 'SIGSEGV' || r.signal === 'SIGBUS') return 'Segmentation fault – prístup na neplatnú adresu (napr. NULL ukazovateľ, chýbajúce & v scanf, neotvorený súbor).';
  if (/division by zero/.test(e) || r.signal === 'SIGFPE') return 'Delenie nulou.';
  if (/runtime error/.test(e)) return 'Chyba počas behu: ' + translateUB((e.split('\n').find(l => l.includes('runtime error')) || '').replace(/^.*?main\.c:(\d+):\d+: runtime error:\s*/, '(riadok $1) ').replace(/^.*runtime error:\s*/, ''));
  if (r.signal === 'SIGABRT') return 'Program bol násilne ukončený (abort) – najčastejšie zápis mimo poľa, ktorý poškodil zásobník, alebo chybné free().';
  if (r.signal) return `Program bol ukončený signálom ${r.signal}.`;
  if (r.code !== 0) return `Program skončil s návratovým kódom ${r.code} (main by mal vrátiť 0).`;
  return null;
}

// najčastejšie hlásenia UBSan po slovensky
function translateUB(m) {
  return m
    .replace(/index (-?\d+) out of bounds for type '([^']+)'/, 'index $1 je mimo poľa typu $2')
    .replace(/signed integer overflow: (.*) cannot be represented in type '([^']+)'/, 'pretečenie celého čísla: $1 sa nezmestí do typu $2')
    .replace(/load of null pointer of type '([^']+)'/, 'čítanie cez NULL ukazovateľ ($1)')
    .replace(/store to null pointer of type '([^']+)'/, 'zápis cez NULL ukazovateľ ($1)')
    .replace(/division by zero/, 'delenie nulou')
    .replace(/shift exponent (\d+) is too large.*/, 'posun o $1 bitov je príliš veľký');
}

const normalize = (s) => s.replace(/\r\n/g, '\n');
export function compareOut(got, exp) {
  const g = normalize(got), e = normalize(exp);
  if (g === e) return 'pass';
  const trim = (s) => s.split('\n').map(l => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n+$/, '');
  if (trim(g) === trim(e)) return 'whitespace';
  return 'fail';
}

// obsah vstupného súboru: reťazec (UTF-8) alebo { b64 } pre binárne dáta
const fileData = (v) => typeof v === 'string' ? v : Buffer.from(v.b64, 'base64');

// Niektoré kombinácie macOS + clang majú nefunkčný AddressSanitizer (program sa zasekne pri štarte).
// Pri prvom použití to overíme a prípadne ostaneme iba pri UndefinedBehaviorSanitizer.
let sanitizerProbe = null;
export function sanitizerFlags() {
  if (!sanitizerProbe) sanitizerProbe = (async () => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'fiit-trener-probe-'));
    try {
      await fsp.writeFile(path.join(dir, 'p.c'), '#include <stdio.h>\nint main(void){int a[2]={1,2};printf("%d\\n",a[1]);return 0;}\n');
      for (const san of ['address,undefined', 'undefined']) {
        const c = await run('clang', [`-fsanitize=${san}`, '-g', 'p.c', '-o', 'p'], { cwd: dir, timeout: 30000 });
        if (c.code !== 0) continue;
        const r = await run(path.join(dir, 'p'), [], { cwd: dir, timeout: 4000 });
        if (r.code === 0 && r.out === '2\n') return { flags: [`-fsanitize=${san}`, '-fno-omit-frame-pointer'], name: san };
      }
      return { flags: [], name: 'žiadny' };
    } finally { fsp.rm(dir, { recursive: true, force: true }).catch(() => {}); }
  })();
  return sanitizerProbe;
}

export async function compileAndTest(code, tests, { sanitize = true } = {}) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'fiit-trener-'));
  try {
    await fsp.writeFile(path.join(dir, 'main.c'), code);
    const flags = ['-std=c11', '-Wall', '-Wextra', '-Wno-unused-parameter', '-fno-color-diagnostics', '-g', '-O0', 'main.c', '-o', 'prog', '-lm'];
    if (sanitize) flags.unshift(...(await sanitizerFlags()).flags);
    const c = await run('clang', flags, { cwd: dir, timeout: 30000 });
    const warnings = c.err.replace(/main\.c:/g, 'riadok ');
    if (c.code !== 0) return { compiled: false, compileOutput: warnings };
    const results = [];
    for (const t of tests) {
      const tdir = await fsp.mkdtemp(path.join(dir, 't'));
      for (const [name, content] of Object.entries(t.filesIn || {})) await fsp.writeFile(path.join(tdir, name), fileData(content));
      const r = await run(path.join(dir, 'prog'), [], { cwd: tdir, input: t.stdin || '', timeout: t.timeout || 4000 });
      const runtime = explainRuntime(r);
      const res = { name: t.name, stdin: t.stdin || '', filesIn: t.filesIn || {}, got: r.out, expected: t.expectOut, runtime, stderr: r.err.slice(0, 4000) };
      res.status = runtime ? 'error' : (t.expectOut === undefined ? 'pass' : compareOut(r.out, t.expectOut));
      const names = new Set([...Object.keys(t.expectFiles || {}), ...(t.outFiles || [])]);
      if (names.size) {
        res.files = {};
        for (const name of names) {
          let got = null; try { got = await fsp.readFile(path.join(tdir, name), 'utf8'); } catch {}
          const exp = t.expectFiles?.[name];
          const st = got === null ? 'missing' : exp === undefined ? 'pass' : compareOut(got, exp);
          res.files[name] = { got, expected: exp, status: st };
          if ((st === 'missing' || st === 'fail') && res.status !== 'error') res.status = 'fail';
          if (st === 'whitespace' && res.status === 'pass') res.status = 'whitespace';
        }
      }
      results.push(res);
    }
    return { compiled: true, warnings, results };
  } finally {
    fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
