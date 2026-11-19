import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg } from '../lib/api';
import type { AdminSettings, Automation } from '../lib/types';
import { Button, Card, Note } from '../ui/kit';
import { fmtDateTime, usePageMeta } from '../lib/util';
import { useAuth } from '../lib/auth';

type Stats = { newLeads: number; totalLeads: number; clients: number; activeProjects: number; awaitingApproval: number; unpaidInvoices: number; openProposals: number };

export default function Overview() {
  usePageMeta('Overview — Admin');
  const [s, setS] = useState<Stats | null>(null);
  const [cfg, setCfg] = useState<AdminSettings | null>(null);
  const [err, setErr] = useState('');
  const { user } = useAuth();
  const [auto, setAuto] = useState<Automation | null>(null);
  const [running, setRunning] = useState(false);
  const [ranMsg, setRanMsg] = useState('');
  useEffect(() => {
    api.get<Automation>('/api/admin/automation').then(setAuto).catch(() => undefined);
    api.get<Stats>('/api/admin/stats').then(setS).catch((e) => setErr(errMsg(e)));
    api.get<AdminSettings>('/api/admin/settings').then(setCfg).catch(() => undefined);
  }, []);

  async function runNow() {
    setRunning(true); setRanMsg('');
    try {
      const r = await api.post<{ skipped?: string; clientEmails: number; digest: boolean }>('/api/admin/automation/run');
      setRanMsg(r.skipped ? r.skipped : `Done: ${r.clientEmails} client email(s) sent; summary to you: ${r.digest ? 'sent' : 'nothing needed'}.`);
      setAuto(await api.get<Automation>('/api/admin/automation'));
    } catch (e) { setRanMsg(errMsg(e)); } finally { setRunning(false); }
  }

  const tiles: [string, number | undefined, string][] = [
    ['New leads', s?.newLeads, '/admin/leads'], ['Clients', s?.clients, '/admin/clients'], ['Active projects', s?.activeProjects, '/admin/projects'],
    ['Milestones awaiting approval', s?.awaitingApproval, '/admin/projects'], ['Proposals awaiting reply', s?.openProposals, '/admin/proposals'], ['Unpaid invoices', s?.unpaidInvoices, '/admin/invoices'],
  ];

  // Computed from what you've actually filled in, so it always reflects reality.
  const checklist: [boolean, string, string][] = cfg ? [
    [Boolean(cfg.legalName || cfg.brandName) && Boolean(cfg.address), 'Business name and address (needed on every invoice)', '/admin/settings'],
    [Boolean(cfg.gstin) || Boolean(cfg.pan), 'PAN / GSTIN entered if you have them', '/admin/settings'],
    [Boolean(cfg.lutNumber), 'LUT number entered (only if you invoice overseas clients and are GST-registered)', '/admin/settings'],
    [Boolean(cfg.bankDetails), 'Bank / payment details for invoices', '/admin/settings'],
    [Boolean(cfg.grievanceEmail), 'Privacy contact email (required by India\u2019s DPDP rules)', '/admin/settings'],
    [Boolean(cfg.whatsapp || cfg.bookingUrl), 'A quick way to reach you: WhatsApp number or booking link', '/admin/settings'],
    [(cfg.commitments?.length ?? 0) > 0, 'Your promises to clients are written down', '/admin/settings'],
    [Boolean(user?.twoFactorEnabled), 'Two-factor sign-in is on for your admin account', '/admin/account'],
  ] : [];

  return (
    <>
      <h1 className="font-serif text-3xl text-bone">Overview</h1>
      {err && <div className="mt-4"><Note>{err}</Note></div>}
      {user && !user.twoFactorEnabled && (
        <div className="mt-4 max-w-3xl rounded-lg border border-kin/40 bg-kin/10 px-4 py-3 text-sm text-bone">
          <strong>Protect this account.</strong> It can see every client’s data, invoices and contracts. <Link to="/admin/account" className="underline">Turn on two-factor sign-in</Link>.
        </div>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map(([t, n, to]) => (
          <Link key={t} to={to}><Card className="transition hover:border-bone/30"><p className="text-xs uppercase tracking-wider text-mist">{t}</p><p className="mt-2 font-serif text-4xl text-bone">{n ?? '–'}</p></Card></Link>
        ))}
      </div>

      {auto && (
        <Card className="mt-8 max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-xl text-bone">Automatic reminders</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${auto.enabled ? 'bg-emerald-600/20 text-emerald-500' : 'bg-bone/10 text-smoke'}`}>{auto.enabled ? 'On' : 'Paused'}</span>
          </div>
          <p className="mt-2 text-sm text-mist">Last run: {auto.lastRunAt ? fmtDateTime(auto.lastRunAt) : 'not yet'}{auto.lastSummary ? ` · ${auto.lastSummary.clientEmails} client email(s), summary to you ${auto.lastSummary.digest ? 'sent' : 'not needed'}` : ''}</p>
          {auto.lastSummary?.counts && <p className="mt-1 text-xs text-smoke">Needing attention: {auto.lastSummary.counts.quietLeads} quiet lead(s), {auto.lastSummary.counts.quietProposals} proposal(s) without reply, {auto.lastSummary.counts.overdueInvoices} overdue invoice(s), {auto.lastSummary.counts.staleApprovals} stale approval(s)</p>}
          {!auto.emailConfigured && <div className="mt-3"><Note>Email isn&rsquo;t set up on the server yet (SMTP settings), so reminders are only written to the server log and nobody receives them. See DEPLOYMENT_GUIDE.md.</Note></div>}
          {auto.emailConfigured && !auto.ownerConfigured && <div className="mt-3"><Note>Add your email under Site settings (or OWNER_EMAIL on the server) to receive the daily summary.</Note></div>}
          <div className="mt-4 flex flex-wrap items-center gap-3"><Button variant="ghost" small onClick={runNow} disabled={running}>{running ? 'Running…' : 'Run now'}</Button><Link to="/admin/settings" className="text-sm text-mist underline">Settings</Link>{ranMsg && <span className="text-sm text-mist">{ranMsg}</span>}</div>
        </Card>
      )}

      <Card className="mt-8 max-w-3xl">
        <h2 className="font-serif text-xl text-bone">Launch checklist</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {checklist.map(([ok, text, to]) => (
            <li key={text} className="flex gap-2"><span className={ok ? 'text-emerald-500' : 'text-kin-2'} aria-hidden>{ok ? '✓' : '○'}</span><span className={ok ? 'text-mist' : 'text-bone'}>{ok ? text : <Link to={to} className="underline">{text}</Link>}</span></li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-smoke">Not tracked here, but do before launch: have a lawyer review the Privacy Policy and Terms, add real testimonials, set up SMTP email and database backups. See FREELANCE_SETUP.md.</p>
      </Card>
    </>
  );
}
