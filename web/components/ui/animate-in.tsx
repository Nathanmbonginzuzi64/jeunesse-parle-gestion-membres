"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AnimationType = "slide-up" | "fade-in" | "scale-in" | "slide-left";

export const ANIMATION_CLASS: Record<AnimationType, string> = {
  "slide-up": "animate-slide-up",
  "fade-in": "animate-fade-in",
  "scale-in": "animate-scale-in",
  "slide-left": "animate-slide-in-left",
};

export function animationDelayStyle(delay: number): CSSProperties {
  return { "--animation-delay": `${delay}ms` } as CSSProperties;
}

type AnimateInProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  animation?: AnimationType;
};

/** Animation au chargement avec délai configurable (--animation-delay). */
export function AnimateIn({ children, className, delay = 0, animation = "slide-up" }: AnimateInProps) {
  return (
    <div className={cn(ANIMATION_CLASS[animation], className)} style={animationDelayStyle(delay)}>
      {children}
    </div>
  );
}
