import { useCallback, useEffect, useState } from 'react';
import { api, errMsg } from '../lib/api';
import { LEAD_STATUSES, type Lead } from '../lib/types';
import { fmtDateTime, label, usePageMeta } from '../lib/util';
import { Badge, Button, Card, Note, Select, Spinner, Textarea } from '../ui/kit';

export default function Leads() {
  usePageMeta('Leads — Admin');
  const [filter, setFilter] = useState<string>('');
  const [items, setItems] = useState<Lead[] | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => api.get<Lead[]>(`/api/admin/leads${filter ? `?status=${filter}` : ''}`).then(setItems).catch((e) => setErr(errMsg(e))), [filter]);
  useEffect(() => { setItems(null); load(); }, [load]);

  async function patch(id: string, body: Partial<Lead>) {
    try { const u = await api.patch<Lead>(`/api/admin/leads/${id}`, body); setItems((l) => l && l.map((x) => (x._id === id ? u : x))); } catch (e) { setErr(errMsg(e)); }
  }
  async function remove(id: string) {
    if (!confirm('Delete this lead permanently?')) return;
    try { await api.del(`/api/admin/leads/${id}`); setItems((l) => l && l.filter((x) => x._id !== id)); } catch (e) { setErr(errMsg(e)); }
  }

  return (
    <>
      <h1 className="font-serif text-3xl text-bone">Leads</h1>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {['', ...LEAD_STATUSES].map((s) => (
          <button key={s} role="tab" aria-selected={filter === s} onClick={() => setFilter(s)} className={`rounded-full border px-3.5 py-1.5 text-xs ${filter === s ? 'border-bone bg-bone text-ink' : 'border-bone/15 text-mist hover:text-bone'}`}>{s ? label(s) : 'All'}</button>
        ))}
      </div>
      {err && <div className="mt-4"><Note>{err}</Note></div>}
      {!items && <Spinner />}
      {items?.length === 0 && <p className="mt-8 text-mist">No leads here yet.</p>}
      <div className="mt-6 space-y-4">
        {items?.map((l) => (
          <Card key={l._id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-medium text-bone">{l.name} {l.company && <span className="text-mist">· {l.company}</span>}</h2>
                <a className="text-sm text-mist underline" href={`mailto:${l.email}`}>{l.email}</a>
                <p className="mt-1 text-xs text-smoke">{fmtDateTime(l.createdAt)} · Budget: {l.budget || '—'} · Timeline: {l.timeline || '—'}</p>
              </div>
              <div className="flex items-center gap-2"><Badge value={l.status} />
                <Select aria-label="Change status" value={l.status} onChange={(e) => patch(l._id, { status: e.target.value as Lead['status'] })} className="!w-auto !py-1.5">{LEAD_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm text-bone/90">{l.message}</p>
            <Textarea aria-label="Private notes" rows={2} placeholder="Private notes (saved when you click away)" defaultValue={l.notes} maxLength={4000} className="mt-4" onBlur={(e) => e.target.value !== l.notes && patch(l._id, { notes: e.target.value })} />
            <div className="mt-3 text-right"><Button variant="danger" small onClick={() => remove(l._id)}>Delete</Button></div>
          </Card>
        ))}
      </div>
    </>
  );
}
