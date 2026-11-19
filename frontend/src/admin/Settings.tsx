import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, errMsg } from '../lib/api';
import type { AdminSettings } from '../lib/types';
import { usePageMeta } from '../lib/util';
import { Button, Card, Field, Input, Note, Select, Spinner, Textarea } from '../ui/kit';
import AccountForm from '../ui/AccountForm';
import TwoFactorPanel from '../ui/TwoFactor';

type K = keyof AdminSettings;
type Def = [K, string, 'text' | 'area' | 'lines' | 'bool', string?];
const SECTIONS: { title: string; blurb?: string; fields: Def[] }[] = [
  { title: 'Home page', fields: [['headline', 'Headline', 'text'], ['subheadline', 'Sub-headline', 'area'], ['availability', 'Availability badge', 'text', 'e.g. Taking on new projects. Clear it to hide.'], ['about', 'About (home page + About page)', 'area'], ['commitments', 'Your promises to clients (shown under the headline)', 'lines', 'One per line, up to 6. Only promise what you will keep.']] },
  { title: 'Contact & response', fields: [['email', 'Public contact email', 'text'], ['whatsapp', 'WhatsApp number', 'text', 'Digits only with country code, e.g. 919876543210. Adds a WhatsApp link.'], ['bookingUrl', 'Booking link (Cal.com / Calendly)', 'text', 'Adds a "Book a call" button'], ['responseTime', 'Reply time you promise', 'text', 'e.g. 1–2 working days'], ['workingHours', 'Working hours / time zone', 'text', 'e.g. Mon–Sat, 10:00–19:00 IST'], ['linkedin', 'LinkedIn URL', 'text'], ['github', 'GitHub URL', 'text'], ['location', 'Location', 'text']] },
  { title: 'Business details (shown on the site footer and invoices)', blurb: 'Used on invoices and legal pages. Make sure these match your registration and what your accountant advises.', fields: [['brandName', 'Brand / display name', 'text'], ['legalName', 'Legal / proprietor name', 'text', 'As it should appear on invoices'], ['address', 'Business address', 'area'], ['gstin', 'GSTIN (if registered)', 'text', 'Shown publicly in the footer'], ['pan', 'PAN', 'text', 'Private. Appears only on invoices you issue.'], ['lutNumber', 'LUT ARN (for export invoices)', 'text', 'Private. Appears only on export invoices.'], ['sacCode', 'Default SAC code', 'text', '998314 is the usual code for software design & development. Confirm with your accountant.'], ['bankDetails', 'Bank / payment details for invoices', 'area', 'Private. Copied onto each new invoice. Never shown on the public site.']] },
  { title: 'Automatic reminders', blurb: 'Once a day the server emails clients about invoices that are due or overdue and milestones waiting for approval, and emails you a summary of leads and proposals that need a reply. Each reminder is sent only once.', fields: [['remindersEnabled', 'Send automatic reminders', 'bool', 'Turn off to pause every automatic email']] },
  { title: 'Privacy contact (required by India\u2019s DPDP rules)', fields: [['grievanceName', 'Contact person for privacy requests', 'text'], ['grievanceEmail', 'Privacy / grievance email', 'text', 'Published in the Privacy Policy']] },
];

export default function Settings() {
  usePageMeta('Site settings — Admin');
  const [s, setS] = useState<AdminSettings | null>(null);
  const [lines, setLines] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get<AdminSettings>('/api/admin/settings').then((d) => { setS(d); setLines((d.commitments ?? []).join('\n')); }).catch((e) => setMsg({ ok: false, text: errMsg(e) })); }, []);
  if (!s) return msg ? <Note>{msg.text}</Note> : <Spinner />;

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null); setFieldErr({});
    try {
      const saved = await api.put<AdminSettings>('/api/admin/settings', { ...s, commitments: lines.split('\n').map((x) => x.trim()).filter(Boolean) });
      setS(saved); setLines((saved.commitments ?? []).join('\n'));
      setMsg({ ok: true, text: 'Saved. The public site updates within about 30 seconds.' });
    } catch (e2) { setMsg({ ok: false, text: errMsg(e2) }); if (e2 instanceof ApiError && e2.fields) setFieldErr(e2.fields); } finally { setBusy(false); }
  }

  return (
    <>
      <h1 className="font-serif text-3xl text-bone">Site settings</h1>
      <form onSubmit={save} className="mt-6 max-w-3xl space-y-6">
        {SECTIONS.map((sec) => (
          <Card key={sec.title}>
            <h2 className="font-serif text-xl text-bone">{sec.title}</h2>
            {sec.blurb && <p className="mt-1 text-sm text-mist">{sec.blurb}</p>}
            <div className="mt-4 space-y-4">
              {sec.fields.map(([k, text, kind, hint]) => (
                <Field key={k} label={text} hint={hint} error={fieldErr[k]}>
                  {kind === 'bool' ? <Select value={s[k] === false ? 'no' : 'yes'} onChange={(e) => setS({ ...s, [k]: e.target.value === 'yes' })}><option value="yes">Yes</option><option value="no">No</option></Select>
                    : kind === 'lines' ? <Textarea rows={4} value={lines} onChange={(e) => setLines(e.target.value)} />
                    : kind === 'area' ? <Textarea rows={k === 'about' ? 7 : 3} value={String(s[k] ?? '')} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
                    : <Input value={String(s[k] ?? '')} onChange={(e) => setS({ ...s, [k]: e.target.value })} />}
                </Field>
              ))}
            </div>
          </Card>
        ))}
        {msg && <Note kind={msg.ok ? 'ok' : 'error'}>{msg.text}</Note>}
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Button>
      </form>
    </>
  );
}

export function AdminAccount() {
  usePageMeta('Account — Admin');
  return <><h1 className="mb-6 font-serif text-3xl text-bone">Account</h1><div className="space-y-6"><TwoFactorPanel /><AccountForm /></div></>;
}
