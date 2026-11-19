import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { api } from '../lib/api';

const SKILLS = ['React', 'Node.js', 'Express', 'MongoDB', 'Generative AI', 'RAG', 'Gemini API', 'REST APIs'];
export const SkillPills = () => (
  <ul className="mt-6 flex flex-wrap gap-2" aria-label="Core skills">
    {SKILLS.map((t) => <li key={t} className="rounded-full border border-bone/15 bg-ink-2 px-3.5 py-1.5 text-xs font-medium text-bone">{t}</li>)}
  </ul>
);

/** Floating "Book a call" pill: shows after the hero, hides while the contact section is on screen. */
export function FloatingCall({ href }: { href?: string }) {
  const [show, setShow] = useState(false);
  const [atContact, setAtContact] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const el = document.getElementById('contact');
    const io = el ? new IntersectionObserver(([e]) => setAtContact(e.isIntersecting)) : null;
    if (el && io) io.observe(el);
    return () => { window.removeEventListener('scroll', onScroll); io?.disconnect(); };
  }, []);
  if (!show || atContact) return null;
  const cls = 'cz-float btn-primary fixed bottom-5 right-5 z-40 rounded-full px-5 py-3 text-sm shadow-xl';
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>Book a call</a> : <Link to="/#contact" className={cls}>Start a project</Link>;
}

const TYPES = ['MVP / new product', 'AI / LLM feature', 'Backend & APIs', 'Not sure yet'];
const TIMES = ['Flexible', 'Within 1 month', '1–3 months', '3+ months'];
const BUDGETS = ['Not sure yet', 'Under $1,000', '$1,000 – $3,000', '$3,000 – $10,000', '$10,000+'];

function setNative(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null, v: string) {
  if (!el) return;
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Scope helper: no prices are invented; it just fills the contact form with the visitor's answers. */
export function Estimator() {
  const [type, setType] = useState(TYPES[0]);
  const [time, setTime] = useState(TIMES[0]);
  const [budget, setBudget] = useState(BUDGETS[0]);
  const chip = (on: boolean) => `rounded-full border px-4 py-2 text-sm transition ${on ? 'border-bone bg-bone text-ink' : 'border-bone/15 text-mist hover:border-bone/40'}`;
  const group = (label: string, items: string[], val: string, set: (v: string) => void) => (
    <fieldset className="mt-6"><legend className="text-xs font-semibold uppercase tracking-widest text-smoke">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">{items.map((i) => <button key={i} type="button" aria-pressed={val === i} onClick={() => set(i)} className={chip(val === i)}>{i}</button>)}</div>
    </fieldset>
  );
  const send = () => {
    const f = document.querySelector('#contact form');
    setNative(f?.querySelector('select[name=budget]') ?? null, budget);
    setNative(f?.querySelector('select[name=timeline]') ?? null, time);
    const m = f?.querySelector('textarea[name=message]') as HTMLTextAreaElement | null;
    if (m && !m.value) setNative(m, `I'd like to talk about: ${type}.\nRough timeline: ${time}. Budget: ${budget}.\n\n`);
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    m?.focus({ preventScroll: true });
  };
  return (
    <section className="gutter mx-auto max-w-4xl py-16" aria-labelledby="est-h">
      <p className="text-xs font-semibold uppercase tracking-widest text-crimson-2">Scope in 30 seconds</p>
      <h2 id="est-h" className="mt-2 font-serif text-3xl text-bone sm:text-4xl">Tell me roughly what you need</h2>
      <p className="mt-2 text-sm text-mist">Pick what fits. I&rsquo;ll carry your answers into the form below and reply with a real quote, not a guess.</p>
      <div className="card3d mt-6 rounded-2xl border border-bone/10 bg-ink-2/60 p-6 sm:p-8">
        {group('What are you building?', TYPES, type, setType)}
        {group('Timeline', TIMES, time, setTime)}
        {group('Budget', BUDGETS, budget, setBudget)}
        <button type="button" onClick={send} className="btn-primary mt-8 rounded-full px-7 py-3 text-sm">Continue to the form →</button>
      </div>
    </section>
  );
}

export const SeriesCard = () => (
  <section className="gutter mx-auto max-w-6xl pb-16" aria-label="Cinematic portfolio">
    <Link to="/series" className="group relative block overflow-hidden rounded-3xl bg-[#1c1b19] p-8 text-[#faf8f5] shadow-xl sm:p-12">
      <span aria-hidden className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-[#c86d51]/40 blur-3xl transition group-hover:scale-125" />
      <p className="relative text-xs font-semibold uppercase tracking-widest text-[#e2a38f]">The other side of the portfolio</p>
      <h2 className="relative mt-3 max-w-xl font-serif text-3xl sm:text-5xl">Watch the cinematic version</h2>
      <p className="relative mt-3 max-w-lg text-sm text-[#d8d1c5]">The same work, told like a streaming series. Pick a profile and press play.</p>
      <span className="relative mt-6 inline-block rounded-full bg-[#faf8f5] px-6 py-2.5 text-sm font-medium text-[#1c1b19]">Open THE SERIES →</span>
    </Link>
  </section>
);

type Post = { _id: string; title: string; slug: string; excerpt?: string };
export function BlogStrip() {
  const [posts, setPosts] = useState<Post[]>([]);
  useEffect(() => { api.get<Post[]>('/api/public/posts').then((p) => setPosts(p.slice(0, 3))).catch(() => {}); }, []);
  if (!posts.length) return null;
  return (
    <section className="gutter mx-auto max-w-6xl py-16" aria-labelledby="blog-h">
      <div className="flex items-end justify-between"><h2 id="blog-h" className="font-serif text-3xl text-bone sm:text-4xl">Latest from the blog</h2><Link to="/insights" className="text-sm text-mist hover:text-bone">All articles →</Link></div>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {posts.map((p) => (
          <Link key={p._id} to={`/insights/${p.slug}`} className="card3d rounded-xl border border-bone/10 bg-ink-2/60 p-6">
            <h3 className="font-serif text-xl text-bone">{p.title}</h3>
            {p.excerpt && <p className="mt-2 line-clamp-3 text-sm text-mist">{p.excerpt}</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}

export const CtaBand = () => (
  <section className="gutter mx-auto max-w-6xl py-12 text-center" aria-label="Call to action">
    <h2 className="mx-auto max-w-2xl font-serif text-3xl text-bone sm:text-5xl">Have an idea? Let&rsquo;s scope it this week.</h2>
    <Link to="/#contact" className="btn-primary mt-6 inline-block rounded-full px-8 py-3.5 text-sm">Start a project</Link>
  </section>
);

export const DrawLine = () => {
  const reduce = useReducedMotion();
  return <motion.div aria-hidden className="mb-8 hidden h-px origin-left bg-crimson lg:block" initial={{ scaleX: reduce ? 1 : 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }} />;
};

type QV = { title: string; slug: string; logline?: string; problem?: string; solution?: string; stack?: string[]; liveUrl?: string };
export function QuickView({ p, onClose }: { p: QV; onClose: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btn.current?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={p.title} onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-ink p-7 text-bone shadow-2xl">
        <div className="flex items-start justify-between gap-4"><h3 className="font-serif text-3xl">{p.title}</h3><button ref={btn} onClick={onClose} className="rounded-full border border-bone/20 px-3 py-1 text-sm" aria-label="Close">✕</button></div>
        {p.logline && <p className="mt-2 text-mist">{p.logline}</p>}
        {p.problem && <><h4 className="mt-5 text-xs font-semibold uppercase tracking-widest text-crimson-2">Problem</h4><p className="mt-1 text-sm text-mist">{p.problem}</p></>}
        {p.solution && <><h4 className="mt-5 text-xs font-semibold uppercase tracking-widest text-crimson-2">Solution</h4><p className="mt-1 text-sm text-mist">{p.solution}</p></>}
        {!!p.stack?.length && <ul className="mt-5 flex flex-wrap gap-1.5">{p.stack.map((t) => <li key={t} className="rounded-full border border-bone/15 px-2.5 py-0.5 text-xs">{t}</li>)}</ul>}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={`/work/${p.slug}`} className="btn-primary rounded-full px-5 py-2.5 text-sm">Full case study</Link>
          {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Live demo ↗</a>}
        </div>
      </div>
    </div>
  );
}
