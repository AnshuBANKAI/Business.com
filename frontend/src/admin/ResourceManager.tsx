import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, errMsg } from '../lib/api';
import { usePageMeta } from '../lib/util';
import { Badge, Button, Card, Field, Input, Note, Select, Spinner, Textarea } from '../ui/kit';

type Kind = 'text' | 'textarea' | 'lines' | 'number' | 'bool' | 'metrics' | 'image' | 'color';
export type FieldDef = { name: string; label: string; type: Kind; hint?: string; rows?: number };
export type Config = {
  endpoint: string; title: string; singular: string; primary: string; secondary?: string; fields: FieldDef[]; defaults: Record<string, unknown>;
};
type Rec = Record<string, unknown> & { _id: string };
type Draft = Record<string, string | boolean>;

const toDraft = (cfg: Config, rec: Record<string, unknown>): Draft => {
  const d: Draft = {};
  for (const f of cfg.fields) {
    const v = rec[f.name];
    if (f.type === 'bool') d[f.name] = Boolean(v);
    else if (f.type === 'lines') d[f.name] = Array.isArray(v) ? (v as string[]).join('\n') : '';
    else if (f.type === 'metrics') d[f.name] = Array.isArray(v) ? (v as { value: string; label: string }[]).map((m) => `${m.value} | ${m.label}`).join('\n') : '';
    else d[f.name] = v === undefined || v === null ? '' : String(v);
  }
  return d;
};
const toPayload = (cfg: Config, d: Draft) => {
  const out: Record<string, unknown> = {};
  for (const f of cfg.fields) {
    const v = d[f.name];
    if (f.type === 'bool') out[f.name] = Boolean(v);
    else if (f.type === 'number') out[f.name] = Number(v || 0);
    else if (f.type === 'lines') out[f.name] = String(v).split('\n').map((s) => s.trim()).filter(Boolean);
    else if (f.type === 'metrics') out[f.name] = String(v).split('\n').map((s) => s.trim()).filter(Boolean).map((line) => { const [value, ...rest] = line.split('|'); return { value: value.trim(), label: rest.join('|').trim() }; });
    else out[f.name] = String(v).trim();
  }
  return out;
};

export default function ResourceManager({ cfg }: { cfg: Config }) {
  usePageMeta(`${cfg.title} — Admin`);
  const [items, setItems] = useState<Rec[] | null>(null);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get<Rec[]>(cfg.endpoint).then(setItems).catch((e) => setErr(errMsg(e))), [cfg.endpoint]);
  useEffect(() => { setItems(null); setEditing(null); load(); }, [load]);

  const open = (rec?: Rec) => { setDraft(toDraft(cfg, rec ?? cfg.defaults)); setEditing(rec ? rec._id : 'new'); setErr(''); setFieldErr({}); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const set = (name: string, v: string | boolean) => setDraft((d) => ({ ...d, [name]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(''); setFieldErr({});
    try {
      const payload = toPayload(cfg, draft);
      if (editing === 'new') await api.post(cfg.endpoint, payload); else await api.put(`${cfg.endpoint}/${editing}`, payload);
      setEditing(null); await load();
    } catch (e2) { setErr(errMsg(e2)); if (e2 instanceof ApiError && e2.fields) setFieldErr(e2.fields); } finally { setBusy(false); }
  }
  async function remove(rec: Rec) {
    if (!confirm(`Delete "${String(rec[cfg.primary])}"? This can't be undone.`)) return;
    try { await api.del(`${cfg.endpoint}/${rec._id}`); await load(); } catch (e) { setErr(errMsg(e)); }
  }
  async function upload(name: string, file?: File) {
    if (!file) return;
    try { const r = await api.upload<{ url: string }>('/api/admin/upload', 'image', file); set(name, r.url); } catch (e) { setErr(errMsg(e)); }
  }

  function control(f: FieldDef) {
    const v = draft[f.name];
    switch (f.type) {
      case 'textarea': case 'lines': case 'metrics':
        return <Textarea rows={f.rows ?? (f.type === 'textarea' ? 4 : 5)} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} />;
      case 'bool':
        return <Select value={v ? 'yes' : 'no'} onChange={(e) => set(f.name, e.target.value === 'yes')}><option value="yes">Yes</option><option value="no">No</option></Select>;
      case 'number': return <Input type="number" value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} />;
      case 'color': return <Input type="color" value={String(v || '#b8351a')} onChange={(e) => set(f.name, e.target.value)} className="h-11 !w-24 p-1" />;
      case 'image': return (
        <div className="space-y-2">
          {v ? <img src={String(v)} alt="" className="max-h-32 rounded-lg border border-bone/10" /> : null}
          <div className="flex flex-wrap items-center gap-2">
            <input type="file" accept="image/png,image/jpeg,image/webp" aria-label={f.label} onChange={(e) => upload(f.name, e.target.files?.[0])} className="text-xs text-mist" />
            {v ? <Button variant="ghost" small onClick={() => set(f.name, '')}>Remove</Button> : null}
          </div>
        </div>
      );
      default: return <Input value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} />;
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-bone">{cfg.title}</h1>
        {!editing && <Button onClick={() => open()}>Add {cfg.singular}</Button>}
      </div>
      {err && <div className="mt-4"><Note>{err}</Note></div>}

      {editing && (
        <Card className="mt-6">
          <h2 className="font-serif text-xl text-bone">{editing === 'new' ? `New ${cfg.singular}` : `Edit ${cfg.singular}`}</h2>
          <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-2">
            {cfg.fields.map((f) => (
              <div key={f.name} className={['textarea', 'lines', 'metrics', 'image'].includes(f.type) ? 'md:col-span-2' : ''}>
                <Field label={f.label} hint={f.hint ?? (f.type === 'lines' ? 'One item per line' : f.type === 'metrics' ? 'One per line, as: value | label  (e.g. 92% | accuracy)' : undefined)} error={fieldErr[f.name]}>{control(f)}</Field>
              </div>
            ))}
            <div className="flex gap-3 md:col-span-2"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
          </form>
        </Card>
      )}

      {!items && !err && <Spinner />}
      {items?.length === 0 && !editing && <p className="mt-8 text-mist">Nothing here yet.</p>}
      <ul className="mt-6 space-y-3">
        {items?.map((rec) => (
          <li key={rec._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bone/10 bg-ink-2/60 p-4">
            <div className="min-w-0">
              <p className="truncate text-bone">{String(rec[cfg.primary])}</p>
              {cfg.secondary && <p className="truncate text-sm text-mist">{String(rec[cfg.secondary] ?? '')}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Badge value={rec.published ? 'active' : 'pending'} /><span className="sr-only">{rec.published ? 'Published' : 'Draft'}</span>
              <Button variant="ghost" small onClick={() => open(rec)}>Edit</Button>
              <Button variant="danger" small onClick={() => remove(rec)}>Delete</Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
