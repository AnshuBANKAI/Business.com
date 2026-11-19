// The blog renders author-written text, so prove it can't be turned into an XSS vector.
// Runs the real front-end parser (TypeScript) directly via Node's built-in type stripping.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { parseMarkdown, parseInline, safeHref, safeImg, readingMinutes } = await import('../../frontend/src/lib/markdown.ts');
const flat = (inl) => inl.map((n) => (n.t === 'text' || n.t === 'code' ? n.v : n.c ? flat(n.c) : n.alt || '')).join('');

test('headings, paragraphs, lists, quotes, code and rules parse into blocks', () => {
  const md = '# Title\n\nFirst line\nsecond line.\n\n## Sub\n- one\n- **two**\n\n1. a\n2. b\n\n> wise words\n\n```\nconst x = 1;\n<b>raw</b>\n```\n\n---\n';
  const b = parseMarkdown(md);
  assert.deepEqual(b.map((x) => x.t), ['h', 'p', 'h', 'ul', 'ol', 'quote', 'code', 'hr']);
  assert.equal(b[0].level, 2, 'a post already has an H1, so # becomes H2');
  assert.equal(flat(b[1].c), 'First line second line.');
  assert.equal(b[3].items.length, 2);
  assert.equal(b[6].v, 'const x = 1;\n<b>raw</b>', 'code is kept verbatim');
});

test('inline formatting', () => {
  const n = parseInline('a **bold** and *em* and `code` and [link](https://example.com/x?y=1)');
  assert.deepEqual(n.map((x) => x.t), ['text', 'strong', 'text', 'em', 'text', 'code', 'text', 'link']);
  assert.equal(n[7].href, 'https://example.com/x?y=1');
});

test('dangerous link targets are removed but the words stay', () => {
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:x', '//evil.example/x', ' javascript:alert(1)', 'file:///etc/passwd']) {
    assert.equal(safeHref(bad), null, bad);
    const n = parseInline(`[click me](${bad.replace(/\s/g, '')})`);
    assert.ok(!n.some((x) => x.t === 'link'), `no link node for ${bad}`);
    assert.ok(flat(n).startsWith('click me'), 'the words stay');
    assert.ok(!/javascript:|vbscript:|data:text|file:/i.test(flat(n)), 'the dangerous target is not shown either');
  }
  for (const ok of ['https://a.com', 'http://a.com/p', 'mailto:a@b.com', '/insights/x', '#section']) assert.equal(safeHref(ok), ok);
});

test('images only from https or the admin upload folder', () => {
  assert.equal(safeImg('javascript:alert(1)'), null);
  assert.equal(safeImg('data:image/svg+xml;base64,PHN2Zz4='), null);
  assert.equal(safeImg('http://insecure.example/a.png'), null);
  assert.equal(safeImg('/uploads/public/' + 'a'.repeat(32) + '.png'), '/uploads/public/' + 'a'.repeat(32) + '.png');
  assert.equal(safeImg('/uploads/private/secret.pdf'), null);
  assert.equal(safeImg('/uploads/public/../../etc/passwd'), null);
  const n = parseInline('![x](javascript:alert(1))');
  assert.ok(!n.some((x) => x.t === 'img'));
});

test('raw HTML is just text (React will escape it) and never becomes a node type', () => {
  const b = parseMarkdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[<b>x</b>](https://ok.example)');
  const types = new Set(JSON.stringify(b).match(/"t":"(\w+)"/g));
  assert.ok([...types].every((t) => /"t":"(p|text|link)"/.test(t)), 'only paragraph/text/link nodes');
  assert.match(flat(b[0].c), /<script>alert\(1\)<\/script>/);
});

test('hostile or malformed input never hangs or throws', () => {
  const nasty = ['*'.repeat(5000), '['.repeat(3000) + ']('.repeat(3000), '`'.repeat(4001), '```\nunclosed', '> '.repeat(2000), '- '.repeat(2000), '![](' + 'a'.repeat(100000) + ')', '**' + 'a '.repeat(50000), '\u0000\u202e\ud800'];
  const t0 = Date.now();
  for (const s of nasty) { assert.doesNotThrow(() => parseMarkdown(s)); }
  assert.ok(Date.now() - t0 < 3000, 'no catastrophic backtracking');
});

test('reading time is at least a minute and scales with length', () => {
  assert.equal(readingMinutes('short'), 1);
  assert.equal(readingMinutes('word '.repeat(1000)), 5);
});
