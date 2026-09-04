"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/toast";
import { InitialPageLoader } from "@/components/ui/initial-page-loader";
import { NavigationProgress } from "@/components/ui/navigation-progress";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <InitialPageLoader />
        <NavigationProgress />
        <ServiceWorkerRegister />
        {children}
      </AuthProvider>
    </ToastProvider>
  );
}
