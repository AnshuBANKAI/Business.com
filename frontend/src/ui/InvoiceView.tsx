import type { Invoice } from '../lib/types';
import { fmtDate, money } from '../lib/util';

type Supplier = NonNullable<Invoice['supplier']>;

const TITLE = { none: 'Invoice', export_lut: 'Tax Invoice — Export of Services', gst_intra: 'Tax Invoice', gst_inter: 'Tax Invoice' } as const;

/**
 * A paper-style invoice. Colours are fixed (not themed) so it always prints black-on-white,
 * and the page's `.no-print` elements are hidden by the print stylesheet.
 */
export default function InvoiceView({ invoice: i, supplierFallback }: { invoice: Invoice; supplierFallback?: Partial<Supplier> }) {
  const sup: Partial<Supplier> = i.supplier ?? supplierFallback ?? {};
  const m = (n: number) => money(n, i.currency);
  const overdue = i.status === 'sent' && new Date(i.dueDate) < new Date();
  return (
    <div className="invoice-sheet relative mx-auto max-w-3xl rounded-lg bg-white p-8 text-[13px] leading-relaxed text-neutral-800 shadow-sm sm:p-10" style={{ colorScheme: 'light' }}>
      {(i.status === 'paid' || i.status === 'void') && (
        <p className={`absolute right-8 top-8 rotate-[-8deg] rounded border-2 px-3 py-1 text-lg font-bold uppercase tracking-widest ${i.status === 'paid' ? 'border-emerald-600 text-emerald-600' : 'border-neutral-500 text-neutral-500'}`}>
          {i.status === 'paid' ? `Paid${i.paidAt ? ` · ${fmtDate(i.paidAt)}` : ''}` : 'Void'}
        </p>
      )}
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-neutral-200 pb-6">
        <div>
          <h2 className="font-serif text-2xl text-neutral-900">{TITLE[i.taxMode]}</h2>
          <p className="mt-1 text-neutral-500">{i.number ? `No. ${i.number}` : 'Draft — number assigned when sent'}</p>
        </div>
        <dl className="text-right">
          <div><dt className="inline text-neutral-500">Issue date: </dt><dd className="inline">{fmtDate(i.issueDate)}</dd></div>
          <div><dt className="inline text-neutral-500">Due date: </dt><dd className={`inline ${overdue ? 'font-semibold text-red-600' : ''}`}>{fmtDate(i.dueDate)}{overdue ? ' (overdue)' : ''}</dd></div>
        </dl>
      </header>

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">From</p>
          <p className="mt-1 font-semibold text-neutral-900">{sup.legalName || '—'}</p>
          <p className="whitespace-pre-line">{sup.address}</p>
          {sup.pan ? <p>PAN: {sup.pan}</p> : null}
          {sup.gstin ? <p>GSTIN: {sup.gstin}</p> : null}
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Bill to</p>
          <p className="mt-1 font-semibold text-neutral-900">{i.billTo.company || i.billTo.name}</p>
          {i.billTo.company && i.billTo.name ? <p>{i.billTo.name}</p> : null}
          <p className="whitespace-pre-line">{i.billTo.address}</p>
          {i.billTo.country ? <p>{i.billTo.country}</p> : null}
          {i.billTo.gstin ? <p>GSTIN: {i.billTo.gstin}</p> : null}
        </div>
      </section>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="border-b border-neutral-300 text-[11px] uppercase tracking-wider text-neutral-500">
              <th className="py-2 pr-3 font-semibold">Description</th><th className="py-2 pr-3 font-semibold">SAC</th>
              <th className="py-2 pr-3 text-right font-semibold">Qty</th><th className="py-2 pr-3 text-right font-semibold">Rate</th><th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {i.items.map((it, n) => (
              <tr key={n} className="border-b border-neutral-100 align-top">
                <td className="py-2 pr-3">{it.description}</td><td className="py-2 pr-3">{it.sac}</td>
                <td className="py-2 pr-3 text-right">{it.qty}</td><td className="py-2 pr-3 text-right">{m(it.rate)}</td>
                <td className="py-2 text-right">{m(Math.round(it.qty * it.rate * 100) / 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto mt-5 w-full max-w-xs space-y-1">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{m(i.subtotal)}</dd></div>
        {i.taxMode === 'gst_intra' && <><div className="flex justify-between"><dt>CGST @ {i.gstRate / 2}%</dt><dd>{m(i.cgst)}</dd></div><div className="flex justify-between"><dt>SGST @ {i.gstRate / 2}%</dt><dd>{m(i.sgst)}</dd></div></>}
        {i.taxMode === 'gst_inter' && <div className="flex justify-between"><dt>IGST @ {i.gstRate}%</dt><dd>{m(i.igst)}</dd></div>}
        <div className="flex justify-between border-t border-neutral-300 pt-2 text-base font-semibold text-neutral-900"><dt>Total ({i.currency})</dt><dd>{m(i.total)}</dd></div>
      </dl>

      <section className="mt-8 space-y-2 border-t border-neutral-200 pt-5 text-neutral-700">
        {i.taxMode === 'export_lut' && (
          <p><strong>Supply meant for export of services under LUT without payment of IGST.</strong>{sup.lutNumber ? ` LUT ARN: ${sup.lutNumber}.` : ''} Place of supply: outside India.</p>
        )}
        {i.taxMode === 'none' && <p>The supplier is not registered under GST; no GST has been charged.</p>}
        {i.paymentInstructions && <p><strong>Payment details:</strong><br /><span className="whitespace-pre-line">{i.paymentInstructions}</span></p>}
        {i.paymentLink && i.status === 'sent' && <p className="no-print"><a className="inline-block rounded bg-neutral-900 px-4 py-2 text-white" href={i.paymentLink} target="_blank" rel="noopener noreferrer">Pay online →</a></p>}
        {i.paymentRef ? <p>Payment reference: {i.paymentRef}</p> : null}
        {i.notes && <p><strong>Notes:</strong> <span className="whitespace-pre-line">{i.notes}</span></p>}
      </section>
      <p className="mt-6 text-center text-[11px] text-neutral-400">This is a computer-generated invoice.</p>
    </div>
  );
}
