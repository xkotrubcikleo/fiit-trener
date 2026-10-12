// Zostaví content/prpr/built.json: preloží vzorové riešenia, spustí ich na testoch a uloží očakávané výstupy.
// Spustenie: node tools/build-prpr.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileAndTest } from '../runner.mjs';
import { CATEGORIES, TASKS, PREDICT } from '../content/prpr/tasks.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let problems = 0;
const fail = (msg) => { problems++; console.error('  ✗ ' + msg); };

const ids = new Set();
const tasks = [];
for (const t of TASKS) {
  if (ids.has(t.id)) fail(`duplicitné id ${t.id}`);
  ids.add(t.id);
  const r = await compileAndTest(t.reference, t.tests);
  if (!r.compiled) { fail(`${t.id}: vzor sa nepreložil\n${r.compileOutput}`); continue; }
  if (r.warnings.trim()) fail(`${t.id}: vzor má varovania\n${r.warnings}`);
  const tests = t.tests.map((test, i) => {
    const res = r.results[i];
    if (res.status === 'error') fail(`${t.id} / ${test.name}: ${res.runtime}\n${res.stderr}`);
    const out = { name: test.name, stdin: test.stdin || '', expectOut: res.got };
    if (test.filesIn) out.filesIn = test.filesIn;
    if (test.outFiles) {
      out.outFiles = test.outFiles;
      out.expectFiles = {};
      for (const f of test.outFiles) {
        const got = res.files?.[f]?.got;
        if (got == null) fail(`${t.id} / ${test.name}: vzor nevytvoril súbor ${f}`);
        out.expectFiles[f] = got ?? '';
      }
    }
    return out;
  });
  // štartovací kód sa musí dať preložiť (pri úlohách „nájdi chybu“ musí aspoň v jednom teste zlyhať)
  const s = await compileAndTest(t.starter, tests, { sanitize: true });
  if (!s.compiled) fail(`${t.id}: štartovací kód sa nepreložil\n${s.compileOutput}`);
  else if (t.cat === 'chyby' && s.results.every(x => x.status === 'pass')) fail(`${t.id}: chybný program prechádza všetkými testami`);
  tasks.push({ ...t, tests });
  process.stdout.write('.');
}

function predictProgram(q) {
  const ind = (s) => s.split('\n').map(l => '    ' + l).join('\n');
  if (q.wrapFn) {
    const [fns, body] = q.code.split('/*MAIN*/\n');
    return `#include <stdio.h>\n\n${fns.trim()}\n\nint main(void) {\n${ind(body.trim())}\n    return 0;\n}\n`;
  }
  return `#include <stdio.h>\n\nint main(void) {\n${ind(q.code)}\n    return 0;\n}\n`;
}
const predict = [];
for (const q of PREDICT) {
  const program = predictProgram(q);
  const r = await compileAndTest(program, [{ name: 'beh', stdin: q.stdin || '' }]);
  if (!r.compiled) { fail(`${q.id}: nepreložil sa\n${r.compileOutput}`); continue; }
  const res = r.results[0];
  if (res.status === 'error') fail(`${q.id}: ${res.runtime}`);
  predict.push({ id: q.id, topic: q.topic, program, stdin: q.stdin || '', output: res.got, explain: q.explain, warnings: r.warnings });
  process.stdout.write('.');
}

fs.writeFileSync(path.join(ROOT, 'content/prpr/built.json'), JSON.stringify({ categories: CATEGORIES, tasks, predict, builtAt: new Date().toISOString() }, null, 1));
console.log(`\n${tasks.length} úloh, ${predict.length} otázok „čo vypíše“. ${problems ? problems + ' problémov' : 'Všetko v poriadku.'}`);
process.exit(problems ? 1 : 0);
