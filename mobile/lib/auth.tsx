import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError, deviceName, setToken, setUnauthorizedHandler } from './api';
import { ROLE_SLUGS } from '@/constants/theme';

export interface AuthUser {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  is_active: boolean;
  role: { id: number; name: string; slug: string; scope_level: number } | null;
  member_id: number | null;
  member_code?: string | null;
  permissions?: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (permission: string | string[]) => boolean;
  hasRole: (...slugs: string[]) => boolean;
  postLoginPath: (user: AuthUser) => string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function postLoginPath(user: AuthUser): string {
  const slug = user.role?.slug;
  if (slug === ROLE_SLUGS.agentVerification) return '/(agent)/(tabs)';
  if (slug === ROLE_SLUGS.membre) return '/(membre)';
  return '/(auth)/portail-web';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await api.get<{ user: AuthUser }>('/auth/me');
      setUser(response.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    void refresh();
    return () => setUnauthorizedHandler(null);
  }, [refresh]);

  const login = useCallback(async (loginValue: string, password: string) => {
    const response = await api.public.post<{ token: string; user: AuthUser }>('/auth/login', {
      login: loginValue,
      password,
      device_name: deviceName(),
    });
    await setToken(response.token);
    const me = await api.get<{ user: AuthUser }>('/auth/me');
    setUser(me.user);
    setLoading(false);
    return me.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      if (!(error instanceof ApiError)) {
        /* ignore */
      }
    }
    await setToken(null);
    setUser(null);
  }, []);

  const can = useCallback(
    (permission: string | string[]) => {
      const granted = user?.permissions ?? [];
      const required = Array.isArray(permission) ? permission : [permission];
      return required.some((slug) => granted.includes(slug));
    },
    [user],
  );

  const hasRole = useCallback(
    (...slugs: string[]) => (user?.role ? slugs.includes(user.role.slug) : false),
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refresh,
      can,
      hasRole,
      postLoginPath,
    }),
    [user, loading, login, logout, refresh, can, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  return ctx;
}
