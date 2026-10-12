// Pomocné funkcie pre DOM
import { STATIC } from './env.js';

// h('div.card#id', {onclick, class, style, ...}, ...children)
export function h(sel, attrs, ...children) {
  if (attrs == null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs)) { children.unshift(attrs); attrs = {}; }
  const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(sel);
  const el = document.createElement(m?.[1] || 'div');
  if (m?.[2]) for (const part of m[2].match(/[.#][\w-]+/g)) {
    if (part[0] === '.') el.classList.add(part.slice(1)); else el.id = part.slice(1);
  }
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') String(v).split(/\s+/).filter(Boolean).forEach(c => el.classList.add(c));
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}
function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}
export const raw = (html) => { const t = document.createElement('template'); t.innerHTML = html; return t.content; };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
export function mount(el, ...children) { clear(el); append(el, children); return el; }

export function toast(msg, kind = '') {
  const t = h('div.toast', { class: kind }, msg);
  document.getElementById('toasts').append(t);
  setTimeout(() => t.remove(), kind === 'bad' ? 4500 : 2600);
}

export function modal(content, { onClose } = {}) {
  const bg = h('div.modal-bg');
  const box = h('div.modal', content);
  bg.append(box);
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); onClose?.(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(bg);
  return { close, box };
}
export function confirmDialog(text, okLabel = 'Áno') {
  return new Promise((resolve) => {
    let m;
    const done = (v) => { resolve(v); m.close(); };
    m = modal([h('p', text), h('div.row', { style: { justifyContent: 'flex-end' } },
      h('button', { onclick: () => done(false) }, 'Zrušiť'),
      h('button.primary', { onclick: () => done(true) }, okLabel))], { onClose: () => resolve(false) });
  });
}

export function renderMath(el) {
  if (window.renderMathInElement) {
    try {
      window.renderMathInElement(el, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
        throwOnError: false, ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        output: STATIC ? 'mathml' : 'htmlAndMathml', // zdieľaná verzia nemá CSS KaTeXu, MathML vykreslí prehliadač
      });
    } catch {}
  } else if (!renderMath.waiting) {
    renderMath.waiting = true;
    window.addEventListener('load', () => { renderMath.waiting = false; document.querySelectorAll('[data-math]').forEach(renderMath); }, { once: true });
  }
  el.dataset && (el.dataset.math = '1');
}

export function meter(frac, cls = '') {
  return h('div.meter', { class: cls }, h('i', { style: { width: Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%' } }));
}
export const pct = (a, b) => b ? Math.round(100 * a / b) + ' %' : '–';

export function shortcut(el, handler) {
  el.addEventListener('keydown', handler);
}

// textové porovnanie s viditeľnými medzerami
export function visibleWS(s) {
  return esc(s).replace(/ /g, '<span class="ws">·</span>').replace(/\t/g, '<span class="ws">→   </span>').replace(/\n/g, '<span class="ws">↵</span>\n');
}

// jednoduché zvýraznenie C kódu
const KW = new Set('if else for while do switch case default break continue return goto sizeof struct union enum typedef static const extern volatile register auto'.split(' '));
const TYPES = new Set('int char float double long short unsigned signed void FILE size_t bool'.split(' '));
export function highlightC(code) {
  let out = '';
  const re = /(\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)|(^[ \t]*#[^\n]*)|\b(\d+\.?\d*(?:[eE][+-]?\d+)?[uUlLfF]*|0[xX][0-9a-fA-F]+)\b|\b([A-Za-z_]\w*)\b(?=\s*\()|\b([A-Za-z_]\w*)\b/gm;
  let last = 0, m;
  while ((m = re.exec(code))) {
    out += esc(code.slice(last, m.index));
    const [t] = m;
    if (m[1]) out += `<span class="tk-com">${esc(t)}</span>`;
    else if (m[2]) out += `<span class="tk-str">${esc(t)}</span>`;
    else if (m[3]) out += `<span class="tk-pre">${esc(t)}</span>`;
    else if (m[4]) out += `<span class="tk-num">${esc(t)}</span>`;
    else if (m[5]) out += KW.has(t) ? `<span class="tk-kw">${t}</span>` : TYPES.has(t) ? `<span class="tk-type">${t}</span>` : `<span class="tk-fn">${t}</span>`;
    else if (m[6]) out += KW.has(t) ? `<span class="tk-kw">${t}</span>` : TYPES.has(t) ? `<span class="tk-type">${t}</span>` : esc(t);
    last = m.index + t.length;
    if (t.length === 0) re.lastIndex++;
  }
  return out + esc(code.slice(last));
}
export function codeBlock(code) {
  return h('pre.code', { html: highlightC(code) });
}

// náhoda
export const rnd = (n) => Math.floor(Math.random() * n);
export const rint = (a, b) => a + rnd(b - a + 1);
export const pick = (arr) => arr[rnd(arr.length)];
export function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const sample = (arr, k) => shuffle(arr).slice(0, k);

export function fmtDate(d) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric' });
}
export function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }
export function plural(n, one, few, many) { return n === 1 ? one : n >= 2 && n <= 4 ? few : many; }
