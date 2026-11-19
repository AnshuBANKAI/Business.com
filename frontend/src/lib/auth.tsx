import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from './api';
import type { Role, User } from './types';

type AuthCtx = {
  user: User | null;
  loading: boolean;
  /** Returns the user, or a challenge if this account needs a second step. */
  signIn: (email: string, password: string) => Promise<{ user: User } | { needs2fa: true; challenge: string }>;
  completeTwoFactor: (challenge: string, code: string) => Promise<User>;
  refresh: () => Promise<void>;
  acceptInvite: (token: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
};
const Ctx = createContext<AuthCtx | null>(null);

export const homeFor = (role: Role) => (role === 'admin' ? '/admin' : '/portal');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ user: User | null }>('/api/auth/me').then((r) => setUser(r.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const r = await api.post<{ user?: User; needs2fa?: boolean; challenge?: string }>('/api/auth/login', { email, password });
    if (r.needs2fa && r.challenge) return { needs2fa: true as const, challenge: r.challenge };
    setUser(r.user!);
    return { user: r.user! };
  }, []);
  const completeTwoFactor = useCallback(async (challenge: string, code: string) => {
    const r = await api.post<{ user: User }>('/api/auth/login/2fa', { challenge, code });
    setUser(r.user);
    return r.user;
  }, []);
  const refresh = useCallback(async () => {
    const r = await api.get<{ user: User | null }>('/api/auth/me').catch(() => ({ user: null }));
    setUser(r.user);
  }, []);
  const acceptInvite = useCallback(async (token: string, password: string) => {
    const r = await api.post<{ user: User }>('/api/auth/accept-invite', { token, password });
    setUser(r.user);
    return r.user;
  }, []);
  const signOut = useCallback(async () => {
    await api.post('/api/auth/logout').catch(() => undefined);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, completeTwoFactor, refresh, acceptInvite, signOut }), [user, loading, signIn, completeTwoFactor, refresh, acceptInvite, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside <AuthProvider>');
  return c;
}

/** UI guard only. The real enforcement is on the server: every /api/admin and /api/portal route checks the session and role. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center text-mist">Loading…</div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}
