"use client";

import { Suspense } from "react";
import { MembersStatusNav } from "@/components/members/members-status-nav";
import { Skeleton } from "@/components/ui/feedback";

function NavFallback() {
  return <Skeleton className="h-12 rounded-card" />;
}

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<NavFallback />}>
        <MembersStatusNavWrapper />
      </Suspense>
      {children}
    </div>
  );
}

function MembersStatusNavWrapper() {
  return <MembersStatusNav />;
}
