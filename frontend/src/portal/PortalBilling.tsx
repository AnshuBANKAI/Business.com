import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, errMsg } from '../lib/api';
import type { Invoice, Proposal } from '../lib/types';
import { fmtDate, fmtDateTime, money, usePageMeta } from '../lib/util';
import { Badge, Button, Card, Field, Input, Note, Spinner, Textarea } from '../ui/kit';
import InvoiceView from '../ui/InvoiceView';

const invStatus = (i: Invoice) => (i.status === 'sent' && new Date(i.dueDate) < new Date() ? 'overdue' : i.status);

export function PortalInvoices() {
  usePageMeta('Invoices — Client portal');
  const [items, setItems] = useState<Invoice[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get<Invoice[]>('/api/portal/invoices').then(setItems).catch((e) => setErr(errMsg(e))); }, []);
  return (
    <>
      <h1 className="font-serif text-3xl text-bone">Invoices</h1>
      {err && <div className="mt-4"><Note>{err}</Note></div>}
      {!items && !err && <Spinner />}
      {items?.length === 0 && <p className="mt-8 text-mist">No invoices yet.</p>}
      {items && items.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-bone/10">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-ink-2/60 text-xs uppercase tracking-wider text-mist"><tr><th className="p-3">Invoice</th><th className="p-3">Issued</th><th className="p-3">Due</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th></tr></thead>
            <tbody className="divide-y divide-bone/10">
              {items.map((i) => (
                <tr key={i._id}>
                  <td className="p-3"><Link to={`/portal/invoices/${i._id}`} className="text-bone underline-offset-2 hover:underline">{i.number}</Link></td>
                  <td className="p-3 text-mist">{fmtDate(i.issueDate)}</td><td className="p-3 text-mist">{fmtDate(i.dueDate)}</td>
                  <td className="p-3 text-right text-bone">{money(i.total, i.currency)}</td><td className="p-3"><Badge value={invStatus(i)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function PortalInvoice() {
  const { id = '' } = useParams();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [err, setErr] = useState('');
  usePageMeta(inv ? `Invoice ${inv.number} — Client portal` : 'Invoice — Client portal');
  useEffect(() => { api.get<Invoice>(`/api/portal/invoices/${id}`).then(setInv).catch((e) => setErr(errMsg(e))); }, [id]);
  if (err) return <div><Note>{err}</Note><Link to="/portal/invoices" className="mt-4 inline-block text-mist underline">Back to invoices</Link></div>;
  if (!inv) return <Spinner />;
  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link to="/portal/invoices" className="text-sm text-mist hover:text-bone">← All invoices</Link>
        <Button variant="ghost" small onClick={() => window.print()}>Print / save as PDF</Button>
      </div>
      <InvoiceView invoice={inv} />
    </div>
  );
}

export function PortalProposals() {
  usePageMeta('Proposals — Client portal');
  const [items, setItems] = useState<Proposal[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get<Proposal[]>('/api/portal/proposals').then(setItems).catch((e) => setErr(errMsg(e))); }, []);
  return (
    <>
      <h1 className="font-serif text-3xl text-bone">Proposals</h1>
      {err && <div className="mt-4"><Note>{err}</Note></div>}
      {!items && !err && <Spinner />}
      {items?.length === 0 && <p className="mt-8 text-mist">No proposals yet.</p>}
      <ul className="mt-6 space-y-3">
        {items?.map((p) => (
          <li key={p._id}><Link to={`/portal/proposals/${p._id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bone/10 bg-ink-2/60 p-4 transition hover:border-bone/30">
            <div><p className="text-bone">{p.title}</p><p className="text-sm text-mist">{money(p.amount, p.currency)}{p.validUntil ? ` · valid until ${fmtDate(p.validUntil)}` : ''}</p></div><Badge value={p.status} />
          </Link></li>
        ))}
      </ul>
    </>
  );
}

export function PortalProposal() {
  const { id = '' } = useParams();
  const [p, setP] = useState<Proposal | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  usePageMeta(p ? `${p.title} — Client portal` : 'Proposal — Client portal');
  useEffect(() => { api.get<Proposal>(`/api/portal/proposals/${id}`).then(setP).catch((e) => setErr(errMsg(e))); }, [id]);

  async function accept(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true); setErr(''); setFields({});
    try { setP(await api.post<Proposal>(`/api/portal/proposals/${id}/accept`, { name: String(fd.get('name')), agree: fd.get('agree') === 'on' })); }
    catch (e2) { setErr(errMsg(e2)); if (e2 instanceof ApiError && e2.fields) setFields(e2.fields); } finally { setBusy(false); }
  }
  async function decline(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr('');
    try { setP(await api.post<Proposal>(`/api/portal/proposals/${id}/decline`, { reason: String(new FormData(e.currentTarget).get('reason') ?? '') })); setDeclining(false); }
    catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  }

  if (err && !p) return <div><Note>{err}</Note><Link to="/portal/proposals" className="mt-4 inline-block text-mist underline">Back to proposals</Link></div>;
  if (!p) return <Spinner />;
  const expired = p.validUntil ? new Date(p.validUntil) < new Date() : false;
  const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="mt-8"><h2 className="font-serif text-xl text-bone">{title}</h2><div className="mt-2 text-mist">{children}</div></section>;

  return (
    <article className="max-w-3xl">
      <Link to="/portal/proposals" className="no-print text-sm text-mist hover:text-bone">← All proposals</Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><h1 className="font-serif text-3xl text-bone">{p.title}</h1><Badge value={p.status} /></div>
      <p className="mt-2 text-2xl text-bone">{money(p.amount, p.currency)}</p>
      {p.validUntil && <p className="text-sm text-smoke">{expired ? 'Expired' : 'Valid until'} {fmtDate(p.validUntil)}</p>}
      {p.summary && <Sec title="What I&rsquo;ll do"><p className="whitespace-pre-line">{p.summary}</p></Sec>}
      {p.deliverables.length > 0 && <Sec title="Deliverables"><ul className="space-y-1">{p.deliverables.map((d) => <li key={d} className="flex gap-2"><span className="text-crimson-2" aria-hidden>›</span>{d}</li>)}</ul></Sec>}
      {p.timeline && <Sec title="Timeline"><p>{p.timeline}</p></Sec>}
      {p.paymentTerms && <Sec title="Payment schedule"><p className="whitespace-pre-line">{p.paymentTerms}</p></Sec>}
      {p.terms && <Sec title="Terms"><p className="whitespace-pre-line">{p.terms}</p></Sec>}

      {err && <div className="mt-6"><Note>{err}</Note></div>}

      {p.status === 'sent' && !expired && (
        <Card className="no-print mt-10">
          {!declining ? (
            <form onSubmit={accept} className="space-y-4">
              <h2 className="font-serif text-xl text-bone">Accept this proposal</h2>
              <Field label="Type your full name to sign" error={fields.name}><Input name="name" required minLength={2} maxLength={120} autoComplete="name" /></Field>
              <label className="flex items-start gap-2.5 text-sm text-mist"><input type="checkbox" name="agree" required className="mt-1 h-4 w-4 shrink-0" /><span>I have read this proposal and the Terms of Service, and I agree to them on behalf of {'myself or my company'}.</span></label>
              {fields.agree && <p role="alert" className="text-xs text-crimson-2">{fields.agree}</p>}
              <p className="text-xs text-smoke">Your name, email, the time, your IP address and a fingerprint of this exact proposal are recorded as evidence of acceptance.</p>
              <div className="flex gap-3"><Button type="submit" variant="accent" disabled={busy}>{busy ? 'Saving…' : 'Accept proposal'}</Button><Button variant="ghost" onClick={() => setDeclining(true)}>Decline</Button></div>
            </form>
          ) : (
            <form onSubmit={decline} className="space-y-4">
              <h2 className="font-serif text-xl text-bone">Decline this proposal</h2>
              <Field label="Reason (optional)"><Textarea name="reason" rows={3} maxLength={1000} /></Field>
              <div className="flex gap-3"><Button type="submit" variant="danger" disabled={busy}>Decline</Button><Button variant="ghost" onClick={() => setDeclining(false)}>Back</Button></div>
            </form>
          )}
        </Card>
      )}
      {p.status === 'sent' && expired && <div className="mt-8"><Note>This proposal has expired. Message me for an updated one.</Note></div>}
      {p.status === 'accepted' && p.acceptance && <div className="mt-8"><Note kind="ok">Accepted by {p.acceptance.name} on {fmtDateTime(p.acceptance.at)}. Thank you!</Note></div>}
      {p.status === 'declined' && <div className="mt-8"><Note>You declined this proposal on {fmtDate(p.declinedAt)}.</Note></div>}
    </article>
  );
}
