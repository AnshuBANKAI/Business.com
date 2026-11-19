// A deliberately small Markdown subset, parsed into plain data (never HTML strings).
// Raw HTML in the source is shown as text, and only safe link/image targets survive, so a post can't inject scripts.

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'strong'; c: Inline[] }
  | { t: 'em'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; c: Inline[] }
  | { t: 'img'; src: string; alt: string };

export type Block =
  | { t: 'h'; level: 2 | 3 | 4; c: Inline[] }
  | { t: 'p'; c: Inline[] }
  | { t: 'ul'; items: Inline[][] }
  | { t: 'ol'; items: Inline[][] }
  | { t: 'quote'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'hr' };

/** Allowed link targets: https/http, mailto, same-site paths and #anchors. Everything else (javascript:, data:, //host) is dropped. */
export function safeHref(u: string): string | null {
  const url = u.trim();
  if (/^https?:\/\/[^\s]+$/i.test(url)) return url;
  if (/^mailto:[^\s]+$/i.test(url)) return url;
  if (/^\/(?!\/)[^\s]*$/.test(url)) return url;
  if (/^#[\w-]+$/.test(url)) return url;
  return null;
}

/** Allowed images: https, or files uploaded through the admin panel. */
export function safeImg(u: string): string | null {
  const url = u.trim();
  if (/^https:\/\/[^\s]+$/i.test(url)) return url;
  if (/^\/uploads\/public\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(url)) return url;
  return null;
}

const INLINE = /(`[^`\n]+`)|(!\[[^\]\n]*\]\([^)\s]+\))|(\[[^\]\n]+\]\([^)\s]+\))|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)/g;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  const push = (v: string) => { if (v) out.push({ t: 'text', v }); };
  for (const m of src.matchAll(INLINE)) {
    const i = m.index ?? 0;
    push(src.slice(last, i));
    last = i + m[0].length;
    if (m[1]) out.push({ t: 'code', v: m[1].slice(1, -1) });
    else if (m[2]) {
      const g = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(m[2])!;
      const safe = safeImg(g[2]);
      if (safe) out.push({ t: 'img', src: safe, alt: g[1] }); else push(m[2]); // unsafe image: show the source as plain text
    } else if (m[3]) {
      const g = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(m[3])!;
      const href = safeHref(g[2]);
      if (href) out.push({ t: 'link', href, c: parseInline(g[1]) }); else push(g[1]); // unsafe link: keep the words, drop the target
    } else if (m[4]) out.push({ t: 'strong', c: parseInline(m[4].slice(2, -2)) });
    else if (m[5]) out.push({ t: 'em', c: parseInline(m[5].slice(1, -1)) });
  }
  push(src.slice(last));
  return out;
}

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  const isSpecial = (l: string) => /^(#{1,4})\s/.test(l) || /^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l) || /^>\s?/.test(l) || /^```/.test(l) || /^-{3,}\s*$/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }

    if (/^```/.test(line)) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i += 1; }
      i += 1; // closing fence (or end of input)
      blocks.push({ t: 'code', v: buf.join('\n') });
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) { blocks.push({ t: 'h', level: Math.min(4, Math.max(2, h[1].length)) as 2 | 3 | 4, c: parseInline(h[2].trim()) }); i += 1; continue; }
    if (/^-{3,}\s*$/.test(line)) { blocks.push({ t: 'hr' }); i += 1; continue; }
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i += 1; }
      blocks.push({ t: 'quote', c: parseInline(buf.join(' ')) });
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: Inline[][] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(parseInline(lines[i].replace(/^\s*[-*]\s+/, ''))); i += 1; }
      blocks.push({ t: 'ul', items });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: Inline[][] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(parseInline(lines[i].replace(/^\s*\d+\.\s+/, ''))); i += 1; }
      blocks.push({ t: 'ol', items });
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !isSpecial(lines[i])) { buf.push(lines[i].trim()); i += 1; }
    if (buf.length) blocks.push({ t: 'p', c: parseInline(buf.join(' ')) });
    else i += 1; // safety: never loop forever on an unexpected line
  }
  return blocks;
}

export function readingMinutes(src: string): number {
  const words = src.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
