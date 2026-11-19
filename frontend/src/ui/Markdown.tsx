import { Link } from 'react-router-dom';
import { parseMarkdown, type Block, type Inline } from '../lib/markdown';

// Builds React elements straight from the parsed data. There is no dangerouslySetInnerHTML anywhere,
// so every piece of text is escaped by React.
function Inl({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case 'text': return <span key={i}>{n.v}</span>;
          case 'strong': return <strong key={i} className="font-semibold text-bone"><Inl nodes={n.c} /></strong>;
          case 'em': return <em key={i}><Inl nodes={n.c} /></em>;
          case 'code': return <code key={i} className="rounded bg-bone/10 px-1.5 py-0.5 text-[0.9em] text-bone">{n.v}</code>;
          case 'img': return <img key={i} src={n.src} alt={n.alt} loading="lazy" className="my-4 max-w-full rounded-lg border border-bone/10" />;
          case 'link':
            return n.href.startsWith('/') || n.href.startsWith('#')
              ? <Link key={i} to={n.href} className="text-bone underline underline-offset-2"><Inl nodes={n.c} /></Link>
              : <a key={i} href={n.href} target="_blank" rel="noopener noreferrer nofollow" className="text-bone underline underline-offset-2"><Inl nodes={n.c} /></a>;
        }
      })}
    </>
  );
}

function Blk({ b }: { b: Block }) {
  switch (b.t) {
    case 'h': return b.level === 2
      ? <h2 className="mb-3 mt-10 font-serif text-2xl text-bone"><Inl nodes={b.c} /></h2>
      : <h3 className="mb-2 mt-8 font-serif text-xl text-bone"><Inl nodes={b.c} /></h3>;
    case 'p': return <p className="my-4"><Inl nodes={b.c} /></p>;
    case 'ul': return <ul className="my-4 list-disc space-y-1.5 pl-6">{b.items.map((it, i) => <li key={i}><Inl nodes={it} /></li>)}</ul>;
    case 'ol': return <ol className="my-4 list-decimal space-y-1.5 pl-6">{b.items.map((it, i) => <li key={i}><Inl nodes={it} /></li>)}</ol>;
    case 'quote': return <blockquote className="my-6 border-l-2 border-crimson-2 pl-4 font-serif text-lg italic text-bone"><Inl nodes={b.c} /></blockquote>;
    case 'code': return <pre className="my-5 overflow-x-auto rounded-lg border border-bone/10 bg-ink-2 p-4 text-sm text-bone"><code>{b.v}</code></pre>;
    case 'hr': return <hr className="my-10 border-bone/10" />;
  }
}

export default function Markdown({ source }: { source: string }) {
  return <div className="text-[17px] leading-[1.75] text-mist">{parseMarkdown(source).map((b, i) => <Blk key={i} b={b} />)}</div>;
}
