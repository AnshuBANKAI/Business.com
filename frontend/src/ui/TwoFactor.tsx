import { useState, type FormEvent } from 'react';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, Field, Input, Note } from './kit';

type Setup = { secret: string; otpauthUri: string; qr: string };
type Mode = 'idle' | 'password' | 'scan' | 'codes' | 'disable' | 'regen';

function Codes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = codes.join('\n');
  const download = () => {
    const url = URL.createObjectURL(new Blob([`Recovery codes for ${window.location.host}\nEach code works once.\n\n${text}\n`], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'recovery-codes.txt'; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-4">
      <Note>Save these recovery codes now. They are shown only once. If you lose your phone, each code lets you sign in a single time.</Note>
      <ul className="grid grid-cols-2 gap-2 rounded-lg border border-bone/15 bg-ink p-4 font-mono text-sm text-bone">{codes.map((c) => <li key={c}>{c}</li>)}</ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" small onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* ignore */ } }}>{copied ? 'Copied ✓' : 'Copy'}</Button>
        <Button variant="ghost" small onClick={download}>Download .txt</Button>
      </div>
      <label className="flex items-center gap-2 text-sm text-mist"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="h-4 w-4" /> I&rsquo;ve stored them somewhere safe</label>
      <Button disabled={!saved} onClick={onDone}>Done</Button>
    </div>
  );
}

export default function TwoFactorPanel() {
  const { user, refresh } = useAuth();
  const enabled = Boolean(user?.twoFactorEnabled);
  const [mode, setMode] = useState<Mode>('idle');
  const [setup, setSetup] = useState<Setup | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setMode('idle'); setSetup(null); setCodes([]); setErr(''); };
  async function run(fn: () => Promise<void>) {
    setBusy(true); setErr('');
    try { await fn(); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  }

  const start = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const password = String(new FormData(e.currentTarget).get('password')); return run(async () => { setSetup(await api.post<Setup>('/api/auth/2fa/setup', { password })); setMode('scan'); }); };
  const enable = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const code = String(new FormData(e.currentTarget).get('code')).trim(); return run(async () => { const r = await api.post<{ recoveryCodes: string[] }>('/api/auth/2fa/enable', { code }); setCodes(r.recoveryCodes); setSetup(null); setMode('codes'); await refresh(); }); };
  const confirm = (path: 'disable' | 'recovery-codes') => (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    return run(async () => {
      const r = await api.post<{ recoveryCodes?: string[] }>(`/api/auth/2fa/${path}`, { password: String(fd.get('password')), code: String(fd.get('code')).trim() });
      if (path === 'disable') { await refresh(); reset(); } else { setCodes(r.recoveryCodes ?? []); setMode('codes'); }
    });
  };

  return (
    <Card className="max-w-md">
      <div className="flex items-center justify-between gap-3"><h2 className="font-serif text-xl text-bone">Two-factor sign-in</h2><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${enabled ? 'bg-emerald-600/20 text-emerald-500' : 'bg-bone/10 text-smoke'}`}>{enabled ? 'On' : 'Off'}</span></div>
      <p className="mt-2 text-sm text-mist">Adds a 6-digit code from an authenticator app (Google Authenticator, Authy, 1Password…) to every sign-in, so a stolen password alone isn&rsquo;t enough.</p>
      {err && <div className="mt-4"><Note>{err}</Note></div>}

      <div className="mt-5">
        {mode === 'idle' && !enabled && <Button onClick={() => setMode('password')}>Turn on</Button>}
        {mode === 'idle' && enabled && <div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => setMode('regen')}>New recovery codes</Button><Button variant="danger" onClick={() => setMode('disable')}>Turn off</Button></div>}

        {mode === 'password' && (
          <form key="start" onSubmit={start} className="space-y-4">
            <Field label="Confirm your password to begin"><Input name="password" type="password" required autoComplete="current-password" autoFocus /></Field>
            <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? 'Starting…' : 'Continue'}</Button><Button variant="ghost" onClick={reset}>Cancel</Button></div>
          </form>
        )}

        {mode === 'scan' && setup && (
          <form key="enable" onSubmit={enable} className="space-y-4">
            <p className="text-sm text-bone">1. Scan this code with your authenticator app.</p>
            <img src={setup.qr} alt="QR code to add this account to your authenticator app" width={220} height={220} className="rounded-lg border border-bone/15 bg-white p-1" />
            <p className="text-xs text-mist">Can&rsquo;t scan? Enter this key manually: <code className="break-all rounded bg-bone/10 px-1.5 py-0.5 text-bone">{setup.secret}</code></p>
            <p className="text-sm text-bone">2. Enter the 6-digit code the app shows.</p>
            <Field label="Code"><Input name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" placeholder="123456" /></Field>
            <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? 'Checking…' : 'Turn on'}</Button><Button variant="ghost" onClick={reset}>Cancel</Button></div>
          </form>
        )}

        {mode === 'codes' && <Codes codes={codes} onDone={reset} />}

        {(mode === 'disable' || mode === 'regen') && (
          <form key={mode} onSubmit={confirm(mode === 'disable' ? 'disable' : 'recovery-codes')} className="space-y-4">
            <Field label="Password"><Input name="password" type="password" required autoComplete="current-password" /></Field>
            <Field label="Code from your app (or a recovery code)"><Input name="code" required autoComplete="one-time-code" maxLength={32} /></Field>
            <div className="flex gap-2"><Button type="submit" variant={mode === 'disable' ? 'danger' : 'primary'} disabled={busy}>{busy ? 'Working…' : mode === 'disable' ? 'Turn off two-factor' : 'Generate new codes'}</Button><Button variant="ghost" onClick={reset}>Cancel</Button></div>
          </form>
        )}
      </div>
    </Card>
  );
}
