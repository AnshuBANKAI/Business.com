import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, homeFor } from '../lib/auth';
import { api, errMsg } from '../lib/api';
import { safeNext, usePageMeta } from '../lib/util';
import { Button, Field, Input, Note } from '../ui/kit';

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-serif text-lg text-mist hover:text-bone">← Anshu Sharma</Link>
        <h1 className="mt-6 font-serif text-3xl text-bone">{title}</h1>
        <p className="mb-6 mt-1.5 text-sm text-mist">{sub}</p>
        {children}
      </div>
    </div>
  );
}

export function Login() {
  usePageMeta('Sign in — Anshu Sharma');
  const { user, loading, signIn, completeTwoFactor } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [challenge, setChallenge] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);

  if (!loading && user) return <Navigate to={homeFor(user.role)} replace />;

  const finish = (u: { role: 'admin' | 'client' }) => {
    const next = safeNext(params.get('next'));
    // Only follow ?next= when it points into the area this role may use
    const ok = next && next.startsWith(u.role === 'admin' ? '/admin' : '/portal');
    nav(ok ? next : homeFor(u.role), { replace: true });
  };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const fd = new FormData(e.currentTarget);
    try {
      if (challenge) {
        finish(await completeTwoFactor(challenge, String(fd.get('code')).trim()));
        return;
      }
      const r = await signIn(String(fd.get('email')), String(fd.get('password')));
      if ('needs2fa' in r) setChallenge(r.challenge);
      else finish(r.user);
    } catch (e2) {
      const msg = errMsg(e2);
      setErr(msg);
      if (challenge && /expired/i.test(msg)) setChallenge(''); // the 5-minute window passed: start over
    } finally {
      setBusy(false);
    }
  }

  if (challenge) {
    return (
      <Shell title="Two-factor check" sub={useRecovery ? 'Enter one of your recovery codes. Each works once.' : 'Open your authenticator app and enter the 6-digit code.'}>
        <form key="two-factor" onSubmit={submit} className="space-y-4">
          <Field label={useRecovery ? 'Recovery code' : '6-digit code'}>
            <Input key={useRecovery ? 'recovery' : 'totp'} name="code" required autoFocus autoComplete="one-time-code" inputMode={useRecovery ? 'text' : 'numeric'} maxLength={useRecovery ? 32 : 6} pattern={useRecovery ? undefined : '[0-9]{6}'} placeholder={useRecovery ? 'xxxxx-xxxxx' : '123456'} />
          </Field>
          {err && <Note>{err}</Note>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Checking…' : 'Verify and sign in'}</Button>
          <p className="flex justify-between text-xs text-smoke">
            <button type="button" className="underline" onClick={() => { setUseRecovery(!useRecovery); setErr(''); }}>{useRecovery ? 'Use my authenticator app' : 'Use a recovery code'}</button>
            <button type="button" className="underline" onClick={() => { setChallenge(''); setErr(''); setUseRecovery(false); }}>Start over</button>
          </p>
        </form>
      </Shell>
    );
  }

  return (
    <Shell title="Sign in" sub="Sign in to your account.">
      <form key="password" onSubmit={submit} className="space-y-4">
        <Field label="Email"><Input name="email" type="email" required autoComplete="username" autoFocus /></Field>
        <Field label="Password"><Input name="password" type="password" required autoComplete="current-password" /></Field>
        {err && <Note>{err}</Note>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Button>
        <p className="text-center text-xs text-smoke">Forgot your password? Ask me for a fresh invite link.</p>
      </form>
    </Shell>
  );
}

export function AcceptInvite() {
  usePageMeta('Set your password — Anshu Sharma');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { acceptInvite } = useAuth();
  const nav = useNavigate();
  const [who, setWho] = useState<{ name: string; email: string } | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<{ name: string; email: string }>(`/api/auth/invite/${encodeURIComponent(token)}`).then(setWho).catch(() => setInvalid(true));
  }, [token]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pw = String(fd.get('password'));
    if (pw !== String(fd.get('confirm'))) return setErr('The two passwords don\u2019t match.');
    setBusy(true);
    setErr('');
    try {
      const u = await acceptInvite(token, pw);
      nav(homeFor(u.role), { replace: true });
    } catch (e2) {
      setErr(errMsg(e2));
      setBusy(false);
    }
  }

  if (invalid) return <Shell title="Link expired" sub="This invite link is invalid, expired or already used."><p className="text-sm text-mist">Ask me to send you a fresh one.</p></Shell>;
  if (!who) return <Shell title="One moment…" sub=""><span /></Shell>;
  return (
    <Shell title={`Welcome, ${who.name.split(' ')[0]}`} sub={`Choose a password for ${who.email}.`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password" hint="At least 10 characters. A passphrase works well."><Input name="password" type="password" required minLength={10} autoComplete="new-password" autoFocus /></Field>
        <Field label="Confirm password"><Input name="confirm" type="password" required minLength={10} autoComplete="new-password" /></Field>
        {err && <Note>{err}</Note>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Saving…' : 'Set password & continue'}</Button>
      </form>
    </Shell>
  );
}
