import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, errMsg } from '../lib/api';
import { CURRENCIES, type AdminSettings, type ClientRow, type Invoice, type InvoiceItem, type Proposal, type TaxMode } from '../lib/types';
import { fmtDate, fmtDateTime, money, partyName, usePageMeta } from '../lib/util';
import { Badge, Button, Card, Field, Input, Note, Select, Spinner, Textarea } from '../ui/kit';
import InvoiceView from '../ui/InvoiceView';

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const statusOf = (i: Invoice) => (i.status === 'sent' && new Date(i.dueDate) < new Date() ? 'overdue' : i.status);

const TAX_HINT: Record<TaxMode, string> = {
  export_lut: 'Client outside India, paid in a foreign currency. No GST is charged because it is an export of services under your LUT. Needs your LUT number in Site settings.',
  gst_intra: 'Client in the same state as you. Charges CGST + SGST. Issued in INR. Needs your GSTIN in Site settings.',
  gst_inter: 'Client in a different Indian state. Charges IGST. Issued in INR. Needs your GSTIN in Site settings.',
  none: 'You are not registered for GST, so no tax is charged.',
};

function totalsOf(items: InvoiceItem[], taxMode: TaxMode, rate: number) {
  const subtotal = r2(items.reduce((s, i) => s + r2((Number(i.qty) || 0) * (Number(i.rate) || 0)), 0));
  const cgst = taxMode === 'gst_intra' ? r2((subtotal * rate) / 200) : 0;
  const igst = taxMode === 'gst_inter' ? r2((subtotal * rate) / 100) : 0;
  return { subtotal, cgst, sgst: cgst, igst, total: r2(subtotal + cgst * 2 + igst) };
}

/* ───────────────────────── Invoices ───────────────────────── */
export function InvoiceList() {
  usePageMeta('Invoices — Admin');
  const [items, setItems] = useState<Invoice[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get<Invoice[]>('/api/admin/invoices').then(setItems).catch((e) => setErr(errMsg(e))); }, []);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-serif text-3xl text-bone">Invoices</h1><Link to="/admin/invoices/new" className="btn-primary rounded-lg px-5 py-2.5 text-sm">New invoice</Link></div>
      {err && <div className="mt-4"><Note>{err}</Note></div>}
      {!items && !err && <Spinner />}
      {items?.length === 0 && <p className="mt-8 text-mist">No invoices yet. Add your business details in Site settings first, then create one.</p>}
      {items && items.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-bone/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-ink-2/60 text-xs uppercase tracking-wider text-mist"><tr><th className="p-3">Number</th><th className="p-3">Client</th><th className="p-3">Issued</th><th className="p-3 text-right">Total</th><th className="p-3">Status</th></tr></thead>
            <tbody className="divide-y divide-bone/10">
              {items.map((i) => (
                <tr key={i._id} className="hover:bg-bone/5">
                  <td className="p-3"><Link className="text-bone underline-offset-2 hover:underline" to={`/admin/invoices/${i._id}`}>{i.number ?? 'Draft'}</Link></td>
                  <td className="p-3 text-mist">{partyName(i.client)}</td><td className="p-3 text-mist">{fmtDate(i.issueDate)}</td>
                  <td className="p-3 text-right text-bone">{money(i.total, i.currency)}</td><td className="p-3"><Badge value={statusOf(i)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function InvoiceEdit() {
  const { id = 'new' } = useParams();
  const nav = useNavigate();
  const isNew = id === 'new';
  usePageMeta('Invoice — Admin');
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [saved, setSaved] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    client: '', issueDate: today(), dueDate: plusDays(14), currency: 'USD', taxMode: 'export_lut' as TaxMode, gstRate: 18,
    items: [{ description: '', sac: '998314', qty: 1, rate: 0 }] as InvoiceItem[],
    billTo: { name: '', company: '', address: '', country: '', gstin: '' }, notes: '', paymentLink: '', paymentInstructions: '',
  });

  useEffect(() => {
    api.get<ClientRow[]>('/api/admin/clients').then(setClients).catch(() => undefined);
    api.get<AdminSettings>('/api/admin/settings').then((s) => {
      setSettings(s);
      if (isNew) setF((x) => ({ ...x, paymentInstructions: x.paymentInstructions || s.bankDetails, items: x.items.map((i) => ({ ...i, sac: i.sac || s.sacCode })) }));
    }).catch(() => undefined);
  }, [isNew]);

  useEffect(() => {
    if (isNew) return;
    api.get<Invoice>(`/api/admin/invoices/${id}`).then((inv) => {
      setSaved(inv);
      const client = typeof inv.client === 'string' ? inv.client : inv.client._id;
      setF({ client, issueDate: inv.issueDate.slice(0, 10), dueDate: inv.dueDate.slice(0, 10), currency: inv.currency, taxMode: inv.taxMode, gstRate: inv.gstRate, items: inv.items, billTo: inv.billTo, notes: inv.notes, paymentLink: inv.paymentLink, paymentInstructions: inv.paymentInstructions });
    }).catch((e) => setMsg({ ok: false, text: errMsg(e) })).finally(() => setLoading(false));
  }, [id, isNew]);

  const totals = useMemo(() => totalsOf(f.items, f.taxMode, Number(f.gstRate)), [f.items, f.taxMode, f.gstRate]);
  const setItem = (i: number, v: Partial<InvoiceItem>) => setF((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, ...v } : it)) }));
  const setBill = (v: Partial<typeof f.billTo>) => setF((x) => ({ ...x, billTo: { ...x.billTo, ...v } }));

  function pickClient(cid: string) {
    const c = clients.find((x) => x._id === cid);
    setF((x) => ({ ...x, client: cid, billTo: { ...x.billTo, name: x.billTo.name || c?.name || '', company: x.billTo.company || c?.company || '' } }));
  }
  function pickTax(mode: TaxMode) {
    setF((x) => ({ ...x, taxMode: mode, currency: mode.startsWith('gst_') ? 'INR' : mode === 'export_lut' && x.currency === 'INR' ? 'USD' : x.currency }));
  }

  const payload = () => ({ ...f, gstRate: Number(f.gstRate), items: f.items.map((i) => ({ ...i, qty: Number(i.qty), rate: Number(i.rate) })) });

  async function save(): Promise<Invoice | null> {
    setBusy(true); setMsg(null); setFieldErr({});
    try {
      const inv = isNew || !saved ? await api.post<Invoice>('/api/admin/invoices', payload()) : await api.put<Invoice>(`/api/admin/invoices/${saved._id}`, payload());
      setSaved(inv);
      if (isNew) nav(`/admin/invoices/${inv._id}`, { replace: true });
      else setMsg({ ok: true, text: 'Draft saved.' });
      return inv;
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
      if (e instanceof ApiError && e.fields) setFieldErr(e.fields);
      return null;
    } finally { setBusy(false); }
  }
  async function send() {
    if (!confirm('Send this invoice? It gets its number now and can no longer be edited (you can void it and issue a new one).')) return;
    const inv = await save();
    if (!inv) return;
    setBusy(true);
    try { setSaved(await api.post<Invoice>(`/api/admin/invoices/${inv._id}/send`)); setMsg({ ok: true, text: 'Invoice sent. The client can see it in their portal.' }); } catch (e) { setMsg({ ok: false, text: errMsg(e) }); } finally { setBusy(false); }
  }
  async function act(kind: 'paid' | 'void') {
    if (!saved) return;
    let body: object = {};
    if (kind === 'paid') { const ref = prompt('Payment reference (bank/UTR/transaction ID) — optional'); if (ref === null) return; body = { paymentRef: ref }; }
    else if (!confirm('Void this invoice? The number stays on record and is never reused.')) return;
    try { setSaved(await api.post<Invoice>(`/api/admin/invoices/${saved._id}/${kind}`, body)); setMsg(null); } catch (e) { setMsg({ ok: false, text: errMsg(e) }); }
  }
  async function remove() {
    if (!saved || !confirm('Delete this draft?')) return;
    try { await api.del(`/api/admin/invoices/${saved._id}`); nav('/admin/invoices'); } catch (e) { setMsg({ ok: false, text: errMsg(e) }); }
  }

  if (loading) return <Spinner />;
  const supplier = settings ? { legalName: settings.legalName || settings.brandName, address: settings.address, pan: settings.pan, gstin: settings.gstin, lutNumber: settings.lutNumber, sacCode: settings.sacCode } : undefined;
  const clientRec = clients.find((c) => c._id === f.client);
  const preview: Invoice = { _id: 'preview', status: 'draft', ...payload(), ...totals } as Invoice;

  // Issued invoices are read-only documents with a few actions.
  if (saved && saved.status !== 'draft') {
    return (
      <div className="space-y-6">
        <div className="no-print"><Link to="/admin/invoices" className="text-sm text-mist hover:text-bone">← All invoices</Link>
          <div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="font-serif text-3xl text-bone">Invoice {saved.number}</h1><Badge value={statusOf(saved)} /></div>
          <p className="text-sm text-mist">{partyName(saved.client)}</p></div>
        {msg && <div className="no-print"><Note kind={msg.ok ? 'ok' : 'error'}>{msg.text}</Note></div>}
        <div className="no-print flex flex-wrap gap-2">
          <Button variant="ghost" small onClick={() => window.print()}>Print / save as PDF</Button>
          {saved.status === 'sent' && <><Button small onClick={() => act('paid')}>Mark as paid</Button><Button variant="danger" small onClick={() => act('void')}>Void</Button></>}
        </div>
        <InvoiceView invoice={saved} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div><Link to="/admin/invoices" className="text-sm text-mist hover:text-bone">← All invoices</Link><h1 className="mt-3 font-serif text-3xl text-bone">{isNew ? 'New invoice' : 'Draft invoice'}</h1></div>
      {settings && !(settings.legalName || settings.brandName) || (settings && !settings.address) ? <Note>Add your business name and address in <Link to="/admin/settings" className="underline">Site settings</Link> before you can send invoices.</Note> : null}

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client" error={fieldErr.client}><Select value={f.client} onChange={(e) => pickClient(e.target.value)}><option value="">Choose…</option>{clients.map((c) => <option key={c._id} value={c._id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>)}</Select></Field>
          <Field label="Tax treatment"><Select value={f.taxMode} onChange={(e) => pickTax(e.target.value as TaxMode)}>
            <option value="export_lut">Export of services — 0% under LUT</option><option value="gst_intra">Domestic — CGST + SGST (same state)</option><option value="gst_inter">Domestic — IGST (other state)</option><option value="none">No GST (not registered)</option></Select></Field>
          <p className="text-xs text-mist sm:col-span-2">{TAX_HINT[f.taxMode]} Confirm the right treatment for each client with your accountant.</p>
          <Field label="Issue date" error={fieldErr.issueDate}><Input type="date" value={f.issueDate} onChange={(e) => setF({ ...f, issueDate: e.target.value })} /></Field>
          <Field label="Due date" error={fieldErr.dueDate}><Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
          <Field label="Currency" error={fieldErr.currency}><Select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          {f.taxMode.startsWith('gst_') && <Field label="GST rate (%)"><Input type="number" min={0} max={40} step="0.5" value={f.gstRate} onChange={(e) => setF({ ...f, gstRate: Number(e.target.value) })} /></Field>}
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-xl text-bone">Bill to</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Contact name"><Input value={f.billTo.name} onChange={(e) => setBill({ name: e.target.value })} /></Field>
          <Field label="Company"><Input value={f.billTo.company} onChange={(e) => setBill({ company: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Billing address"><Textarea rows={3} value={f.billTo.address} onChange={(e) => setBill({ address: e.target.value })} /></Field></div>
          <Field label="Country"><Input value={f.billTo.country} onChange={(e) => setBill({ country: e.target.value })} /></Field>
          <Field label="Client GSTIN (Indian clients)"><Input value={f.billTo.gstin} onChange={(e) => setBill({ gstin: e.target.value })} /></Field>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between"><h2 className="font-serif text-xl text-bone">Items</h2><Button variant="ghost" small onClick={() => setF({ ...f, items: [...f.items, { description: '', sac: settings?.sacCode || '998314', qty: 1, rate: 0 }] })}>Add item</Button></div>
        {fieldErr.items && <p role="alert" className="mt-2 text-xs text-crimson-2">{fieldErr.items}</p>}
        <ul className="mt-4 space-y-3">
          {f.items.map((it, i) => (
            <li key={i} className="grid gap-2 rounded-lg border border-bone/10 p-3 sm:grid-cols-12">
              <div className="sm:col-span-5"><Input aria-label="Description" placeholder="Description" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} /></div>
              <div className="sm:col-span-2"><Input aria-label="SAC code" placeholder="SAC" value={it.sac} onChange={(e) => setItem(i, { sac: e.target.value })} /></div>
              <div className="sm:col-span-1"><Input aria-label="Quantity" type="number" min={0} value={it.qty} onChange={(e) => setItem(i, { qty: Number(e.target.value) })} /></div>
              <div className="sm:col-span-3"><Input aria-label="Rate" type="number" min={0} step="0.01" value={it.rate} onChange={(e) => setItem(i, { rate: Number(e.target.value) })} /></div>
              <div className="sm:col-span-1"><Button variant="danger" small aria-label="Remove item" disabled={f.items.length === 1} onClick={() => setF({ ...f, items: f.items.filter((_, j) => j !== i) })}>✕</Button></div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-right text-sm text-mist">Subtotal {money(totals.subtotal, f.currency)} · <strong className="text-bone">Total {money(totals.total, f.currency)}</strong></p>
      </Card>

      <Card>
        <div className="grid gap-4">
          <Field label="Payment details (shown on the invoice)" hint="Defaults to the bank details saved in Site settings"><Textarea rows={3} value={f.paymentInstructions} onChange={(e) => setF({ ...f, paymentInstructions: e.target.value })} /></Field>
          <Field label="Online payment link (optional)" hint="e.g. a Razorpay Payment Link for this amount" error={fieldErr.paymentLink}><Input value={f.paymentLink} onChange={(e) => setF({ ...f, paymentLink: e.target.value })} /></Field>
          <Field label="Notes (optional)"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        </div>
      </Card>

      {msg && <Note kind={msg.ok ? 'ok' : 'error'}>{msg.text}</Note>}
      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={busy || !f.client}>{busy ? 'Saving…' : 'Save draft'}</Button>
        <Button variant="accent" onClick={send} disabled={busy || !f.client}>Send to client</Button>
        {saved && <Button variant="danger" onClick={remove}>Delete draft</Button>}
      </div>

      <section aria-label="Preview"><h2 className="mb-3 font-serif text-xl text-bone">Preview {clientRec ? `for ${clientRec.name}` : ''}</h2><InvoiceView invoice={preview} supplierFallback={supplier} /></section>
    </div>
  );
}

/* ───────────────────────── Proposals ───────────────────────── */
export function ProposalList() {
  usePageMeta('Proposals — Admin');
  const [items, setItems] = useState<Proposal[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get<Proposal[]>('/api/admin/proposals').then(setItems).catch((e) => setErr(errMsg(e))); }, []);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-serif text-3xl text-bone">Proposals</h1><Link to="/admin/proposals/new" className="btn-primary rounded-lg px-5 py-2.5 text-sm">New proposal</Link></div>
      {err && <div className="mt-4"><Note>{err}</Note></div>}
      {!items && !err && <Spinner />}
      {items?.length === 0 && <p className="mt-8 text-mist">No proposals yet. A proposal sets the scope and price; the client can accept it online.</p>}
      <ul className="mt-6 space-y-3">
        {items?.map((p) => (
          <li key={p._id}><Link to={`/admin/proposals/${p._id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bone/10 bg-ink-2/60 p-4 transition hover:border-bone/30">
            <div><p className="text-bone">{p.title}</p><p className="text-sm text-mist">{partyName(p.client)} · {money(p.amount, p.currency)}</p></div><Badge value={p.status} />
          </Link></li>
        ))}
      </ul>
    </>
  );
}

export function ProposalEdit() {
  const { id = 'new' } = useParams();
  const nav = useNavigate();
  const isNew = id === 'new';
  usePageMeta('Proposal — Admin');
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [saved, setSaved] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ client: '', title: '', summary: '', deliverables: '', timeline: '', currency: 'USD', amount: 0, paymentTerms: '', terms: '', validUntil: plusDays(14) });

  useEffect(() => { api.get<ClientRow[]>('/api/admin/clients').then(setClients).catch(() => undefined); }, []);
  useEffect(() => {
    if (isNew) return;
    api.get<Proposal>(`/api/admin/proposals/${id}`).then((p) => {
      setSaved(p);
      setF({ client: typeof p.client === 'string' ? p.client : p.client._id, title: p.title, summary: p.summary, deliverables: p.deliverables.join('\n'), timeline: p.timeline, currency: p.currency, amount: p.amount, paymentTerms: p.paymentTerms, terms: p.terms, validUntil: p.validUntil ? p.validUntil.slice(0, 10) : '' });
    }).catch((e) => setMsg({ ok: false, text: errMsg(e) })).finally(() => setLoading(false));
  }, [id, isNew]);

  const payload = () => ({ ...f, amount: Number(f.amount), deliverables: f.deliverables.split('\n').map((s) => s.trim()).filter(Boolean) });

  async function save(): Promise<Proposal | null> {
    setBusy(true); setMsg(null); setFieldErr({});
    try {
      const p = saved ? await api.put<Proposal>(`/api/admin/proposals/${saved._id}`, payload()) : await api.post<Proposal>('/api/admin/proposals', payload());
      setSaved(p);
      if (isNew) nav(`/admin/proposals/${p._id}`, { replace: true }); else setMsg({ ok: true, text: 'Draft saved.' });
      return p;
    } catch (e) { setMsg({ ok: false, text: errMsg(e) }); if (e instanceof ApiError && e.fields) setFieldErr(e.fields); return null; } finally { setBusy(false); }
  }
  async function send() {
    if (!confirm('Send this proposal? It can no longer be edited once sent.')) return;
    const p = await save();
    if (!p) return;
    try { setSaved(await api.post<Proposal>(`/api/admin/proposals/${p._id}/send`)); setMsg({ ok: true, text: 'Sent. The client can read and accept it in their portal.' }); } catch (e) { setMsg({ ok: false, text: errMsg(e) }); }
  }
  async function remove() {
    if (!saved || !confirm('Delete this proposal?')) return;
    try { await api.del(`/api/admin/proposals/${saved._id}`); nav('/admin/proposals'); } catch (e) { setMsg({ ok: false, text: errMsg(e) }); }
  }
  if (loading) return <Spinner />;

  const locked = saved && saved.status !== 'draft';
  return (
    <div className="max-w-3xl space-y-8">
      <div><Link to="/admin/proposals" className="text-sm text-mist hover:text-bone">← All proposals</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="font-serif text-3xl text-bone">{isNew ? 'New proposal' : f.title || 'Proposal'}</h1>{saved && <Badge value={saved.status} />}</div></div>
      {locked && <Note kind="ok">This proposal has been sent, so it is read-only. To change anything, create a new proposal.</Note>}

      <Card>
        <fieldset disabled={Boolean(locked)} className="grid gap-4 sm:grid-cols-2">
          <Field label="Client" error={fieldErr.client}><Select value={f.client} onChange={(e) => setF({ ...f, client: e.target.value })}><option value="">Choose…</option>{clients.map((c) => <option key={c._id} value={c._id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>)}</Select></Field>
          <Field label="Title" error={fieldErr.title}><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Summary of the work"><Textarea rows={5} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></Field></div>
          <div className="sm:col-span-2"><Field label="Deliverables" hint="One per line"><Textarea rows={4} value={f.deliverables} onChange={(e) => setF({ ...f, deliverables: e.target.value })} /></Field></div>
          <Field label="Timeline"><Input value={f.timeline} placeholder="e.g. 6 weeks from kickoff" onChange={(e) => setF({ ...f, timeline: e.target.value })} /></Field>
          <Field label="Valid until" error={fieldErr.validUntil}><Input type="date" value={f.validUntil} onChange={(e) => setF({ ...f, validUntil: e.target.value })} /></Field>
          <Field label="Currency"><Select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Total price" error={fieldErr.amount}><Input type="number" min={0} step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} /></Field>
          <div className="sm:col-span-2"><Field label="Payment schedule"><Textarea rows={2} value={f.paymentTerms} placeholder="e.g. 40% to start, 30% after milestone 2, 30% on delivery" onChange={(e) => setF({ ...f, paymentTerms: e.target.value })} /></Field></div>
          <div className="sm:col-span-2"><Field label="Terms" hint="Leave blank to use the standard line that points to your Terms of Service"><Textarea rows={3} value={f.terms} onChange={(e) => setF({ ...f, terms: e.target.value })} /></Field></div>
        </fieldset>
      </Card>

      {saved?.status === 'accepted' && saved.acceptance && (
        <Card className="border-emerald-600/40">
          <h2 className="font-serif text-xl text-bone">Acceptance record</h2>
          <dl className="mt-3 space-y-1 text-sm text-mist">
            <div>Accepted by <strong className="text-bone">{saved.acceptance.name}</strong> ({saved.acceptance.email})</div>
            <div>On {fmtDateTime(saved.acceptance.at)} from IP {saved.acceptance.ip}</div>
            <div className="break-all">Content fingerprint (SHA-256): <code className="text-xs">{saved.acceptance.contentHash}</code></div>
          </dl>
          <p className="mt-3 text-xs text-smoke">Keep this record. It shows exactly which version of the proposal and terms was accepted.</p>
        </Card>
      )}
      {saved?.status === 'declined' && <Note>Declined {fmtDate(saved.declinedAt)}{saved.declineReason ? `: ${saved.declineReason}` : ''}</Note>}

      {msg && <Note kind={msg.ok ? 'ok' : 'error'}>{msg.text}</Note>}
      {!locked && <div className="flex flex-wrap gap-3"><Button onClick={save} disabled={busy || !f.client || !f.title}>{busy ? 'Saving…' : 'Save draft'}</Button><Button variant="accent" onClick={send} disabled={busy || !f.client || !f.title}>Send to client</Button>{saved && <Button variant="danger" onClick={remove}>Delete</Button>}</div>}
    </div>
  );
}
