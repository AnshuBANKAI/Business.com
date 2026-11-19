import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useSite } from './SiteLayout';
import ContactForm from './ContactForm';
import { Spinner } from '../ui/kit';
import { usePageMeta } from '../lib/util';
import { Tilt } from '../components/fx';
import { SkillPills, FloatingCall, Estimator, SeriesCard, BlogStrip, CtaBand, DrawLine, QuickView } from './HomeExtras';

const STEPS = [
  ['Discovery call', 'A short call to understand the goal, users and constraints.'],
  ['Scope & quote', 'A written scope, milestones and a fixed or estimated price.'],
  ['Build in milestones', 'You see working progress in your portal and approve each stage.'],
  ['Launch & handover', 'Deployment, documentation and the source code are yours.'],
];

const MODELS: [string, string, string][] = [
  ['Fixed-price project', 'A defined scope delivered in milestones with a fixed quote. You approve each stage in your portal before the next begins.', 'MVPs and clearly scoped builds'],
  ['Monthly retainer', 'A set amount of development time each month for a live product: new features, fixes and improvements, with weekly updates.', 'Products that are live and growing'],
  ['Hourly / advisory', 'Code reviews, architecture advice, debugging or short tasks, billed for the time spent.', 'Quick help and second opinions'],
];

/** Fade-and-rise as a block scrolls into view. Skipped entirely when the visitor prefers reduced motion. */
function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

const H2 = ({ id, kicker, children }: { id: string; kicker: string; children: string }) => (
  <div className="mb-10 max-w-2xl">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-crimson-2">{kicker}</p>
    <h2 id={id} className="mt-2 font-serif text-3xl text-bone sm:text-4xl">{children}</h2>
  </div>
);
const Section = ({ id, children, alt }: { id: string; children: React.ReactNode; alt?: boolean }) => (
  <section id={id} aria-labelledby={`${id}-h`} className={`scroll-mt-20 py-16 sm:py-24 ${alt ? 'bg-ink-2/50' : ''}`}>
    <div className="gutter mx-auto max-w-6xl">{children}</div>
  </section>
);

export default function Home() {
  const { data, offline } = useSite();
  usePageMeta('Anshu Sharma — Full-Stack & AI Developer for Startups', data?.settings.subheadline);

  useEffect(() => {
    const bar = document.getElementById('cz-progress');
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.width = `${h > 0 ? (window.scrollY / h) * 100 : 0}%`;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [qv, setQv] = useState<any>(null);

  if (!data) return <Spinner />;
  const { settings: s, services, projects, testimonials, faqs } = data;

  const ticker = [...services.map((x) => x.title), 'React', 'Node.js', 'MongoDB', 'Generative AI', 'REST APIs'];

  return (
    <div className="cozy">
      <div id="cz-progress" aria-hidden />
      <div className="relative overflow-hidden">
        <div className="depth" aria-hidden><span className="d1" /><span className="d2" /><span className="d3" /></div>
        <section className="gutter relative z-10 mx-auto grid max-w-6xl items-center gap-12 pb-16 pt-14 sm:pt-20 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {s.availability && (
              <p className="cz-rise cz-d1 mb-6 inline-flex items-center gap-2.5 rounded-full border border-bone/10 bg-ink-2 px-4 py-1.5 text-xs font-medium text-mist">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" /></span>
                {s.availability}
              </p>
            )}
            <h1 className="cz-rise cz-d2 max-w-3xl font-serif text-5xl leading-[1.05] text-bone sm:text-7xl">{s.headline}</h1>
            <p className="cz-rise cz-d3 mt-6 max-w-2xl text-lg text-mist">{s.subheadline}</p>
            <div className="cz-rise cz-d4 mt-9 flex flex-wrap gap-3">
              <Link to="/#contact" className="btn-primary rounded-full px-7 py-3 text-sm">Start a project</Link>
              {s.bookingUrl && <a href={s.bookingUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost rounded-full px-7 py-3 text-sm">Book a call</a>}
              <Link to="/#work" className="btn-ghost rounded-full px-7 py-3 text-sm">See my work</Link>
            </div>
          </div>
          <div className="cz-rise cz-d3 lg:col-span-5">
            <Tilt max={5} glare={false} className="cz-bento">
              <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-widest text-smoke"><span>Portfolio</span><span>Remote · India</span></div>
              <div className="relative mt-4">
                <img src="/assets/portrait-420.webp" srcSet="/assets/portrait-420.webp 420w, /assets/portrait-720.webp 720w" sizes="(min-width: 1024px) 30vw, 90vw" width={420} height={378} alt="Portrait of Anshu Sharma" fetchPriority="high" className="aspect-[4/4.4] w-full rounded-2xl object-cover object-top" />
                <span className="cz-sticker animate-bob">Full-stack + AI</span>
              </div>
              {projects[0] && (
                <div className="mt-4 rounded-2xl bg-ink p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-crimson-2">Latest build</p>
                  <p className="mt-1 text-sm text-mist"><strong className="text-bone">{projects[0].title}</strong>. {projects[0].logline}</p>
                </div>
              )}
            </Tilt>
          </div>
        </section>
      </div>
      <div className="marquee-wrap" aria-hidden>
        <div className="marquee-track">
          {[...ticker, ...ticker].map((t, i) => <span key={i} className="marquee-item"><i />{t}</span>)}
        </div>
      </div>

      {s.about && (
        <Section id="about">
          <div className="grid items-center gap-10">
            <div>
              <H2 id="about-h" kicker="About">Who you&rsquo;ll be working with</H2>
              <p className="max-w-3xl whitespace-pre-line text-lg leading-relaxed text-mist">{s.about}</p>
              <SkillPills />
            <Link to="/about" className="btn-ghost mt-6 inline-block rounded-lg px-5 py-2.5 text-sm">Skills, experience &amp; resume →</Link>
            </div>
          </div>
        </Section>
      )}

      {s.commitments?.length > 0 && (
        <section aria-label="My commitments" className="border-y border-bone/10 bg-ink-2/40">
          <ul className="gutter mx-auto grid max-w-6xl gap-x-8 gap-y-3 py-5 text-sm text-bone sm:grid-cols-2 lg:grid-cols-4">
            {s.commitments.map((c) => <li key={c} className="flex gap-2"><span className="text-emerald-500" aria-hidden>✓</span>{c}</li>)}
          </ul>
        </section>
      )}

      {services.length > 0 && (
        <Section id="services" alt>
          <H2 id="services-h" kicker="What I do">How I can help your startup</H2>
          <div className="grid gap-5 md:grid-cols-3">
            {services.map((sv, i) => (
              <Reveal key={sv._id} delay={i * 0.08} className="flex"><article className="card3d flex w-full flex-col rounded-xl border border-bone/10 bg-ink p-6">
                <h3 className="font-serif text-xl text-bone">{sv.title}</h3>
                <p className="mt-2 text-sm text-mist">{sv.summary}</p>
                <ul className="mt-4 space-y-2 text-sm text-bone/90">
                  {sv.bullets.map((b) => <li key={b} className="flex gap-2"><span className="text-crimson-2" aria-hidden>›</span>{b}</li>)}
                </ul>
                {sv.startingPrice && <p className="mt-auto pt-5 text-xs uppercase tracking-wider text-smoke">{sv.startingPrice}</p>}
              </article></Reveal>
            ))}
          </div>
        </Section>
      )}

      <Section id="models">
        <H2 id="models-h" kicker="Ways to work together">Pick the setup that fits your stage</H2>
        <div className="grid gap-5 md:grid-cols-3">
          {MODELS.map(([t, d, who]) => (
            <article key={t} className="card3d rounded-xl border border-bone/10 bg-ink-2/60 p-6">
              <h3 className="font-serif text-xl text-bone">{t}</h3>
              <p className="mt-2 text-sm text-mist">{d}</p>
              <p className="mt-4 text-xs uppercase tracking-wider text-smoke">Best for: <span className="normal-case tracking-normal text-mist">{who}</span></p>
            </article>
          ))}
        </div>
        <p className="mt-6 text-sm text-mist">Not sure which fits? <Link to="/#contact" className="text-bone underline">Tell me about the project</Link> and I&rsquo;ll recommend one.</p>
      </Section>

      {projects.length > 0 && (
        <Section id="work">
          <H2 id="work-h" kicker="Selected work">Things I&rsquo;ve built</H2>
          <div className="grid gap-5 md:grid-cols-2">
            {projects.map((p) => (
              <div key={p._id} className="relative">
              <Link to={`/work/${p.slug}`} className="card3d group block overflow-hidden rounded-xl border border-bone/10 bg-ink-2/60 transition hover:border-bone/30">
                {p.coverImage ? <img src={p.coverImage} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" /> : <div className="aspect-[16/6] w-full" style={{ background: `linear-gradient(135deg, ${p.accent}, transparent 80%)` }} aria-hidden />}
                <div className="p-6">
                  <p className="text-xs uppercase tracking-wider text-smoke">{[p.genre, p.year].filter(Boolean).join(' · ')}</p>
                  <h3 className="mt-1.5 font-serif text-2xl text-bone group-hover:underline">{p.title}</h3>
                  <p className="mt-2 text-sm text-mist">{p.logline}</p>
                  <ul className="mt-4 flex flex-wrap gap-1.5">{p.stack.slice(0, 5).map((t) => <li key={t} className="rounded-full border border-bone/15 px-2.5 py-0.5 text-[11px] text-mist">{t}</li>)}</ul>
                </div>
              </Link>
              <div className="absolute right-3 top-3 flex gap-2">
                <button type="button" onClick={() => setQv(p)} className="rounded-full bg-ink/90 px-3 py-1.5 text-xs font-medium text-bone shadow backdrop-blur">Quick view</button>
                {(p as any).liveUrl && <a href={(p as any).liveUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-bone px-3 py-1.5 text-xs font-medium text-ink shadow">Live ↗</a>}
              </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <SeriesCard />

      <Section id="process" alt>
        <H2 id="process-h" kicker="How it works">A clear process, no surprises</H2>
        <DrawLine />
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} style={{ animationDelay: `${i * 80}ms` }} className="rise card3d rounded-xl border border-bone/10 bg-ink p-6">
              <span className="font-display text-3xl text-crimson-2">0{i + 1}</span>
              <h3 className="mt-2 font-serif text-lg text-bone">{t}</h3>
              <p className="mt-1.5 text-sm text-mist">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      {testimonials.length > 0 && (
        <Section id="testimonials">
          <H2 id="testimonials-h" kicker="Kind words">What clients say</H2>
          <div className="grid gap-5 md:grid-cols-2">
            {testimonials.map((t) => (
              <figure key={t._id} className="card3d rounded-xl border border-bone/10 bg-ink-2/60 p-6">
                <blockquote className="font-serif text-lg text-bone">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-4 text-sm text-mist">{t.name}{t.role || t.company ? ` — ${[t.role, t.company].filter(Boolean).join(', ')}` : ''}</figcaption>
              </figure>
            ))}
          </div>
        </Section>
      )}

      {faqs.length > 0 && (
        <Section id="faq">
          <H2 id="faq-h" kicker="FAQ">Common questions</H2>
          <div className="max-w-3xl divide-y divide-bone/10 rounded-xl border border-bone/10">
            {faqs.map((f) => (
              <details key={f._id} className="group px-5 py-4">
                <summary className="cursor-pointer list-none font-medium text-bone marker:hidden">{f.question}</summary>
                <p className="mt-2 text-sm leading-relaxed text-mist">{f.answer}</p>
              </details>
            ))}
          </div>
        </Section>
      )}

      <BlogStrip />
      <Estimator />
      <CtaBand />

      <Section id="contact" alt>
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <H2 id="contact-h" kicker="Let's talk">Tell me about your project</H2>
            <p className="text-mist">Share the basics and I&rsquo;ll reply within {s.responseTime || '1–2 working days'} with next steps.</p>
            <ul className="mt-6 space-y-2 text-sm text-mist">
              {s.email && <li>Prefer email? <a className="text-bone underline" href={`mailto:${s.email}`}>{s.email}</a></li>}
              {s.whatsapp && <li>Quick question? <a className="text-bone underline" href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noopener noreferrer">Message me on WhatsApp</a></li>}
              {s.bookingUrl && <li>Prefer to talk? <a className="text-bone underline" href={s.bookingUrl} target="_blank" rel="noopener noreferrer">Book a call</a></li>}
              {s.responseTime && <li>I reply within <strong className="text-bone">{s.responseTime}</strong>.</li>}
              {s.workingHours && <li>Working hours: {s.workingHours}</li>}
            </ul>
          </div>
          <div className="relative lg:col-span-3">
            {offline ? (
              <p className="rounded-lg bg-kin/15 px-4 py-3 text-sm text-bone">The enquiry form is temporarily unavailable. Please email me directly{s.email ? <> at <a className="underline" href={`mailto:${s.email}`}>{s.email}</a></> : null} and I&rsquo;ll reply within {s.responseTime || '1–2 working days'}.</p>
            ) : <ContactForm />}
          </div>
        </div>
      </Section>
      <FloatingCall href={s.bookingUrl} />
      {qv && <QuickView p={qv} onClose={() => setQv(null)} />}
    </div>
  );
}
