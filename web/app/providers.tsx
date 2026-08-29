"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/toast";
import { InitialPageLoader } from "@/components/ui/initial-page-loader";
import { NavigationProgress } from "@/components/ui/navigation-progress";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <InitialPageLoader />
        <NavigationProgress />
        {children}
      </AuthProvider>
    </ToastProvider>
  );
}
