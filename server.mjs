// FIIT Tréner – lokálny server (Node.js bez externých balíkov)
// Spustenie:  node server.mjs            → http://localhost:4173
//             node server.mjs --lan      → prístup aj z iPadu v rovnakej Wi-Fi (s prístupovým kľúčom)
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { compileAndTest, enqueue } from './runner.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(ROOT, 'app');
const DATA = path.join(ROOT, 'data');
const PORT = Number(process.env.PORT || 4173);
const LAN = process.argv.includes('--lan');
const CONFIG_FILE = path.join(DATA, 'config.json');
const PROGRESS_FILE = path.join(DATA, 'progress.json');

fs.mkdirSync(DATA, { recursive: true });

const DEFAULT_CONFIG = {
  vaultPath: path.join(os.homedir(), 'Obsidian FIIT', 'FIIT STU'),
  subjects: {
    PPI: '1. semester/Princípy počítačového inžinierstva',
    PrPr: '1. semester/Procedurálne programovanie',
    ADM: '1. semester/Algebra a diskrétna matematika',
    MA: '1. semester/Matematická analýza',
    MIP: '1. semester/Metódy inžinierskej práce',
  },
  deadlines: [
    { date: '2026-10-11', subject: 'PPI', title: 'Odovzdanie zadania 1 (kódový prevodník)' },
    { date: '2026-10-16', subject: 'PPI', title: 'TEST 2 – dekóder (10 b), presný deň podľa cvičenia', approx: true },
    { date: '2026-10-16', subject: 'PrPr', title: 'Test 1 na PC – cykly (≈ 60 min, 6 b) – over si termín', approx: true },
    { date: '2026-10-23', subject: 'PrPr', title: 'Projekt v1 (23:59)' },
    { date: '2026-10-25', subject: 'PPI', title: 'Odovzdanie zadania 2' },
    { date: '2026-10-30', subject: 'PPI', title: 'TEST 3 – stavový automat (10 b)', approx: true },
    { date: '2026-10-30', subject: 'ADM', title: '2. písomka (15 b), 7.–8. týždeň', approx: true },
    { date: '2026-11-01', subject: 'MIP', title: 'Predbežná verzia projektu (23:59)' },
  ],
};

function loadJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
let config = { ...DEFAULT_CONFIG, ...loadJSON(CONFIG_FILE, {}) };
if (!fs.existsSync(CONFIG_FILE)) fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

// ---------- prístupový kľúč pre režim LAN ----------
const TOKEN_FILE = path.join(DATA, '.token');
const TOKEN = fs.existsSync(TOKEN_FILE) ? fs.readFileSync(TOKEN_FILE, 'utf8').trim() : (() => {
  const t = crypto.randomBytes(9).toString('base64url'); fs.writeFileSync(TOKEN_FILE, t, { mode: 0o600 }); return t;
})();
function isLocal(req) {
  const a = req.socket.remoteAddress || '';
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
}
function authorized(req, url) {
  if (isLocal(req)) return true;
  const cookie = /(?:^|;\s*)ft_token=([^;]+)/.exec(req.headers.cookie || '');
  return url.searchParams.get('token') === TOKEN || (cookie && cookie[1] === TOKEN);
}

// ---------- pomocné ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
function send(res, code, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
async function readBody(req, limit = 2_000_000) {
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > limit) throw new Error('Príliš veľké telo požiadavky'); chunks.push(c); }
  return Buffer.concat(chunks).toString('utf8');
}
async function writeAtomic(file, data) {
  const tmp = file + '.tmp';
  await fsp.writeFile(tmp, data);
  await fsp.rename(tmp, file);
}

// ---------- Vault (Obsidian) ----------
function vaultDir(subject) {
  const rel = config.subjects[subject];
  if (!rel) return null;
  return path.join(config.vaultPath, rel);
}
async function walkMd(dir, out = []) {
  let entries;
  try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walkMd(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}
async function flashcards(subject) {
  const dir = vaultDir(subject); if (!dir) return [];
  const files = await walkMd(dir);
  const cards = [];
  for (const f of files) {
    const text = await fsp.readFile(f, 'utf8');
    for (const line of text.split('\n')) {
      const m = /^(?!\s*[|>#-])(.+?)::(.+)$/.exec(line.trim());
      if (!m || m[1].includes('`') && !m[1].includes('$')) continue;
      const q = m[1].trim(), a = m[2].trim();
      if (!q || !a) continue;
      const id = crypto.createHash('sha1').update(subject + '|' + q).digest('hex').slice(0, 12);
      cards.push({ id, q, a, source: path.basename(f, '.md') });
    }
  }
  return cards;
}
async function noteList(subject) {
  const dir = vaultDir(subject); if (!dir) return [];
  const files = await walkMd(dir);
  return files.map(f => ({ rel: path.relative(dir, f), title: path.basename(f, '.md'), group: path.relative(dir, path.dirname(f)) || 'Prehľad' }))
    .sort((a, b) => a.group.localeCompare(b.group, 'sk') || a.title.localeCompare(b.title, 'sk'));
}
async function findNoteByTitle(title) {
  // hľadá [[odkaz]] v celom 1. semestri
  for (const subj of Object.keys(config.subjects)) {
    const list = await noteList(subj);
    const hit = list.find(n => n.title.toLowerCase() === title.toLowerCase());
    if (hit) return { subject: subj, rel: hit.rel };
  }
  return null;
}

// ---------- obsah PrPr ----------
const PRPR_BUILT = path.join(ROOT, 'content', 'prpr', 'built.json');
function prprContent() { return loadJSON(PRPR_BUILT, { tasks: [], predict: [] }); }
function publicTask(t) {
  const { reference, ...rest } = t;
  return { ...rest, tests: t.tests.map(x => ({ name: x.name, stdin: x.stdin, filesIn: x.filesIn, expectOut: x.expectOut, expectFiles: x.expectFiles })) };
}

// ---------- router ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (!authorized(req, url)) return send(res, 401, '<h1>Prístup odmietnutý</h1><p>Otvor adresu s prístupovým kľúčom, ktorú vypísal server.</p>', 'text/html; charset=utf-8');
    const setCookie = url.searchParams.get('token') === TOKEN ? { 'Set-Cookie': `ft_token=${TOKEN}; Path=/; Max-Age=31536000; SameSite=Lax` } : {};

    if (url.pathname.startsWith('/api/')) {
      const p = url.pathname.slice(5);
      if (p === 'config' && req.method === 'GET') return send(res, 200, { deadlines: config.deadlines, subjects: Object.keys(config.subjects), vaultPath: config.vaultPath, lan: LAN });
      if (p === 'progress' && req.method === 'GET') return send(res, 200, loadJSON(PROGRESS_FILE, {}));
      if (p === 'progress' && req.method === 'POST') {
        const body = await readBody(req, 20_000_000);
        JSON.parse(body); // validácia
        await writeAtomic(PROGRESS_FILE, body);
        return send(res, 200, { ok: true });
      }
      if (p === 'vault/flashcards') return send(res, 200, await flashcards(url.searchParams.get('subject')));
      if (p === 'vault/notes') return send(res, 200, await noteList(url.searchParams.get('subject')));
      if (p === 'vault/find') return send(res, 200, await findNoteByTitle(url.searchParams.get('title') || '') || {});
      if (p === 'vault/note') {
        const dir = vaultDir(url.searchParams.get('subject'));
        const file = path.resolve(dir || '/nonexistent', url.searchParams.get('rel') || '');
        if (!dir || !file.startsWith(path.resolve(dir) + path.sep) || !file.endsWith('.md')) return send(res, 400, { error: 'Neplatná cesta' });
        return send(res, 200, { text: await fsp.readFile(file, 'utf8') });
      }
      if (p === 'prpr/content') {
        const c = prprContent();
        return send(res, 200, { categories: c.categories || [], tasks: c.tasks.map(publicTask), predict: c.predict });
      }
      if (p === 'prpr/solution') {
        const t = prprContent().tasks.find(x => x.id === url.searchParams.get('id'));
        return t ? send(res, 200, { reference: t.reference }) : send(res, 404, { error: 'Úloha neexistuje' });
      }
      if (p === 'prpr/run' && req.method === 'POST') {
        const { id, code, sanitize, only } = JSON.parse(await readBody(req));
        const t = prprContent().tasks.find(x => x.id === id);
        if (!t) return send(res, 404, { error: 'Úloha neexistuje' });
        const tests = Array.isArray(only) ? t.tests.filter((_, i) => only.includes(i)) : t.tests;
        return send(res, 200, await enqueue(() => compileAndTest(code, tests, { sanitize: sanitize !== false })));
      }
      if (p === 'prpr/playground' && req.method === 'POST') {
        const { code, stdin, sanitize } = JSON.parse(await readBody(req));
        return send(res, 200, await enqueue(() => compileAndTest(code, [{ name: 'Vlastný vstup', stdin }], { sanitize: sanitize !== false })));
      }
      return send(res, 404, { error: 'Neznáme API' });
    }

    // statické súbory
    let file = path.join(APP, decodeURIComponent(url.pathname));
    if (!file.startsWith(APP)) return send(res, 403, 'Zakázané', 'text/plain');
    if (url.pathname === '/' || !path.extname(file)) file = path.join(APP, 'index.html');
    const data = await fsp.readFile(file).catch(() => null);
    if (!data) return send(res, 404, 'Nenájdené', 'text/plain; charset=utf-8');
    return send(res, 200, data, MIME[path.extname(file)] || 'application/octet-stream', setCookie);
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, LAN ? '0.0.0.0' : '127.0.0.1', () => {
  console.log(`\n  FIIT Tréner beží: http://localhost:${PORT}`);
  if (LAN) {
    const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
    ips.forEach(ip => console.log(`  iPad / iné zariadenie: http://${ip}:${PORT}/?token=${TOKEN}`));
    console.log('  (adresu s kľúčom nikomu nedávaj – umožňuje spúšťať kód na tvojom Macu)');
  }
  console.log(`  Vault: ${config.vaultPath}\n`);
});
