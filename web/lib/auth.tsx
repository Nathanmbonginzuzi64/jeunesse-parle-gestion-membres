"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api, setToken, setUnauthorizedHandler } from "./api";
import type { AuthUser, Member } from "./types";
import { ROLE_SLUGS } from "./permissions";

interface LoginPayload {
  login: string;
  password: string;
  device_name?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  member: Member | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (permission: string | string[]) => boolean;
  hasRole: (...slugs: string[]) => boolean;
  isMemberOnly: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await api.get<{ user: AuthUser; member: Member | null }>("/auth/me");
      setUser(response.user);
      setMember(response.member);
    } catch {
      setUser(null);
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Un jeton expiré doit ramener l'utilisateur à l'écran de connexion sans
    // laisser une interface à moitié chargée.
    setUnauthorizedHandler(() => {
      setUser(null);
      setMember(null);
      router.replace("/connexion");
    });

    return () => setUnauthorizedHandler(null);
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await api.public.post<{ token: string; user: AuthUser }>("/auth/login", {
      device_name: "web",
      ...payload,
    });

    setToken(response.token);
    setUser(response.user);

    const me = await api.get<{ user: AuthUser; member: Member | null }>("/auth/me");
    setUser(me.user);
    setMember(me.member);
    setLoading(false);

    return me.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // La session locale doit être purgée même si l'appel réseau échoue.
    }
    setToken(null);
    setUser(null);
    setMember(null);
    router.replace("/connexion");
  }, [router]);

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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      member,
      loading,
      login,
      logout,
      refresh,
      can,
      hasRole,
      isMemberOnly: user?.role?.slug === ROLE_SLUGS.membre,
    }),
    [user, member, loading, login, logout, refresh, can, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>.");
  }
  return context;
}
