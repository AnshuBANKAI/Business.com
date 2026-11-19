import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, errMsg } from '../lib/api';
import { useSite } from './SiteLayout';
import { Button, Field, Input, Note, Select, Textarea } from '../ui/kit';

const BUDGETS = ['Not sure yet', 'Under $1,000', '$1,000 – $3,000', '$3,000 – $10,000', '$10,000+'];
const TIMELINES = ['Flexible', 'Within 1 month', '1–3 months', '3+ months'];

export default function ContactForm() {
  const { data } = useSite();
  const contact = data?.settings.grievanceEmail || data?.settings.email || '';
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/api/public/leads', { ...Object.fromEntries(fd.entries()), consent: fd.get('consent') === 'on' });
      setDone(true);
    } catch (err) {
      setError(errMsg(err));
      if (err instanceof ApiError && err.fields) setFields(err.fields);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <Note kind="ok">Thanks — your message is in. I&rsquo;ll reply within 1–2 working days, and you&rsquo;ll get a confirmation email shortly.</Note>;
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" error={fields.name}><Input name="name" required autoComplete="name" maxLength={120} /></Field>
        <Field label="Email" error={fields.email}><Input name="email" type="email" required autoComplete="email" maxLength={254} /></Field>
      </div>
      <Field label="Company / project (optional)"><Input name="company" autoComplete="organization" maxLength={160} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Budget"><Select name="budget" defaultValue={BUDGETS[0]}>{BUDGETS.map((b) => <option key={b}>{b}</option>)}</Select></Field>
        <Field label="Timeline"><Select name="timeline" defaultValue={TIMELINES[0]}>{TIMELINES.map((b) => <option key={b}>{b}</option>)}</Select></Field>
      </div>
      <Field label="What are you building?" error={fields.message} hint="A few sentences on the goal, who it's for, and any deadline."><Textarea name="message" required rows={5} maxLength={4000} /></Field>
      {/* Honeypot: hidden from people and assistive tech, bots fill it in */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div>
        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-mist">
          <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-crimson)]" />
          <span>I agree that my details may be stored and used to reply to this enquiry, as described in the <Link to="/privacy" target="_blank" className="text-bone underline">Privacy Policy</Link>. I can withdraw consent or ask for deletion any time{contact ? <> by emailing {contact}</> : null}.</span>
        </label>
        {fields.consent && <span role="alert" className="mt-1 block text-xs text-crimson-2">{fields.consent}</span>}
      </div>
      {error && <Note>{error}</Note>}
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">{busy ? 'Sending…' : 'Send enquiry'}</Button>
    </form>
  );
}
