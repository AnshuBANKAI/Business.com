import { useEffect } from 'react';

export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
export const toInputDate = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const fmtSize = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
export const label = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** Only follow same-site relative paths after login (blocks open redirects like //evil.com). */
export const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') && !n.includes('\\') ? n : null);

export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [title, description]);
}

export const money = (n: number, currency = 'INR') =>
  new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency }).format(n || 0);
export const partyName = (c: { name: string; company?: string } | string) => (typeof c === 'string' ? '' : `${c.name}${c.company ? ` · ${c.company}` : ''}`);
export const LEGAL_UPDATED = '6 November 2026';
