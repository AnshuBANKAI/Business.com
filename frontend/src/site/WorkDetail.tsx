import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { CaseStudy } from '../lib/types';
import { Spinner } from '../ui/kit';
import { usePageMeta } from '../lib/util';
import { fallbackSite } from './fallback';

export default function WorkDetail() {
  const { slug = '' } = useParams();
  const [p, setP] = useState<CaseStudy | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setP(null);
    setMissing(false);
    api.get<CaseStudy>(`/api/public/projects/${encodeURIComponent(slug)}`).then(setP).catch((e) => {
      const notFound = e instanceof ApiError && e.status === 404;
      const fb = notFound ? undefined : fallbackSite.projects.find((x) => x.slug === slug);
      if (fb) setP(fb);
      else setMissing(true);
    });
  }, [slug]);
  usePageMeta(p ? `${p.title} — Case study | Anshu Sharma` : 'Case study | Anshu Sharma', p?.logline);

  if (missing) return (
    <div className="gutter mx-auto max-w-3xl py-32 text-center">
      <h1 className="font-serif text-3xl text-bone">Case study not found</h1>
      <Link to="/#work" className="mt-6 inline-block text-mist underline">Back to all work</Link>
    </div>
  );
  if (!p) return <Spinner />;

  const Block = ({ title, text }: { title: string; text: string }) => text ? (
    <section className="mt-10"><h2 className="font-serif text-2xl text-bone">{title}</h2><p className="mt-3 whitespace-pre-line leading-relaxed text-mist">{text}</p></section>
  ) : null;

  return (
    <article className="gutter mx-auto max-w-4xl py-14 sm:py-20">
      <Link to="/#work" className="text-sm text-mist hover:text-bone">← All work</Link>
      <p className="mt-8 text-xs uppercase tracking-wider text-smoke">{[p.genre, p.year].filter(Boolean).join(' · ')}</p>
      <h1 className="mt-2 font-serif text-4xl text-bone sm:text-5xl">{p.title}</h1>
      <p className="mt-4 max-w-2xl text-lg text-mist">{p.logline}</p>
      {(p.role || p.duration || p.year) && (
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {p.role && <div><dt className="text-xs uppercase tracking-wider text-smoke">My role</dt><dd className="text-bone">{p.role}</dd></div>}
          {p.duration && <div><dt className="text-xs uppercase tracking-wider text-smoke">Duration</dt><dd className="text-bone">{p.duration}</dd></div>}
          {p.year && <div><dt className="text-xs uppercase tracking-wider text-smoke">Year</dt><dd className="text-bone">{p.year}</dd></div>}
        </dl>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="btn-primary rounded-lg px-5 py-2.5 text-sm">View live</a>}
        {p.github && <a href={p.github} target="_blank" rel="noopener noreferrer" className="btn-ghost rounded-lg px-5 py-2.5 text-sm">Source on GitHub</a>}
      </div>
      {p.coverImage && <img src={p.coverImage} alt={`${p.title} screenshot`} className="mt-10 w-full rounded-xl border border-bone/10" />}
      {p.metrics.length > 0 && (
        <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {p.metrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-bone/10 bg-ink-2/60 p-4">
              <dt className="order-2 text-xs text-mist">{m.label}</dt>
              <dd className="font-serif text-2xl text-bone">{m.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <Block title="The problem" text={p.problem} />
      <Block title="What I built" text={p.solution} />
      {p.features.length > 0 && (
        <section className="mt-10"><h2 className="font-serif text-2xl text-bone">Highlights</h2>
          <ul className="mt-3 space-y-2 text-mist">{p.features.map((f) => <li key={f} className="flex gap-2"><span className="text-crimson-2" aria-hidden>›</span>{f}</li>)}</ul>
        </section>
      )}
      {p.stack.length > 0 && (
        <section className="mt-10"><h2 className="font-serif text-2xl text-bone">Tech</h2>
          <ul className="mt-3 flex flex-wrap gap-2">{p.stack.map((t) => <li key={t} className="rounded-full border border-bone/15 px-3 py-1 text-sm text-mist">{t}</li>)}</ul>
        </section>
      )}
      <div className="mt-16 rounded-xl border border-bone/10 bg-ink-2/60 p-8 text-center">
        <p className="font-serif text-2xl text-bone">Need something like this?</p>
        <Link to="/#contact" className="btn-primary mt-5 inline-block rounded-lg px-6 py-3 text-sm">Start a project</Link>
      </div>
    </article>
  );
}
