import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errMsg } from '../lib/api';
import { MILESTONE_STATUSES, PROJECT_STATUSES, type ClientProject, type ClientRow, type Milestone } from '../lib/types';
import { fmtDate, label, toInputDate, usePageMeta } from '../lib/util';
import { Badge, Button, Card, Field, Input, Note, Progress, Select, Spinner, Textarea } from '../ui/kit';
import { FilePanel, MessageThread } from '../ui/project';

const clientName = (c: ClientProject['client']) => (typeof c === 'string' ? '' : `${c.name}${c.company ? ` · ${c.company}` : ''}`);

export function ClientProjectList() {
  usePageMeta('Client projects — Admin');
  const [items, setItems] = useState<ClientProject[] | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [err, setErr] = useState('');
  const nav = useNavigate();
  useEffect(() => {
    api.get<ClientProject[]>('/api/admin/client-projects').then(setItems).catch((e) => setErr(errMsg(e)));
    api.get<ClientRow[]>('/api/admin/clients').then(setClients).catch(() => undefined);
  }, []);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    try { const p = await api.post<ClientProject>('/api/admin/client-projects', Object.fromEntries(new FormData(e.currentTarget).entries())); nav(`/admin/projects/${p._id}`); } catch (e2) { setErr(errMsg(e2)); }
  }

  return (
    <>
      <h1 className="font-serif text-3xl text-bone">Client projects</h1>
      {err && <div className="mt-4"><Note>{err}</Note></div>}
      <Card className="mt-6 max-w-3xl">
        <h2 className="font-serif text-xl text-bone">New project</h2>
        {clients.length === 0 ? <p className="mt-3 text-sm text-mist">Add a client first on the <Link to="/admin/clients" className="underline">Clients</Link> page.</p> : (
          <form onSubmit={create} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Client"><Select name="client" required defaultValue="">{<option value="" disabled>Choose…</option>}{clients.map((c) => <option key={c._id} value={c._id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>)}</Select></Field>
            <Field label="Project title"><Input name="title" required maxLength={160} /></Field>
            <div className="sm:col-span-2"><Button type="submit">Create project</Button></div>
          </form>
        )}
      </Card>
      {!items && !err && <Spinner />}
      <ul className="mt-8 space-y-3">
        {items?.map((p) => (
          <li key={p._id}>
            <Link to={`/admin/projects/${p._id}`} className="block rounded-xl border border-bone/10 bg-ink-2/60 p-4 transition hover:border-bone/30">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-bone">{p.title} <span className="text-sm text-mist">— {clientName(p.client)}</span></p><Badge value={p.status} /></div>
              <div className="mt-3 max-w-sm"><Progress value={p.progress} /></div>
              {p.milestones.some((m) => m.status === 'delivered') && <p className="mt-2 text-xs text-kin-2">● Waiting for client approval</p>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function ClientProjectEdit() {
  const { id = '' } = useParams();
  const base = `/api/admin/client-projects/${id}`;
  const nav = useNavigate();
  const [p, setP] = useState<ClientProject | null>(null);
  const [form, setForm] = useState({ title: '', description: '', status: 'planning', startDate: '', dueDate: '' });
  const [ms, setMs] = useState<Milestone[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  usePageMeta(p ? `${p.title} — Admin` : 'Project — Admin');

  const apply = (d: ClientProject) => {
    setP(d);
    setForm({ title: d.title, description: d.description, status: d.status, startDate: toInputDate(d.startDate), dueDate: toInputDate(d.dueDate) });
    setMs(d.milestones.map((m) => ({ ...m, dueDate: toInputDate(m.dueDate) })));
  };
  const load = useCallback(() => api.get<ClientProject>(base).then(apply).catch((e) => setMsg({ ok: false, text: errMsg(e) })), [base]);
  useEffect(() => { load(); }, [load]);

  const patchMs = (i: number, v: Partial<Milestone>) => setMs((l) => l.map((m, j) => (j === i ? { ...m, ...v } : m)));
  const move = (i: number, d: number) => setMs((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n; });

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const body = { ...form, startDate: form.startDate || null, dueDate: form.dueDate || null, milestones: ms.map((m) => ({ _id: m._id, title: m.title, description: m.description, status: m.status, dueDate: m.dueDate || null })) };
      apply(await api.patch<ClientProject>(base, body));
      setMsg({ ok: true, text: 'Saved. Newly delivered milestones were emailed to the client (if email is configured).' });
    } catch (e2) { setMsg({ ok: false, text: errMsg(e2) }); } finally { setBusy(false); }
  }
  async function remove() {
    if (!confirm('Delete this project, its messages and its files permanently?')) return;
    try { await api.del(base); nav('/admin/projects'); } catch (e) { setMsg({ ok: false, text: errMsg(e) }); }
  }

  if (!p) return msg ? <Note>{msg.text}</Note> : <Spinner />;
  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <Link to="/admin/projects" className="text-sm text-mist hover:text-bone">← All projects</Link>
        <h1 className="mt-3 font-serif text-3xl text-bone">{p.title}</h1>
        <p className="text-sm text-mist">Client: {clientName(p.client)} · {p.progress}% complete · updated {fmtDate(p.updatedAt)}</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title"><Input value={form.title} required maxLength={160} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{PROJECT_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select></Field>
            <Field label="Start date"><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="Due date"><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Description (visible to the client)"><Textarea value={form.description} maxLength={4000} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between"><h2 className="font-serif text-xl text-bone">Milestones</h2><Button variant="ghost" small onClick={() => setMs([...ms, { title: '', description: '', dueDate: '', status: 'pending' }])}>Add milestone</Button></div>
          <p className="mt-1 text-xs text-smoke">Set a milestone to <strong>Delivered</strong> to ask the client to review it. They approve it from their portal.</p>
          <ul className="mt-4 space-y-3">
            {ms.map((m, i) => (
              <li key={m._id ?? `new-${i}`} className="grid gap-3 rounded-lg border border-bone/10 p-3 sm:grid-cols-6">
                <div className="sm:col-span-3"><Input aria-label="Milestone title" placeholder="Title" required maxLength={160} value={m.title} onChange={(e) => patchMs(i, { title: e.target.value })} /></div>
                <div className="sm:col-span-2"><Select aria-label="Milestone status" value={m.status} onChange={(e) => patchMs(i, { status: e.target.value as Milestone['status'] })}>{MILESTONE_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select></div>
                <div className="sm:col-span-1"><Input aria-label="Due date" type="date" value={String(m.dueDate ?? '')} onChange={(e) => patchMs(i, { dueDate: e.target.value })} /></div>
                <div className="sm:col-span-6"><Input aria-label="Description" placeholder="Description (optional)" maxLength={1000} value={m.description} onChange={(e) => patchMs(i, { description: e.target.value })} /></div>
                <div className="flex gap-2 sm:col-span-6"><Button variant="ghost" small aria-label="Move up" onClick={() => move(i, -1)}>↑</Button><Button variant="ghost" small aria-label="Move down" onClick={() => move(i, 1)}>↓</Button><Button variant="danger" small onClick={() => setMs(ms.filter((_, j) => j !== i))}>Remove</Button></div>
              </li>
            ))}
            {ms.length === 0 && <li className="text-sm text-smoke">No milestones yet.</li>}
          </ul>
        </Card>
        {msg && <Note kind={msg.ok ? 'ok' : 'error'}>{msg.text}</Note>}
        <div className="flex gap-3"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button><Button variant="danger" onClick={remove}>Delete project</Button></div>
      </form>

      <section aria-labelledby="fl"><h2 id="fl" className="mb-3 font-serif text-xl text-bone">Files</h2><FilePanel base={base} files={p.files} onChange={load} canDelete /></section>
      <section aria-labelledby="ms"><h2 id="ms" className="mb-3 font-serif text-xl text-bone">Messages</h2><Card className="p-4"><MessageThread base={base} me="admin" /></Card></section>
    </div>
  );
}
