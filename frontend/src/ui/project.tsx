import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api, errMsg } from '../lib/api';
import type { FileItem, Msg } from '../lib/types';
import { fmtDateTime, fmtSize } from '../lib/util';
import { Button, Note, Spinner, Textarea } from './kit';

/** Message thread. `base` is /api/portal/projects/:id or /api/admin/client-projects/:id */
export function MessageThread({ base, me }: { base: string; me: 'admin' | 'client' }) {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const load = useCallback(() => api.get<Msg[]>(`${base}/messages`).then(setMsgs).catch((e) => setErr(errMsg(e))), [base]);
  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // light polling so new replies appear without a refresh
    return () => clearInterval(t);
  }, [load]);
  // Scroll only when a message arrives after the first load, so opening a project doesn't jump the page down.
  const seen = useRef<number | null>(null);
  useEffect(() => {
    const n = msgs?.length;
    if (n === undefined) return;
    if (seen.current !== null && n > seen.current) end.current?.scrollIntoView({ block: 'nearest' });
    seen.current = n;
  }, [msgs?.length]);

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = String(new FormData(form).get('body') ?? '').trim();
    if (!body) return;
    setBusy(true);
    setErr('');
    try {
      await api.post(`${base}/messages`, { body });
      form.reset();
      await load();
    } catch (e2) {
      setErr(errMsg(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="max-h-96 space-y-3 overflow-y-auto rounded-xl border border-bone/10 bg-ink p-4" aria-live="polite">
        {!msgs && <Spinner />}
        {msgs?.length === 0 && <p className="py-6 text-center text-sm text-smoke">No messages yet. Say hello 👋</p>}
        {msgs?.map((m) => (
          <div key={m._id} className={`flex ${m.senderRole === me ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${m.senderRole === me ? 'bg-crimson/20 text-bone' : 'bg-bone/10 text-bone'}`}>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className="mt-1 text-[11px] text-smoke">{m.senderName} · {fmtDateTime(m.createdAt)}</p>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <Textarea name="body" rows={2} required maxLength={4000} placeholder="Write a message…" aria-label="Message" className="flex-1" />
        <Button type="submit" disabled={busy} className="self-end">{busy ? '…' : 'Send'}</Button>
      </form>
      {err && <div className="mt-2"><Note>{err}</Note></div>}
    </div>
  );
}

export function FilePanel({ base, files, onChange, canDelete }: { base: string; files: FileItem[]; onChange: () => void; canDelete?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);

  async function upload(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    setErr('');
    try {
      await api.upload(`${base}/files`, 'file', f);
      onChange();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }
  async function remove(id: string) {
    if (!confirm('Delete this file permanently?')) return;
    try {
      await api.del(`${base}/files/${id}`);
      onChange();
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  return (
    <div>
      {files.length === 0 ? <p className="text-sm text-smoke">No files shared yet.</p> : (
        <ul className="divide-y divide-bone/10 rounded-xl border border-bone/10">
          {files.map((f) => (
            <li key={f._id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <a href={`${base}/files/${f._id}`} className="block truncate text-bone underline-offset-2 hover:underline">{f.name}</a>
                <p className="text-xs text-smoke">{fmtSize(f.size)} · from {f.uploadedBy === 'admin' ? 'Anshu' : 'client'} · {fmtDateTime(f.createdAt)}</p>
              </div>
              {canDelete && <Button variant="danger" small onClick={() => remove(f._id)}>Delete</Button>}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center gap-3">
        <input ref={input} type="file" hidden onChange={(e) => upload(e.target.files?.[0])} aria-label="Choose a file to upload" />
        <Button variant="ghost" small disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Uploading…' : 'Upload a file'}</Button>
        <span className="text-xs text-smoke">PDF, images, Office files, ZIP · up to 10 MB</span>
      </div>
      {err && <div className="mt-2"><Note>{err}</Note></div>}
    </div>
  );
}
