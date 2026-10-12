// Jednoduchý editor C kódu: textarea nad zvýrazneným <pre>, čísla riadkov, odsadzovanie, skratky.
import { h, highlightC } from '../core/ui.js';

const LH = 21, PAD = 10;

export function codeEditor({ value = '', onChange, onRun, onSave, minLines = 18 } = {}) {
  const ta = h('textarea', { spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', wrap: 'off', 'aria-label': 'Kód' });
  const pre = h('pre', { 'aria-hidden': 'true' });
  const gutterInner = h('div');
  const gutter = h('div.gutter', gutterInner);
  const scroller = h('div.scroller', pre, ta);
  const root = h('div.editor', gutter, scroller);
  let marks = { err: new Set(), warn: new Set() };
  ta.value = value;

  function render() {
    const v = ta.value;
    pre.innerHTML = highlightC(v) + '\n';
    const lines = v.split('\n').length;
    const n = Math.max(lines, minLines);
    let g = '';
    for (let i = 1; i <= n; i++) g += `<div class="${marks.err.has(i) ? 'err' : marks.warn.has(i) ? 'warn' : ''}">${i <= lines ? i : ''}</div>`;
    gutterInner.innerHTML = g;
    ta.style.height = (n * LH + 2 * PAD) + 'px';
    ta.style.width = '0px';
    ta.style.width = Math.max(scroller.clientWidth, ta.scrollWidth, pre.scrollWidth) + 'px';
    root.style.height = Math.min(n * LH + 2 * PAD + 2, Math.max(window.innerHeight * 0.72, 380)) + 'px';
    syncScroll();
  }
  function syncScroll() { gutterInner.style.transform = `translateY(${-scroller.scrollTop}px)`; }
  scroller.addEventListener('scroll', syncScroll);

  const insert = (text) => {
    ta.focus();
    if (!document.execCommand('insertText', false, text)) {
      const s = ta.selectionStart, e = ta.selectionEnd;
      ta.setRangeText(text, s, e, 'end');
      ta.dispatchEvent(new Event('input'));
    }
  };
  function lineStart(pos) { return ta.value.lastIndexOf('\n', pos - 1) + 1; }
  function selectLines() {
    const s = lineStart(ta.selectionStart);
    let e = ta.value.indexOf('\n', ta.selectionEnd - (ta.selectionEnd > ta.selectionStart && ta.value[ta.selectionEnd - 1] === '\n' ? 1 : 0));
    if (e < 0) e = ta.value.length;
    return [s, e];
  }
  function transformLines(fn) {
    const [s, e] = selectLines();
    const block = ta.value.slice(s, e);
    const out = block.split('\n').map(fn).join('\n');
    ta.setSelectionRange(s, e);
    insert(out);
    ta.setSelectionRange(s, s + out.length);
  }

  ta.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === 'Enter') { e.preventDefault(); onRun?.(); return; }
    if (mod && (e.key === 's' || e.key === 'S')) { e.preventDefault(); onSave?.(); return; }
    if (mod && e.key === '/') {
      e.preventDefault();
      const [s, en] = selectLines();
      const lines = ta.value.slice(s, en).split('\n');
      const allCommented = lines.filter(l => l.trim()).every(l => /^\s*\/\//.test(l));
      transformLines(l => allCommented ? l.replace(/^(\s*)\/\/ ?/, '$1') : (l.trim() ? l.replace(/^(\s*)/, '$1// ') : l));
      return;
    }
    if (e.key === 'Escape') { ta.blur(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (ta.selectionStart !== ta.selectionEnd && ta.value.slice(ta.selectionStart, ta.selectionEnd).includes('\n') || e.shiftKey) {
        transformLines(l => e.shiftKey ? l.replace(/^( {1,4}|\t)/, '') : '    ' + l);
      } else insert('    ');
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !mod && !e.altKey) {
      e.preventDefault();
      const pos = ta.selectionStart;
      const ls = lineStart(pos);
      const cur = ta.value.slice(ls, pos);
      let indent = /^\s*/.exec(cur)[0];
      const before = cur.trimEnd();
      const after = ta.value.slice(ta.selectionEnd, ta.value.indexOf('\n', ta.selectionEnd) < 0 ? undefined : ta.value.indexOf('\n', ta.selectionEnd));
      if (before.endsWith('{')) {
        if (after.trimStart().startsWith('}')) { insert('\n' + indent + '    ' + '\n' + indent); ta.selectionStart = ta.selectionEnd = pos + 1 + indent.length + 4; ta.dispatchEvent(new Event('input')); return; }
        indent += '    ';
      }
      insert('\n' + indent);
      return;
    }
    if (e.key === '}') {
      const pos = ta.selectionStart, ls = lineStart(pos);
      const cur = ta.value.slice(ls, pos);
      if (/^\s+$/.test(cur) && cur.length >= 4) {
        e.preventDefault();
        ta.setSelectionRange(pos - 4, pos);
        insert('}');
      }
    }
  });
  ta.addEventListener('input', () => { render(); onChange?.(ta.value); });
  const ro = new ResizeObserver(() => render());
  ro.observe(root);
  requestAnimationFrame(render);

  return {
    el: root,
    get value() { return ta.value; },
    set value(v) { ta.value = v; render(); },
    focus() { ta.focus(); },
    markLines(err = [], warn = []) { marks = { err: new Set(err), warn: new Set(warn) }; render(); },
    gotoLine(n) {
      const lines = ta.value.split('\n');
      let pos = 0; for (let i = 0; i < n - 1 && i < lines.length; i++) pos += lines[i].length + 1;
      ta.focus();
      ta.setSelectionRange(pos, pos + (lines[n - 1]?.length || 0));
      scroller.scrollTop = Math.max(0, (n - 5) * LH);
    },
  };
}
