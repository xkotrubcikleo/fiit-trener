// Kartičky (SM-2), poznámky z Obsidianu, kvízy z teórie
import { h, mount, esc, renderMath, toast, shuffle, today, daysBetween, plural } from '../core/ui.js';
import * as store from '../core/store.js';
import { md, inline } from '../core/markdown.js';
import { QUIZ } from '../data/quiz.js';
import { STATIC } from '../core/env.js';

const ALL_SUBJECTS = { PPI: 'Princípy počítačového inžinierstva', PrPr: 'Procedurálne programovanie', ADM: 'Algebra a diskrétna matematika', MA: 'Matematická analýza', MIP: 'Metódy inžinierskej práce' };
// zdieľaná verzia nesie kartičky iba z týchto predmetov
export const SUBJECTS = STATIC ? { PPI: ALL_SUBJECTS.PPI, PrPr: ALL_SUBJECTS.PrPr, ADM: ALL_SUBJECTS.ADM, MA: ALL_SUBJECTS.MA } : ALL_SUBJECTS;

// ---------- kartičky ----------
const cardCache = {};
async function cardsOf(subject) {
  if (STATIC) {
    if (!cardCache._all) cardCache._all = await (await fetch('data/flashcards.json')).json().catch(() => ({}));
    cardCache[subject] = cardCache._all[subject] || [];
  }
  if (!cardCache[subject]) cardCache[subject] = await (await fetch('/api/vault/flashcards?subject=' + subject)).json().catch(() => []);
  return cardCache[subject].map(c => ({ ...c, subject }));
}
function addDays(d, n) { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }
export function sm2(state, q) {
  const s = { ef: 2.5, ivl: 0, reps: 0, lapses: 0, ...state };
  if (q < 3) { s.reps = 0; s.ivl = 0; s.lapses++; }
  else {
    s.reps++;
    s.ivl = s.reps === 1 ? (q === 5 ? 2 : 1) : s.reps === 2 ? (q === 5 ? 5 : q === 3 ? 2 : 3) : Math.round(s.ivl * s.ef * (q === 3 ? 0.8 : q === 5 ? 1.3 : 1));
    s.ef = Math.max(1.3, s.ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  }
  s.due = addDays(today(), s.ivl);
  s.last = today();
  return s;
}
export async function dueCounts() {
  const out = {};
  for (const s of Object.keys(SUBJECTS)) {
    const cards = await cardsOf(s);
    const srs = store.get().srs;
    out[s] = { total: cards.length, due: cards.filter(c => srs[c.id] && srs[c.id].due <= today()).length, fresh: cards.filter(c => !srs[c.id]).length };
  }
  return out;
}

export async function flashcardsView(view, subject) {
  if (!subject) {
    const counts = await dueCounts();
    const newLeft = Math.max(0, store.settings().newCardsPerDay - (store.get().srsNew[today()] || 0));
    mount(view, h('h1', '🃏 Kartičky'),
      h('p.muted', { html: (STATIC ? 'Kartičky sú zo študijných poznámok k predmetom 1. semestra FIIT.' : 'Kartičky sa berú z tvojich poznámok v Obsidiane – každý riadok v tvare <code>otázka::odpoveď</code>.') + ' Opakujú sa s rozostupmi (algoritmus SM-2): čo vieš, uvidíš o pár dní, čo nevieš, hneď znova.' }),
      h('p.small', `Nových kartičiek dnes ešte: ${newLeft} (limit zmeníš v Nastaveniach).`),
      h('div.grid.cols-3', h('a.tile', { href: '#/karticky/vsetko' }, h('div.tile-ico', '🔁'), h('h3', 'Všetky predmety'), h('p', `${Object.values(counts).reduce((a, c) => a + c.due, 0)} na zopakovanie`)),
        Object.entries(SUBJECTS).map(([s, name]) => h('a.tile', { href: '#/karticky/' + s }, h('h3', s), h('p', name), h('div.row', { style: { marginTop: '8px' } },
          h('span.badge', { class: counts[s].due ? 'warn' : '' }, `${counts[s].due} na opakovanie`), h('span.badge.accent', `${counts[s].fresh} nových`), h('span.badge', `${counts[s].total} spolu`))))));
    return;
  }
  const subs = subject === 'vsetko' ? Object.keys(SUBJECTS) : [subject];
  let cards = [];
  for (const s of subs) cards.push(...await cardsOf(s));
  const srs = store.get().srs;
  const due = shuffle(cards.filter(c => srs[c.id] && srs[c.id].due <= today()));
  const newLeft = Math.max(0, store.settings().newCardsPerDay - (store.get().srsNew[today()] || 0));
  const fresh = cards.filter(c => !srs[c.id]).slice(0, newLeft);
  let queue = [...due, ...fresh];
  // premiešaj nové medzi opakovania
  queue = queue.length > 6 ? shuffle(queue) : queue;
  let done = 0, again = 0;
  const box = h('div.flash');
  const show = () => {
    if (!queue.length) {
      mount(box, h('div.card.flash-card', h('div.q', '🎉 Hotovo na dnes!'), h('p.muted', `Zopakovaných: ${done}. ${again ? `Znova: ${again}.` : ''}`), h('div.row', { style: { justifyContent: 'center', marginTop: '10px' } }, h('a.btn', { href: '#/karticky' }, 'Späť na predmety'), h('button', { onclick: () => { cardsOf(subs[0]); flashcardsView(view, subject); } }, 'Načítať znova'))));
      return;
    }
    const c = queue[0];
    let revealed = false;
    const ans = h('div.a.hidden', { html: inline(c.a) });
    const rate = h('div.flash-rate.hidden', [['Znova', 0, '< 1 min'], ['Ťažké', 3, ''], ['Dobré', 4, ''], ['Ľahké', 5, '']].map(([l, q], k) => {
      const nx = q ? sm2(srs[c.id], q).ivl : 0;
      return h('button', { onclick: () => grade(q) }, h('span', `${k + 1} · ${l}`), h('small', q ? `${nx} ${plural(nx, 'deň', 'dni', 'dní')}` : 'teraz znova'));
    }));
    const reveal = () => { if (revealed) return; revealed = true; ans.classList.remove('hidden'); rate.classList.remove('hidden'); revealBtn.classList.add('hidden'); renderMath(ans); };
    const revealBtn = h('button.primary', { onclick: reveal, style: { margin: '14px auto 0' } }, 'Ukázať odpoveď (medzerník)');
    const grade = (q) => {
      const isNew = !srs[c.id];
      srs[c.id] = sm2(srs[c.id], q);
      if (isNew) store.get().srsNew[today()] = (store.get().srsNew[today()] || 0) + 1;
      store.get().daily[today()] = (store.get().daily[today()] || 0) + 1;
      store.save();
      queue.shift(); done++;
      if (q < 3) { again++; queue.splice(Math.min(queue.length, 3), 0, c); }
      show();
    };
    box.onkey = (e) => {
      if (e.key === ' ' && !revealed) { e.preventDefault(); reveal(); }
      else if (revealed && ['1', '2', '3', '4'].includes(e.key)) grade([0, 3, 4, 5][Number(e.key) - 1]);
    };
    mount(box,
      h('div.row', h('span.small.muted', `${c.subject} · ${c.source}`), h('span.spacer'), h('span.small.muted', `zostáva ${queue.length}`)),
      h('div.card.flash-card', h('div.q', { html: inline(c.q) }), ans, revealBtn),
      rate);
    renderMath(box);
  };
  const onKey = (e) => { if (!document.body.contains(box)) { document.removeEventListener('keydown', onKey); return; } if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; box.onkey?.(e); };
  document.addEventListener('keydown', onKey);
  mount(view, h('div.row', h('h1', { style: { margin: 0 } }, '🃏 ' + (subject === 'vsetko' ? 'Všetky predmety' : subject)), h('span.spacer'), h('a.btn.small', { href: '#/karticky' }, 'Predmety')),
    h('p.muted.small', `Na opakovanie: ${due.length}, nové: ${fresh.length}. Klávesy: medzerník = odpoveď, 1–4 = hodnotenie.`), box);
  show();
}

// ---------- poznámky ----------
export async function notesView(view, subject, rel) {
  if (STATIC) { mount(view, h('h1', '📚 Poznámky'), h('div.card', h('p', 'Prehliadač poznámok číta Obsidian vault na počítači, preto je iba v lokálnej verzii.'))); return; }
  subject = subject || 'PPI';
  view.classList.add('wide');
  const list = await (await fetch('/api/vault/notes?subject=' + subject)).json().catch(() => []);
  const search = h('input', { type: 'text', placeholder: 'Hľadať v názvoch…', style: { width: '100%', marginBottom: '8px' } });
  const listBox = h('div');
  const content = h('div.card.md');
  const renderList = () => {
    const q = search.value.toLowerCase();
    const items = list.filter(n => !q || n.title.toLowerCase().includes(q));
    const groups = [...new Set(items.map(n => n.group))];
    mount(listBox, groups.map(g => [h('div.grp', g), items.filter(n => n.group === g).map(n => h('a', { href: `#/poznamky/${subject}/${encodeURIComponent(n.rel)}`, class: n.rel === rel ? 'active' : '' }, n.title))]));
  };
  search.addEventListener('input', renderList);
  renderList();
  const tabs = h('div.ex-tabs', Object.keys(SUBJECTS).map(s => h('a.btn.small', { href: '#/poznamky/' + s, class: s === subject ? 'active' : '' }, s)));
  mount(view, h('h1', '📚 Poznámky'), tabs, h('div.note-layout', h('div.card.note-list', search, listBox), content));
  const target = rel || list.find(n => n.title.startsWith('_'))?.rel || list[0]?.rel;
  if (!target) { mount(content, h('p.muted', 'V tomto predmete sa nenašli žiadne poznámky. Skontroluj cestu k vaultu v Nastaveniach.')); return; }
  const r = await (await fetch(`/api/vault/note?subject=${subject}&rel=${encodeURIComponent(target)}`)).json();
  const body = (r.text || '').replace(/^---\n[\s\S]*?\n---\n?/, '');
  const hasTitle = /^\s*# /.test(body);
  content.innerHTML = (hasTitle ? '' : `<h1>${esc(target.split('/').pop().replace(/\.md$/, ''))}</h1>`) + md(body);
  content.querySelectorAll('a.wikilink').forEach(a => a.addEventListener('click', async (e) => {
    e.preventDefault();
    const hit = await (await fetch('/api/vault/find?title=' + encodeURIComponent(a.dataset.wikilink))).json();
    if (hit.subject) location.hash = `#/poznamky/${hit.subject}/${encodeURIComponent(hit.rel)}`;
    else toast('Poznámka „' + a.dataset.wikilink + '“ neexistuje (alebo je to príloha).');
  }));
  renderMath(content);
  if (!rel) renderList();
}

// ---------- kvíz ----------
export function quizView(view, subject) {
  subject = QUIZ[subject] ? subject : 'PPI';
  const bank = QUIZ[subject];
  const topics = [...new Set(bank.map(q => q.topic))];
  let topic = '';
  const qs = store.get().quiz;
  const startSession = () => {
    const pool = bank.filter(q => !topic || q.topic === topic);
    const w = (q) => !qs[q.id] ? 3 : qs[q.id].ok / qs[q.id].n < 0.8 ? 4 : 1;
    const picked = [];
    const cand = [...pool];
    while (picked.length < Math.min(10, pool.length)) {
      const tot = cand.reduce((s, q) => s + w(q), 0);
      let r = Math.random() * tot, k = 0;
      for (; k < cand.length; k++) { r -= w(cand[k]); if (r <= 0) break; }
      picked.push(cand.splice(Math.min(k, cand.length - 1), 1)[0]);
    }
    run(picked);
  };
  const run = (list) => {
    let i = 0, good = 0;
    const box = h('div');
    const next = () => {
      if (i >= list.length) {
        mount(box, h('div.card', h('h2', `Výsledok: ${good} / ${list.length}`), h('p.muted', good === list.length ? 'Perfektné!' : 'Otázky, ktoré ti nešli, sa budú objavovať častejšie.'), h('div.toolbar', h('button.primary', { onclick: startSession }, 'Ďalších 10 otázok'))));
        return;
      }
      const q = list[i];
      let answered = false;
      const fb = h('div');
      const answer = (ok, btn, correctBtn) => {
        if (answered) return; answered = true;
        btn.classList.add(ok ? 'correct' : 'wrong'); correctBtn?.classList.add('correct');
        const st = qs[q.id] ||= { n: 0, ok: 0 }; st.n++; if (ok) { st.ok++; good++; } st.last = new Date().toISOString();
        store.record('kviz.' + subject, ok, ok ? null : { title: `Kvíz ${subject} – ${q.topic}`, prompt: q.q, given: btn.textContent, correct: q.type === 'tf' ? (q.a ? 'pravda' : 'nepravda') : q.opts[0], route: '#/kviz/' + subject });
        mount(fb, h('div.callout', { class: ok ? 'ok' : 'bad', style: { marginTop: '10px' } }, h('div.callout-title', ok ? 'Správne' : 'Nesprávne'), q.why), h('div.toolbar', h('button.primary', { onclick: () => { i++; next(); }, id: 'quiz-next' }, i < list.length - 1 ? 'Ďalšia →' : 'Výsledok')));
        document.getElementById('quiz-next')?.focus();
      };
      let opts;
      if (q.type === 'tf') {
        const t = h('button.quiz-opt', 'Pravda'), f = h('button.quiz-opt', 'Nepravda');
        t.onclick = () => answer(q.a === true, t, q.a ? null : f);
        f.onclick = () => answer(q.a === false, f, q.a ? t : null);
        opts = [t, f];
      } else {
        const shuffled = shuffle(q.opts.map((o, k) => ({ o, k })));
        const btns = shuffled.map(({ o }) => h('button.quiz-opt', o));
        const correctBtn = btns[shuffled.findIndex(x => x.k === 0)];
        btns.forEach((b, j) => { b.onclick = () => answer(shuffled[j].k === 0, b, shuffled[j].k === 0 ? null : correctBtn); });
        opts = btns;
      }
      mount(box, h('div.card', h('div.row', h('span.badge', q.topic), h('span.spacer'), h('span.small.muted', `${i + 1} / ${list.length}`)), h('h2', { style: { marginTop: '10px' } }, q.q), opts, fb));
      renderMath(box);
    };
    mount(view, h('h1', `❓ Kvíz – ${subject}`), topicBar(), box);
    next();
  };
  const topicBar = () => h('div.ex-tabs', h('button.small', { class: !topic ? 'active' : '', onclick: () => { topic = ''; startSession(); } }, 'Všetky témy'),
    topics.map(t => h('button.small', { class: topic === t ? 'active' : '', onclick: () => { topic = t; startSession(); } }, t)));
  startSession();
}
