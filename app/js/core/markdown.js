// Markdown (Obsidian) → HTML: nadpisy, zoznamy, tabuľky, kód, callouty, wikilinky, matematika ($…$ ostáva pre KaTeX), kartičky q::a
import { esc, highlightC } from './ui.js';

const CALLOUT_ICON = { note: '📝', info: 'ℹ️', tip: '💡', hint: '💡', important: '❗', success: '✅', check: '✅', done: '✅', question: '❓', help: '❓', faq: '❓', warning: '⚠️', caution: '⚠️', attention: '⚠️', failure: '❌', fail: '❌', missing: '❌', danger: '⛔', error: '⛔', bug: '🐞', example: '🧪', quote: '❝', cite: '❝', abstract: '📋', summary: '📋', tldr: '📋', todo: '☑️' };
const CALLOUT_CLS = { success: 'ok', check: 'ok', done: 'ok', warning: 'warn', caution: 'warn', attention: 'warn', danger: 'bad', error: 'bad', failure: 'bad', fail: 'bad', bug: 'bad', missing: 'bad' };

export function inline(text) {
  const store = [];
  const keep = (html) => { store.push(html); return `\u0000${store.length - 1}\u0000`; };
  let s = text;
  s = s.replace(/`([^`]+)`/g, (m, c) => keep(`<code>${esc(c)}</code>`));
  s = s.replace(/\$\$([^$]+)\$\$/g, (m) => keep(esc(m)));
  s = s.replace(/\$([^$\n]+?)\$/g, (m) => keep(esc(m)));
  s = s.replace(/!\[\[([^\]]+)\]\]/g, (m, t) => keep(`<span class="badge">📎 ${esc(t.split('|')[0])}</span>`));
  s = s.replace(/\[\[([^\]]+)\]\]/g, (m, t) => {
    const [target, alias] = t.split('|');
    const [page] = target.split('#');
    return keep(`<a class="wikilink" href="#" data-wikilink="${esc(page.trim())}">${esc((alias || target).trim())}</a>`);
  });
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt) => keep(`<span class="badge">🖼 ${esc(alt || 'obrázok')}</span>`));
  s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (m, t, u) => keep(`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`));
  s = esc(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/__([^_]+)__/g, '<b>$1</b>');
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<i>$2</i>').replace(/(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g, '$1<i>$2</i>');
  s = s.replace(/~~([^~]+)~~/g, '<s>$1</s>').replace(/==([^=]+)==/g, '<mark>$1</mark>');
  s = s.replace(/(^|\s)#([\p{L}\w/-]+)/gu, '$1<span class="badge">#$2</span>');
  s = s.replace(/\u0000(\d+)\u0000/g, (m, i) => store[Number(i)]);
  return s;
}

export function md(src, { level = 0 } = {}) {
  let text = String(src || '').replace(/\r\n/g, '\n');
  if (level === 0) text = text.replace(/^---\n[\s\S]*?\n---\n?/, '');
  const lines = text.split('\n');
  let out = '', i = 0;
  const isTableSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
  const splitRow = (l) => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim());

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    // kód
    const fence = /^\s*(```|~~~)\s*([\w+-]*)/.exec(line);
    if (fence) {
      const lang = fence[2].toLowerCase();
      const buf = []; i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) buf.push(lines[i++]);
      i++;
      const code = buf.join('\n');
      out += `<pre><code>${lang === 'c' || lang === 'cpp' ? highlightC(code) : esc(code)}</code></pre>`;
      continue;
    }
    // matematika v bloku
    if (line.trim().startsWith('$$')) {
      const buf = [line]; i++;
      if (!(line.trim().length > 2 && line.trim().endsWith('$$') && line.trim() !== '$$')) {
        while (i < lines.length) { buf.push(lines[i]); if (lines[i++].trim().endsWith('$$')) break; }
      }
      out += `<div>${esc(buf.join('\n'))}</div>`;
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      const lv = line.match(/^#+/)[0].length;
      out += `<h${Math.min(lv + 1, 6)}>${inline(line.replace(/^#+\s*/, ''))}</h${Math.min(lv + 1, 6)}>`;
      i++; continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out += '<hr>'; i++; continue; }
    // citácie a callouty
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*> ?/, ''));
      const head = /^\[!(\w+)\]([+-]?)\s*(.*)$/.exec(buf[0] || '');
      if (head) {
        const type = head[1].toLowerCase();
        const title = head[3] || type[0].toUpperCase() + type.slice(1);
        const body = md(buf.slice(1).join('\n'), { level: level + 1 });
        const cls = CALLOUT_CLS[type] || '';
        const t = `${CALLOUT_ICON[type] || '📝'} ${inline(title)}`;
        if (head[2]) out += `<details class="callout ${cls}"${head[2] === '+' ? ' open' : ''}><summary>${t}</summary>${body}</details>`;
        else out += `<div class="callout ${cls}"><div class="callout-title">${t}</div>${body}</div>`;
      } else out += `<blockquote>${md(buf.join('\n'), { level: level + 1 })}</blockquote>`;
      continue;
    }
    // tabuľka
    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = splitRow(line); i += 2;
      let rows = '';
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) { rows += '<tr>' + splitRow(lines[i]).map(c => `<td>${inline(c)}</td>`).join('') + '</tr>'; i++; }
      out += `<table><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
      continue;
    }
    // zoznam
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const items = [];
      while (i < lines.length && (/^\s*([-*+]|\d+[.)])\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        const l = lines[i];
        const m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(l);
        if (m) items.push({ ind: m[1].replace(/\t/g, '    ').length, ordered: /\d/.test(m[2]), text: m[3] });
        else items[items.length - 1].text += ' ' + l.trim();
        i++;
      }
      out += renderList(items);
      continue;
    }
    // kartička q::a
    if (/^[^|>#`].*?::/.test(line) && !/^\s*[-*]/.test(line)) {
      const [q, ...a] = line.split('::');
      out += `<div class="fc"><div>${inline(q.trim())}</div><div>${inline(a.join('::').trim())}</div></div>`;
      i++; continue;
    }
    // odsek
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^\s*(```|~~~|#{1,6}\s|>|\$\$)/.test(lines[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i]) && !(lines[i].includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1]))) {
      if (/::/.test(lines[i]) && !/^\s*[-*]/.test(lines[i]) && buf.length) break;
      buf.push(lines[i++]);
    }
    if (!buf.length) { buf.push(lines[i++]); }
    out += `<p>${buf.map(inline).join('<br>')}</p>`;
  }
  return out;
}

function renderList(items) {
  let html = '';
  const stack = [];
  for (const it of items) {
    while (stack.length && it.ind < stack[stack.length - 1].ind) { html += `</li></${stack.pop().tag}>`; }
    const top = stack[stack.length - 1];
    if (!top || it.ind > top.ind) { const tag = it.ordered ? 'ol' : 'ul'; stack.push({ ind: it.ind, tag }); html += `<${tag}>`; }
    else html += '</li>';
    const cb = /^\[( |x|X)\]\s*(.*)$/.exec(it.text);
    html += '<li>' + (cb ? `<input type="checkbox" disabled ${cb[1] !== ' ' ? 'checked' : ''}> ${inline(cb[2])}` : inline(it.text));
  }
  while (stack.length) html += `</li></${stack.pop().tag}>`;
  return html;
}
