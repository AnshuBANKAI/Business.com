import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, errMsg } from '../lib/api';
import type { ClientRow } from '../lib/types';
import { fmtDate, usePageMeta } from '../lib/util';
import { Badge, Button, Card, Field, Input, Note, Spinner } from '../ui/kit';

export default function Clients() {
  usePageMeta('Clients — Admin');
  const [items, setItems] = useState<ClientRow[] | null>(null);
  const [err, setErr] = useState('');
  const [invite, setInvite] = useState<{ name: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get<ClientRow[]>('/api/admin/clients').then(setItems).catch((e) => setErr(errMsg(e))), []);
  useEffect(() => { load(); }, [load]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true); setErr('');
    try {
      const r = await api.post<{ client: ClientRow; inviteLink: string }>('/api/admin/clients', Object.fromEntries(new FormData(form).entries()));
      form.reset(); setInvite({ name: r.client.name, link: r.inviteLink }); setCopied(false); load();
    } catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  }
  async function reinvite(c: ClientRow) {
    if (!confirm(`Send ${c.name} a new invite link? This signs them out everywhere and lets them set a new password.`)) return;
    try { const r = await api.post<{ inviteLink: string }>(`/api/admin/clients/${c._id}/invite`); setInvite({ name: c.name, link: r.inviteLink }); setCopied(false); load(); } catch (e) { setErr(errMsg(e)); }
  }
  async function toggle(c: ClientRow) {
    try { await api.patch(`/api/admin/clients/${c._id}`, { active: !c.active }); load(); } catch (e) { setErr(errMsg(e)); }
  }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setErr('Copy failed — select the link and copy it manually.'); }
  }

  return (
    <>
      <h1 className="font-serif text-3xl text-bone">Clients</h1>
      {err && <div className="mt-4"><Note>{err}</Note></div>}
      {invite && (
        <Card className="mt-6 border-kin/40">
          <p className="text-sm text-bone">Invite link for <strong>{invite.name}</strong> (valid 7 days, works once). It&rsquo;s also emailed if email is configured.</p>
          <div className="mt-3 flex flex-wrap gap-2"><Input readOnly value={invite.link} aria-label="Invite link" onFocus={(e) => e.target.select()} className="min-w-0 flex-1" /><Button small onClick={() => copy(invite.link)}>{copied ? 'Copied ✓' : 'Copy link'}</Button></div>
        </Card>
      )}
      <Card className="mt-6 max-w-3xl">
        <h2 className="font-serif text-xl text-bone">Add a client</h2>
        <form onSubmit={add} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Name"><Input name="name" required maxLength={120} /></Field>
          <Field label="Email"><Input name="email" type="email" required maxLength={254} /></Field>
          <Field label="Company"><Input name="company" maxLength={160} /></Field>
          <Field label="Phone"><Input name="phone" type="tel" maxLength={30} placeholder="+91 98765 43210" /></Field>
          <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create & get invite link'}</Button></div>
        </form>
      </Card>
      {!items && <Spinner />}
      <div className="mt-8 overflow-x-auto rounded-xl border border-bone/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-ink-2/60 text-xs uppercase tracking-wider text-mist"><tr><th className="p-3">Client</th><th className="p-3">Status</th><th className="p-3">Last sign-in</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-bone/10">
            {items?.map((c) => (
              <tr key={c._id}>
                <td className="p-3"><p className="text-bone">{c.name}{c.company && <span className="text-mist"> · {c.company}</span>}</p><p className="text-xs text-smoke">{c.email}{c.phone && <> · {c.phone}</>}</p></td>
                <td className="p-3">{c.active ? <Badge value={c.status} /> : <Badge value="lost" />}{!c.active && <span className="ml-2 text-xs text-smoke">deactivated</span>}</td>
                <td className="p-3 text-mist">{fmtDate(c.lastLoginAt)}</td>
                <td className="space-x-2 p-3 text-right"><Button variant="ghost" small onClick={() => reinvite(c)}>New invite link</Button><Button variant={c.active ? 'danger' : 'ghost'} small onClick={() => toggle(c)}>{c.active ? 'Deactivate' : 'Reactivate'}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
