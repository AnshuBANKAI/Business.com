import { useState, type FormEvent } from 'react';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, Field, Input, Note } from './kit';

export function ProfileForm() {
  const { user, refresh } = useAuth();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setMsg(null);
    try {
      await api.patch('/api/auth/profile', { name: fd.get('name'), company: fd.get('company'), phone: fd.get('phone') });
      await refresh();
      setMsg({ ok: true, text: 'Details saved.' });
    } catch (err) {
      setMsg({ ok: false, text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="max-w-md">
      <h2 className="font-serif text-xl text-bone">Your details</h2>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <Field label="Name"><Input name="name" required maxLength={120} defaultValue={user?.name} /></Field>
        <Field label="Company"><Input name="company" maxLength={160} defaultValue={user?.company} /></Field>
        <Field label="Phone"><Input name="phone" type="tel" maxLength={30} defaultValue={user?.phone} placeholder="+91 98765 43210" /></Field>
        <Field label="Email" hint="To change your email, ask me."><Input value={user?.email ?? ''} readOnly /></Field>
        {msg && <Note>{msg.text}</Note>}
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save details'}</Button>
      </form>
    </Card>
  );
}

export default function AccountForm() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (fd.get('next') !== fd.get('confirm')) return setMsg({ ok: false, text: 'The new passwords don\u2019t match.' });
    setBusy(true);
    setMsg(null);
    try {
      await api.post('/api/auth/change-password', { current: fd.get('current'), next: fd.get('next') });
      form.reset();
      setMsg({ ok: true, text: 'Password changed. Other devices have been signed out.' });
    } catch (err) {
      setMsg({ ok: false, text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-md">
      <h2 className="font-serif text-xl text-bone">Change password</h2>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <Field label="Current password"><Input name="current" type="password" required autoComplete="current-password" /></Field>
        <Field label="New password" hint="At least 10 characters."><Input name="next" type="password" required minLength={10} autoComplete="new-password" /></Field>
        <Field label="Confirm new password"><Input name="confirm" type="password" required minLength={10} autoComplete="new-password" /></Field>
        {msg && <Note kind={msg.ok ? 'ok' : 'error'}>{msg.text}</Note>}
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</Button>
      </form>
    </Card>
  );
}
