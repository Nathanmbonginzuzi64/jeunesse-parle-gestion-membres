"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/feedback";
import { useAuth } from "@/lib/auth";

export function RequirePermission({
  permission,
  children,
  fallback = "/interdit",
}: {
  permission: string | string[];
  children: ReactNode;
  fallback?: string;
}) {
  const { can, loading } = useAuth();
  const router = useRouter();
  const allowed = can(permission);

  useEffect(() => {
    if (!loading && !allowed) router.replace(fallback);
  }, [loading, allowed, router, fallback]);

  if (loading || !allowed) {
    return <PageLoader label="Vérification des droits…" />;
  }

  return <>{children}</>;
}

export function Can({
  permission,
  children,
}: {
  permission: string | string[];
  children: ReactNode;
}) {
  const { can } = useAuth();
  if (!can(permission)) return null;
  return <>{children}</>;
}
