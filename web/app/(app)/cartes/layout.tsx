"use client";

import { Suspense } from "react";
import { CardsSectionNav } from "@/components/cards/cards-section-nav";
import { CardsStatusNav } from "@/components/cards/cards-status-nav";
import { Skeleton } from "@/components/ui/feedback";

export default function CardsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-12 rounded-card" />}>
        <CardsSectionNav />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-12 rounded-card" />}>
        <CardsStatusNav />
      </Suspense>
      {children}
    </div>
  );
}
