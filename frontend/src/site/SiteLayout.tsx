import { createContext, useContext, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth, homeFor } from '../lib/auth';
import { useTheme } from '../hooks/useTheme';
import type { SiteData } from '../lib/types';
import { fallbackSite } from './fallback';

type SiteCtx = { data: SiteData | null; offline: boolean };
const Ctx = createContext<SiteCtx>({ data: null, offline: false });
export const useSite = () => useContext(Ctx);

/** Always-visible entry points for the two private areas. */
function AccessBand() {
  const { user } = useAuth();
  return (
    <section aria-label="Private areas" className="border-t border-bone/10 bg-ink-2/50 py-12">
      <div className="gutter mx-auto grid max-w-6xl gap-5">
        <div className="rounded-xl border border-bone/10 bg-ink p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-crimson-2">For my clients</p>
          <h2 className="mt-2 font-serif text-2xl text-bone">Client portal</h2>
          <p className="mt-2 text-sm text-mist">Follow your project&rsquo;s milestones, approve deliverables, share files and message me, all in one private workspace.</p>
          <Link to={user?.role === 'client' ? '/portal' : '/login?next=/portal'} className="btn-primary mt-5 inline-block rounded-lg px-5 py-2.5 text-sm">{user?.role === 'client' ? 'Open my portal' : 'Open client portal'}</Link>
        </div>
      </div>
    </section>
  );
}

export default function SiteLayout() {
  const [data, setData] = useState<SiteData | null>(null);
  const [offline, setOffline] = useState(false);
  const { user } = useAuth();
  const { toggle, isDark } = useTheme();
  const { pathname, hash } = useLocation();

  useEffect(() => {
    api.get<SiteData>('/api/public/site').then(setData).catch(() => {
      setData(fallbackSite);
      setOffline(true);
    });
  }, []);

  // Scroll to #section after route changes / data loads
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 60);
    return () => clearTimeout(t);
  }, [pathname, hash, data]);

  useEffect(() => {
    document.documentElement.classList.add('site-public');
    return () => document.documentElement.classList.remove('site-public');
  }, []);

  const s = data?.settings;
  const link = 'rounded px-2 py-1 text-sm text-mist transition hover:text-bone';

  return (
    <Ctx.Provider value={{ data, offline }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-bone focus:px-3 focus:py-2 focus:text-ink">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-bone/10 bg-ink/85 backdrop-blur">
        <div className="gutter mx-auto flex max-w-6xl items-center justify-between gap-4 py-3.5">
          <Link to="/" className="font-serif text-lg text-bone">Anshu Sharma</Link>
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            <Link className={link} to="/#services">Services</Link>
            <Link className={link} to="/#work">Work</Link>
            <Link className={link} to="/about">About me</Link>
            {data?.hasPosts && <Link className={link} to="/insights">Insights</Link>}
            <Link className={link} to="/#process">Process</Link>
            <Link className={link} to="/#faq">FAQ</Link>
          </nav>
          <div className="flex items-center gap-1.5">
            <button onClick={toggle} aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`} className="rounded-lg border border-bone/15 px-2.5 py-1.5 text-xs text-mist hover:text-bone">{isDark ? 'Light' : 'Dark'}</button>
            <Link to={user?.role === 'client' ? '/portal' : '/login?next=/portal'} className="hidden rounded-lg px-2.5 py-1.5 text-sm text-mist hover:text-bone md:block">Client portal</Link>
            {user && <Link to={homeFor(user.role)} className="hidden rounded-lg px-2.5 py-1.5 text-sm text-mist hover:text-bone md:block">{user.role === 'admin' ? 'Admin' : 'My area'}</Link>}
            <Link to="/#contact" className="btn-primary rounded-lg px-4 py-2 text-sm">Start a project</Link>
          </div>
        </div>
      </header>
      <main id="main"><Outlet /></main>
      <AccessBand />
      <footer className="border-t border-bone/10 py-10 text-sm text-mist">
        <div className="gutter mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          <div>
            <p className="font-serif text-lg text-bone">{s?.legalName || s?.brandName || 'Anshu Sharma'}</p>
            {s?.address && <p className="mt-2 whitespace-pre-line">{s.address}</p>}
            {!s?.address && s?.location && <p className="mt-2">{s.location}</p>}
            {s?.gstin && <p className="mt-2">GSTIN: {s.gstin}</p>}
          </div>
          <div className="flex flex-col gap-2">
            {s?.email && <a className="hover:text-bone" href={`mailto:${s.email}`}>{s.email}</a>}
            {s?.whatsapp && <a className="hover:text-bone" href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
            {s?.linkedin && <a className="hover:text-bone" href={s.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
            {s?.github && <a className="hover:text-bone" href={s.github} target="_blank" rel="noopener noreferrer">GitHub</a>}
          </div>
          <div className="flex flex-col gap-2">
            <Link className="hover:text-bone" to="/about">About me</Link>
            {data?.hasPosts && <Link className="hover:text-bone" to="/insights">Insights</Link>}
            <Link className="hover:text-bone" to="/series">Cinematic portfolio</Link>
            <Link className="hover:text-bone" to="/privacy">Privacy Policy</Link>
            <Link className="hover:text-bone" to="/terms">Terms of Service</Link>
          </div>
        </div>
        <p className="gutter mx-auto mt-8 max-w-6xl text-xs text-smoke">© {new Date().getFullYear()} {s?.legalName || s?.brandName || 'Anshu Sharma'}. All rights reserved.</p>
      </footer>
    </Ctx.Provider>
  );
}
