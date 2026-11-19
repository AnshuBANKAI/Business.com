import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { label } from '../lib/util';

const field = 'w-full rounded-lg border border-bone/15 bg-ink-2 px-3.5 py-2.5 text-sm text-bone placeholder:text-smoke outline-none transition focus:border-crimson-2 focus:ring-2 focus:ring-crimson-2/30 disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>((p, ref) => <input ref={ref} {...p} className={`${field} ${p.className ?? ''}`} />);
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>((p, ref) => <textarea ref={ref} rows={4} {...p} className={`${field} ${p.className ?? ''}`} />);
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>((p, ref) => <select ref={ref} {...p} className={`${field} ${p.className ?? ''}`} />);
Input.displayName = 'Input';
Textarea.displayName = 'Textarea';
Select.displayName = 'Select';

export function Field({ label: text, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-mist">{text}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-smoke">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-xs text-crimson-2">{error}</span>}
    </label>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'accent'; small?: boolean };
export function Button({ variant = 'primary', small, className = '', ...rest }: BtnProps) {
  const v = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    accent: 'bg-crimson text-white hover:bg-crimson-2',
    danger: 'border border-crimson/50 text-crimson-2 hover:bg-crimson/10',
  }[variant];
  return <button type="button" {...rest} className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${small ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm'} ${v} ${className}`} />;
}

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-bone/10 bg-ink-2/60 p-5 ${className}`}>{children}</div>
);

const tone: Record<string, string> = {
  new: 'bg-crimson/20 text-crimson-2', contacted: 'bg-ai-2/25 text-bone', proposal: 'bg-kin/20 text-kin-2', won: 'bg-emerald-600/20 text-emerald-500', lost: 'bg-bone/10 text-smoke',
  planning: 'bg-bone/10 text-mist', in_progress: 'bg-ai-2/25 text-bone', review: 'bg-kin/20 text-kin-2', completed: 'bg-emerald-600/20 text-emerald-500', on_hold: 'bg-bone/10 text-smoke',
  pending: 'bg-bone/10 text-smoke', delivered: 'bg-kin/20 text-kin-2', approved: 'bg-emerald-600/20 text-emerald-500',
  draft: 'bg-bone/10 text-smoke', sent: 'bg-kin/20 text-kin-2', paid: 'bg-emerald-600/20 text-emerald-500', void: 'bg-bone/10 text-smoke', accepted: 'bg-emerald-600/20 text-emerald-500', declined: 'bg-bone/10 text-smoke', overdue: 'bg-crimson/20 text-crimson-2',
  active: 'bg-emerald-600/20 text-emerald-500', invited: 'bg-kin/20 text-kin-2', 'invite expired': 'bg-crimson/20 text-crimson-2',
};
export const Badge = ({ value }: { value: string }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone[value] ?? 'bg-bone/10 text-mist'}`}>{label(value)}</span>
);

export const Note = ({ kind = 'error', children }: { kind?: 'error' | 'ok'; children: ReactNode }) => (
  <p role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg px-3.5 py-2.5 text-sm ${kind === 'error' ? 'bg-crimson/15 text-crimson-2' : 'bg-emerald-600/15 text-emerald-500'}`}>{children}</p>
);

export const Spinner = ({ text = 'Loading…' }: { text?: string }) => <p className="py-10 text-center text-sm text-mist">{text}</p>;

export const Progress = ({ value }: { value: number }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-bone/10" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
    <div className="h-full rounded-full bg-crimson-2 transition-all" style={{ width: `${value}%` }} />
  </div>
);
