import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { ClientProject, Invoice, Milestone } from '../lib/types';
import { applyTheme, type Theme } from '../hooks/useTheme';
import { fmtDate, label, usePageMeta } from '../lib/util';
import { Badge, Button, Card, Note, Progress, Spinner, Textarea } from '../ui/kit';
import { FilePanel, MessageThread } from '../ui/project';
import AccountForm, { ProfileForm } from '../ui/AccountForm';
import TwoFactorPanel from '../ui/TwoFactor';

function ApproveDialog({ m, busy, onConfirm, onClose }: { m: Milestone; busy: boolean; onConfirm: () => void; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center" onClick={onClose}>
      <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="ap-t" onClick={(e) => e.stopPropagation()} className="dlg-pop w-full max-w-md rounded-2xl border border-bone/10 bg-ink p-7 text-bone shadow-2xl outline-none">
        <h2 id="ap-t" className="font-serif text-2xl">Approve this milestone?</h2>
        <p className="mt-3 text-sm font-medium text-bone">{m.title}</p>
        <p className="mt-2 text-sm text-mist">This tells me you&rsquo;re happy with this stage and I&rsquo;ll move on to the next one. If anything needs fixing, choose &ldquo;Request changes&rdquo; instead.</p>
        <div className="mt-6 flex gap-3">
          <Button variant="accent" disabled={busy} onClick={onConfirm}>{busy ? 'Approving…' : 'Yes, approve'}</Button>
          <Button variant="ghost" onClick={onClose}>Not yet</Button>
        </div>
      </div>
    </div>
  );
}

type Evt = { at: string; text: string; who: 'you' | 'me' | 'sys' };
function Activity({ p }: { p: ClientProject }) {
  const ev: Evt[] = [
    ...p.files.map((f) => ({ at: f.createdAt, text: `${f.uploadedBy === 'client' ? 'You' : 'I'} added the file “${f.name}”`, who: (f.uploadedBy === 'client' ? 'you' : 'me') as Evt['who'] })),
    ...p.milestones.filter((m) => m.approvedAt).map((m) => ({ at: m.approvedAt!, text: `You approved “${m.title}”`, who: 'you' as const })),
    ...(p.startDate ? [{ at: p.startDate, text: 'Project kicked off', who: 'sys' as const }] : []),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 8);
  if (!ev.length) return <p className="text-sm text-smoke">Updates will appear here as work moves along.</p>;
  return (
    <ol className="relative ml-2 space-y-4 border-l border-bone/15 pl-6">
      {ev.map((e, i) => (
        <li key={i} className="relative">
          <span aria-hidden className={`absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-ink ${e.who === 'you' ? 'bg-crimson' : e.who === 'me' ? 'bg-bone' : 'bg-smoke'}`} />
          <p className="text-sm text-bone">{e.text}</p>
          <p className="text-xs text-smoke">{fmtDate(e.at)}</p>
        </li>
      ))}
    </ol>
  );
}

const ICONS: Record<string, string> = {
  dash: 'M3 12l9-8 9 8v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  inv: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  prop: 'M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6',
  acc: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  folder: 'M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  bell: 'M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0',
  check: 'M5 12l5 5 9-10',
};
const Ico = ({ n, className = 'h-5 w-5' }: { n: string; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={ICONS[n]} /></svg>
);

export function PortalLayout() {
  const { user, signOut } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'));
  const flip = () => { const t: Theme = theme === 'light' ? 'dark' : 'light'; applyTheme(t); setTheme(t); };
  const nav = [['/portal', 'Dashboard', 'dash', true], ['/portal/invoices', 'Invoices', 'inv', false], ['/portal/proposals', 'Proposals', 'prop', false], ['/portal/account', 'Account', 'acc', false]] as const;
  const initials = (user?.name ?? 'C').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const item = ({ isActive }: { isActive: boolean }) => `pt-nav flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${isActive ? 'pt-nav-on text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`;
  return (
    <div className="pt min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="no-print pt-side flex flex-col gap-6 p-4 lg:sticky lg:top-0 lg:h-screen lg:p-5">
        <Link to="/portal" className="flex items-center gap-3 px-2 pt-1 text-white">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#8a6bff] to-[#5a3de0] text-sm font-bold">AS</span>
          <span><span className="block text-lg font-bold leading-tight">Client portal</span><span className="block text-[11px] text-white/60">Anshu Sharma · Developer</span></span>
        </Link>
        <nav aria-label="Portal" className="flex gap-1 overflow-x-auto lg:flex-col">
          {nav.map(([to, text, ic, end]) => <NavLink key={to} end={end} to={to} className={item}><Ico n={ic} />{text}</NavLink>)}
        </nav>
        <div className="mt-auto hidden rounded-2xl bg-gradient-to-br from-[#6d4aff] to-[#4a2fd6] p-4 text-white lg:block">
          <p className="font-semibold">Need a hand?</p>
          <p className="mt-1 text-xs text-white/80">Open any project and send me a message. It reaches me directly.</p>
        </div>
        <div className="hidden items-center gap-3 border-t border-white/10 pt-4 text-white lg:flex">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-sm font-semibold">{initials}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{user?.name}</span><span className="block text-xs text-white/60">Client</span></span>
          <button onClick={signOut} className="rounded-lg border border-white/20 px-2.5 py-1 text-xs hover:bg-white/10">Sign out</button>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="no-print flex items-center justify-end gap-3 px-4 pt-4 sm:px-8 lg:pt-6">
          <button onClick={flip} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} className="pt-chip rounded-full px-4 py-2 text-xs font-medium">{theme === 'light' ? '☾ Dark' : '☀ Light'}</button>
          <button onClick={signOut} className="pt-chip rounded-full px-4 py-2 text-xs font-medium lg:hidden">Sign out</button>
        </div>
        <main className="mx-auto max-w-6xl px-4 pb-14 pt-4 sm:px-8"><Outlet /></main>
      </div>
    </div>
  );
}
export function PortalAccount() {
  usePageMeta('Account — Client portal');
  return <><h1 className="mb-6 font-serif text-3xl text-bone">Account</h1><div className="space-y-6"><ProfileForm /><TwoFactorPanel /><AccountForm /></div></>;
}

const TONES = { purple: 'bg-[#ece8ff] text-[#5b3df5]', blue: 'bg-[#e3efff] text-[#2f6fe0]', green: 'bg-[#dcf7e8] text-[#16a05a]', orange: 'bg-[#ffeedd] text-[#e07a1f]' } as const;
function StatCard({ tone, icon, value, text }: { tone: keyof typeof TONES; icon: string; value: string | number; text: string }) {
  return (
    <div className="pt-card card3d relative overflow-hidden rounded-2xl px-5 pb-12 pt-5">
      <div className="relative z-10 flex items-center gap-4">
        <span className={`grid h-12 w-12 place-items-center rounded-xl ${TONES[tone]}`}><Ico n={icon} className="h-6 w-6" /></span>
        <div><p className="text-3xl font-bold text-bone">{value}</p><p className="text-sm text-mist">{text}</p></div>
      </div>
      <svg aria-hidden viewBox="0 0 200 40" preserveAspectRatio="none" className={`absolute inset-x-0 bottom-0 h-9 w-full opacity-70 ${TONES[tone].split(' ')[1]}`}><path d="M0 34 C30 30 40 20 70 26 S120 36 150 18 S185 12 200 8 V40 H0Z" fill="currentColor" fillOpacity=".12" /><path d="M0 34 C30 30 40 20 70 26 S120 36 150 18 S185 12 200 8" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
    </div>
  );
}
const Panel = ({ title, aside, children, className = '' }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <section className={`pt-card rounded-2xl p-5 ${className}`}><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-bone">{title}</h2>{aside}</div>{children}</section>
);

export function PortalHome() {
  usePageMeta('Dashboard — Client portal');
  const { user } = useAuth();
  const [items, setItems] = useState<ClientProject[] | null>(null);
  const [inv, setInv] = useState<Invoice[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.get<ClientProject[]>('/api/portal/projects').then(setItems).catch((e) => setErr(errMsg(e)));
    api.get<Invoice[]>('/api/portal/invoices').then(setInv).catch(() => setInv([]));
  }, []);

  const first = (user?.name ?? '').split(' ')[0] || 'there';
  const all = items ?? [];
  const ms = all.flatMap((p) => p.milestones.map((m) => ({ m, p })));
  const waiting = ms.filter((x) => x.m.status === 'delivered');
  const approved = ms.filter((x) => x.m.status === 'approved').length;
  const openInv = inv.filter((i) => i.status === 'sent').length;
  const upcoming = ms.filter((x) => x.m.dueDate && x.m.status !== 'approved').sort((a, b) => +new Date(a.m.dueDate!) - +new Date(b.m.dueDate!)).slice(0, 4);
  const quick: [string, string, string, keyof typeof TONES][] = [['/portal/invoices', 'Invoices', 'inv', 'purple'], ['/portal/proposals', 'Proposals', 'prop', 'blue'], ['/portal/account', 'Account', 'acc', 'green'], ['/portal', 'Projects', 'folder', 'orange']];

  return (
    <>
      <h1 className="text-3xl font-bold text-bone">Welcome back, {first}! <span aria-hidden>👋</span></h1>
      <p className="mt-1 text-mist">Here&rsquo;s what&rsquo;s happening with your projects today.</p>
      {err && <div className="mt-4"><Note>{err}</Note></div>}
      {!items && !err && <Spinner />}
      {items && (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard tone="blue" icon="folder" value={all.filter((p) => p.status !== 'completed').length} text="Active projects" />
            <StatCard tone="orange" icon="bell" value={waiting.length} text="Awaiting your review" />
            <StatCard tone="green" icon="check" value={`${approved}/${ms.length}`} text="Milestones approved" />
            <StatCard tone="purple" icon="inv" value={openInv} text="Open invoices" />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Panel title="Your projects" className="lg:col-span-2">
              {all.length === 0 ? (
                <p className="py-6 text-center text-sm text-mist">Your project space is ready. Once we&rsquo;ve agreed the scope, your project appears here with milestones, files, messages and invoices.</p>
              ) : (
                <ul className="divide-y divide-bone/10">
                  {all.map((p) => (
                    <li key={p._id}>
                      <Link to={`/portal/projects/${p._id}`} className="block rounded-xl px-2 py-4 transition hover:bg-bone/5">
                        <div className="flex items-center justify-between gap-3"><span className="font-semibold text-bone">{p.title}</span><Badge value={p.status} /></div>
                        <div className="mt-3"><Progress value={p.progress} /><p className="mt-1.5 text-xs text-smoke">{p.progress}% complete · due {fmtDate(p.dueDate)}</p></div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <div className="space-y-6">
              <Panel title="Needs your attention">
                {waiting.length === 0 ? <p className="text-sm text-mist">You&rsquo;re all caught up. Nothing needs your review.</p> : (
                  <ul className="space-y-2">{waiting.map(({ m, p }) => (
                    <li key={m._id}><Link to={`/portal/projects/${p._id}`} className="flex items-center justify-between gap-3 rounded-xl bg-[#e07a1f]/15 px-3 py-2.5 text-sm text-bone hover:bg-[#e07a1f]/25"><span className="min-w-0 truncate"><strong>{m.title}</strong><span className="block text-xs opacity-80">{p.title}</span></span><span className="shrink-0 rounded-full bg-[#e07a1f] px-2.5 py-1 text-xs font-semibold text-white">Review</span></Link></li>
                  ))}</ul>
                )}
              </Panel>
              <Panel title="Quick actions">
                <div className="grid grid-cols-2 gap-3">
                  {quick.map(([to, text, ic, tone]) => (
                    <Link key={text} to={to} className="flex flex-col items-center gap-2 rounded-xl bg-bone/5 px-3 py-4 text-sm font-medium text-bone transition hover:-translate-y-0.5 hover:bg-bone/10"><span className={`grid h-9 w-9 place-items-center rounded-lg ${TONES[tone]}`}><Ico n={ic} className="h-5 w-5" /></span>{text}</Link>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
          <Panel title="Upcoming milestones" className="mt-6">
            {upcoming.length === 0 ? <p className="text-sm text-mist">No upcoming due dates yet.</p> : (
              <ul className="grid gap-3 md:grid-cols-2">{upcoming.map(({ m, p }) => {
                const d = new Date(m.dueDate!);
                return (
                  <li key={m._id}><Link to={`/portal/projects/${p._id}`} className="flex items-center gap-4 rounded-xl p-2 transition hover:bg-bone/5">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-bone/5 text-center leading-tight"><span><span className="block text-lg font-bold text-bone">{d.getDate()}</span><span className="block text-[11px] uppercase text-smoke">{d.toLocaleString('en', { month: 'short' })}</span></span></span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-bone">{m.title}</span><span className="block truncate text-xs text-smoke">{p.title}</span></span>
                    <Badge value={m.status} />
                  </Link></li>
                );
              })}</ul>
            )}
          </Panel>
        </>
      )}
    </>
  );
}
export function PortalProject() {
  const { id = '' } = useParams();
  const base = `/api/portal/projects/${id}`;
  const [p, setP] = useState<ClientProject | null>(null);
  const [err, setErr] = useState('');
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState<Milestone | null>(null);
  usePageMeta(p ? `${p.title} — Client portal` : 'Project — Client portal');

  const load = useCallback(() => api.get<ClientProject>(base).then(setP).catch((e) => setErr(errMsg(e))), [base]);
  useEffect(() => { load(); }, [load]);

  async function act(path: string, body?: unknown) {
    setBusy(true);
    setErr('');
    try {
      setP(await api.post<ClientProject>(`${base}/milestones/${path}`, body));
      setNoteFor(null);
      setApproving(null);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  if (err && !p) return <div><Note>{err}</Note><Link to="/portal" className="mt-4 inline-block text-mist underline">Back to projects</Link></div>;
  if (!p) return <Spinner />;

  const waiting = p.milestones.filter((m) => m.status === 'delivered').length;
  const milestone = (m: Milestone) => (
    <li key={m._id} className={`rounded-xl border p-4 ${m.status === 'delivered' ? 'border-crimson/50 bg-ink-2 shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-crimson)_12%,transparent)]' : 'border-bone/10 bg-ink'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-bone">{m.title}</h3>
        <div className="flex items-center gap-3"><span className="text-xs text-smoke">{m.dueDate ? `due ${fmtDate(m.dueDate)}` : ''}</span><Badge value={m.status} /></div>
      </div>
      {m.description && <p className="mt-1.5 text-sm text-mist">{m.description}</p>}
      {m.status === 'approved' && <p className="mt-2 text-xs text-smoke">Approved {fmtDate(m.approvedAt)}</p>}
      {m.status === 'delivered' && m._id && (
        <div className="mt-3">
          {noteFor === m._id ? (
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); const note = String(new FormData(e.currentTarget).get('note')).trim(); if (note) act(`${m._id}/request-changes`, { note }); }}>
              <Textarea name="note" rows={3} required maxLength={1000} placeholder="What should change?" aria-label="Requested changes" />
              <div className="flex gap-2"><Button type="submit" small disabled={busy}>Send request</Button><Button variant="ghost" small onClick={() => setNoteFor(null)}>Cancel</Button></div>
            </form>
          ) : (
            <div className="flex gap-2">
              <Button variant="accent" small disabled={busy} onClick={() => setApproving(m)}>Approve</Button>
              <Button variant="ghost" small onClick={() => setNoteFor(m._id!)}>Request changes</Button>
            </div>
          )}
        </div>
      )}
    </li>
  );

  return (
    <div className="space-y-10">
      <div>
        <Link to="/portal" className="text-sm text-mist hover:text-bone">← All projects</Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><h1 className="font-serif text-3xl text-bone">{p.title}</h1><Badge value={p.status} /></div>
        {p.description && <p className="mt-3 max-w-3xl whitespace-pre-line text-mist">{p.description}</p>}
        <div className="mt-5 max-w-md"><Progress value={p.progress} /><p className="mt-1.5 text-xs text-smoke">{p.progress}% complete · {label(p.status)} · {p.startDate ? `started ${fmtDate(p.startDate)} · ` : ''}due {fmtDate(p.dueDate)}</p></div>
      </div>
      {waiting > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-crimson/40 bg-crimson/10 p-4">
          <p className="text-sm text-bone"><strong>{waiting} milestone{waiting > 1 ? 's are' : ' is'} waiting for your review.</strong> Approve it, or ask for changes.</p>
          <a href="#ms" className="btn-primary rounded-full px-4 py-2 text-xs">Review now</a>
        </div>
      ) : (
        <p className="rounded-xl border border-bone/10 bg-ink-2/60 p-4 text-sm text-mist">Nothing needed from you right now. This page updates as work progresses.</p>
      )}
      {err && <Note>{err}</Note>}
      <section aria-labelledby="ms"><h2 id="ms" className="mb-3 font-serif text-xl text-bone">Milestones</h2>
        {p.milestones.length === 0 ? <p className="text-sm text-smoke">Milestones will appear here once the plan is set.</p> : <ol className="space-y-3">{p.milestones.map(milestone)}</ol>}
      </section>
      <section aria-labelledby="act"><h2 id="act" className="mb-4 font-serif text-xl text-bone">Recent activity</h2><Activity p={p} /></section>
      <section aria-labelledby="fl"><h2 id="fl" className="mb-3 font-serif text-xl text-bone">Files</h2><FilePanel base={base} files={p.files} onChange={load} /></section>
      <section aria-labelledby="msg"><h2 id="msg" className="mb-3 font-serif text-xl text-bone">Messages</h2><Card className="p-4"><MessageThread base={base} me="client" /></Card></section>
      {approving && <ApproveDialog m={approving} busy={busy} onClose={() => setApproving(null)} onConfirm={() => act(`${approving._id}/approve`)} />}
    </div>
  );
}
