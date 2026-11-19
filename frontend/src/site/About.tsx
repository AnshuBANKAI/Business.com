import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { achievements, profile } from '../data/portfolio';
import { api } from '../lib/api';
import type { ProfileData } from '../lib/types';
import { fallbackProfile } from './fallback';
import { useSite } from './SiteLayout';
import { usePageMeta } from '../lib/util';

const H2 = ({ children }: { children: string }) => <h2 className="mb-5 font-serif text-2xl text-bone sm:text-3xl">{children}</h2>;

export default function About() {
  const { data } = useSite();
  const s = data?.settings;
  const [prof, setProf] = useState<ProfileData | null>(null);
  useEffect(() => {
    api.get<ProfileData>('/api/public/profile').then(setProf).catch(() => setProf(fallbackProfile)); // API down: show the bundled copy
  }, []);
  const { skillGroups, experience, education, certifications } = prof ?? { skillGroups: [], experience: [], education: [], certifications: [] };
  usePageMeta('About Anshu Sharma — Full-Stack & AI Developer', 'Skills, experience, education and resume of Anshu Sharma, freelance full-stack and generative-AI developer.');

  const email = s?.email || profile.email;
  const linkedin = s?.linkedin || profile.links.linkedin;
  const github = s?.github || profile.links.github;
  const facts: [string, string][] = [
    ['Role', 'Full-Stack Developer · Generative AI'],
    ['Based in', s?.location || profile.location],
    ...(education[0] ? ([['Education', `${education[0].degree.replace('Bachelor of Technology — ', 'B.Tech, ')}${education[0].period ? ` · ${education[0].period.split('–').pop()?.trim()}` : ''}`]] as [string, string][]) : []),
    ['Focus areas', profile.interests.join(' · ')],
  ];

  return (
    <article className="gutter mx-auto max-w-6xl py-14 sm:py-20">
      {/* Intro */}
      <header className="grid items-center gap-10 md:grid-cols-5">
        <div className="md:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-crimson-2">About me</p>
          <h1 className="mt-2 font-serif text-4xl text-bone sm:text-5xl">{profile.fullName}</h1>
          <p className="mt-2 text-lg text-mist">{profile.role} · available for freelance work</p>
          <p className="mt-6 max-w-2xl whitespace-pre-line leading-relaxed text-mist">{s?.about || profile.intro}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={profile.resumePdf} download className="btn-primary rounded-lg px-5 py-2.5 text-sm">Download resume (PDF)</a>
            <Link to="/#contact" className="btn-ghost rounded-lg px-5 py-2.5 text-sm">Start a project</Link>
            <a href={`mailto:${email}`} className="btn-ghost rounded-lg px-5 py-2.5 text-sm">Email me</a>
          </div>
          <p className="mt-4 flex gap-5 text-sm text-mist">
            <a className="underline-offset-2 hover:text-bone hover:underline" href={linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a className="underline-offset-2 hover:text-bone hover:underline" href={github} target="_blank" rel="noopener noreferrer">GitHub</a>
            <Link className="underline-offset-2 hover:text-bone hover:underline" to="/series">Watch the cinematic version</Link>
          </p>
        </div>
        <div className="md:col-span-2">
          <img
            src={profile.portrait.src}
            srcSet={profile.portrait.srcSet}
            sizes="(min-width: 768px) 40vw, 90vw"
            alt={profile.portrait.alt}
            className="mx-auto aspect-[4/5] w-full max-w-sm rounded-2xl border border-bone/10 object-cover object-top"
          />
        </div>
      </header>

      {/* Quick facts */}
      <dl className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-bone/10 bg-ink-2/60 p-4">
            <dt className="text-xs uppercase tracking-wider text-smoke">{k}</dt>
            <dd className="mt-1 text-sm text-bone">{v}</dd>
          </div>
        ))}
      </dl>

      {/* Skills */}
      {skillGroups.length > 0 && <section className="mt-16" aria-labelledby="skills-h">
        <H2>What I work with</H2>
        <div className="grid gap-5 md:grid-cols-2">
          {skillGroups.map((c) => (
            <div key={c._id} className="rounded-xl border border-bone/10 bg-ink-2/60 p-5">
              <h3 className="font-serif text-lg text-bone">{c.title}</h3>
              <p className="text-xs text-smoke">{c.subtitle}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {c.skills.map((k) => <li key={k} className="rounded-full border border-bone/15 px-3 py-1 text-xs text-mist">{k}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>}

      {/* Experience */}
      {experience.length > 0 && <section className="mt-16">
        <H2>Experience</H2>
        <div className="space-y-4">
          {experience.map((e) => (
            <div key={e._id} className="rounded-xl border border-bone/10 bg-ink-2/60 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-serif text-lg text-bone">{e.role} · {e.company}</h3>
                <p className="text-xs text-smoke">{e.period} · {e.place}</p>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-mist">{e.points.map((pt) => <li key={pt} className="flex gap-2"><span className="text-crimson-2" aria-hidden>›</span>{pt}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>}

      {/* Leadership */}
      <section className="mt-16">
        <H2>Leadership & community</H2>
        <div className="grid gap-4 md:grid-cols-2">
          {achievements.map((a) => (
            <div key={a.id} className="rounded-xl border border-bone/10 bg-ink-2/60 p-5">
              <h3 className="font-medium text-bone">{a.title}</h3>
              <p className="text-xs text-smoke">{a.org}</p>
              <p className="mt-2 text-sm text-mist">{a.detail.trim()}</p>
              {a.link && <a href={a.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-mist underline hover:text-bone">View credential ↗</a>}
            </div>
          ))}
        </div>
      </section>

      {/* Education + certifications */}
      {(education.length > 0 || certifications.length > 0) && <section className="mt-16 grid gap-10 lg:grid-cols-2">
        {education.length > 0 && <div>
          <H2>Education</H2>
          <ol className="space-y-4">
            {education.map((e) => (
              <li key={e._id} className="rounded-xl border border-bone/10 bg-ink-2/60 p-5">
                <h3 className="font-medium text-bone">{e.degree}</h3>
                <p className="text-sm text-mist">{e.school}, {e.place}</p>
                <p className="mt-1 text-xs text-smoke">{e.period} · {e.score}</p>
              </li>
            ))}
          </ol>
        </div>}
        {certifications.length > 0 && <div>
          <H2>Certifications</H2>
          <ul className="divide-y divide-bone/10 rounded-xl border border-bone/10 bg-ink-2/60">
            {certifications.map((c) => (
              <li key={c._id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-bone">{c.name} <span className="text-smoke">· {c.issuer}</span></span>
                {c.link && <a href={c.link} target="_blank" rel="noopener noreferrer" aria-label={`View ${c.name} certificate`} className="shrink-0 text-xs text-mist underline hover:text-bone">View ↗</a>}
              </li>
            ))}
          </ul>
        </div>}
      </section>}

      <div className="mt-16 rounded-xl border border-bone/10 bg-ink-2/60 p-8 text-center">
        <p className="font-serif text-2xl text-bone">Have a product to build?</p>
        <Link to="/#contact" className="btn-primary mt-5 inline-block rounded-lg px-6 py-3 text-sm">Start a project</Link>
      </div>
    </article>
  );
}
