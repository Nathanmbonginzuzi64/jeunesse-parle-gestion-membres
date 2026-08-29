"use client";

import type { ReactNode } from "react";
import { AnimateIn } from "@/components/ui/animate-in";
import { cn } from "@/lib/utils";

export function DashboardAnimate({
  children,
  delay = 0,
  className,
  animation = "slide-up",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  animation?: "slide-up" | "fade-in" | "scale-in" | "slide-left";
}) {
  return (
    <AnimateIn animation={animation} delay={delay} className={cn(className)}>
      {children}
    </AnimateIn>
  );
}
