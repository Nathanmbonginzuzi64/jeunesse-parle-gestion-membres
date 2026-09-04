import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError, deviceName, discoverApiBaseUrl, setToken, setUnauthorizedHandler } from './api';
import { syncBiometricCredentials } from './biometric-auth';
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
  member_status?: string | null;
  member_status_label?: string | null;
  member_structure_id?: number | null;
  member_structure_name?: string | null;
  needs_structure_choice?: boolean;
  needs_profile_completion?: boolean;
  can_view_card?: boolean;
  permissions?: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<AuthUser>;
  applySession: (token: string) => Promise<AuthUser>;
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
  if (slug === ROLE_SLUGS.membre) {
    if (user.member_status === 'pending') {
      return '/(auth)/en-attente';
    }
    if (user.needs_structure_choice || (user.member_status === 'active' && !user.member_structure_id)) {
      return '/(auth)/choix-structure';
    }
    if (user.needs_profile_completion) {
      return '/(auth)/completer-profil';
    }
    return '/(membre)/(tabs)';
  }
  return '/(auth)/portail-web';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      await discoverApiBaseUrl();
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

  const applySession = useCallback(async (token: string) => {
    await setToken(token);
    await discoverApiBaseUrl();
    const me = await api.get<{ user: AuthUser }>('/auth/me');
    setUser(me.user);
    setLoading(false);
    return me.user;
  }, []);

  const login = useCallback(async (loginValue: string, password: string) => {
    await discoverApiBaseUrl(true);
    const response = await api.public.post<{ token: string; user: AuthUser }>('/auth/login', {
      login: loginValue,
      password,
      device_name: deviceName(),
    });
    const authenticated = await applySession(response.token);
    await syncBiometricCredentials(loginValue, password);
    return authenticated;
  }, [applySession]);

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
      applySession,
      logout,
      refresh,
      can,
      hasRole,
      postLoginPath,
    }),
    [user, loading, login, applySession, logout, refresh, can, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  return ctx;
}
