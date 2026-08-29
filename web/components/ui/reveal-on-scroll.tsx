"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ANIMATION_CLASS, animationDelayStyle, type AnimationType } from "@/components/ui/animate-in";
import { cn } from "@/lib/utils";

const HIDDEN_CLASS: Record<AnimationType, string> = {
  "slide-up": "jp-reveal-hidden",
  "fade-in": "jp-reveal-hidden",
  "scale-in": "jp-reveal-hidden jp-reveal-scale",
  "slide-left": "jp-reveal-hidden jp-reveal-left",
};

type RevealOnScrollProps = {
  children: ReactNode;
  className?: string;
  /** Délai avant le début de l'animation (ms). */
  delay?: number;
  animation?: AnimationType;
};

export function RevealOnScroll({
  children,
  className,
  delay = 0,
  animation = "slide-up",
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(className, visible ? ANIMATION_CLASS[animation] : HIDDEN_CLASS[animation])}
      style={visible ? animationDelayStyle(delay) : undefined}
    >
      {children}
    </div>
  );
}
