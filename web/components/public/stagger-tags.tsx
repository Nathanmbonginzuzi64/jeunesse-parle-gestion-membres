"use client";

import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";

type StaggerTagsProps = {
  tags: string[];
  extraLabel?: string;
  baseDelay?: number;
  step?: number;
};

export function StaggerTags({ tags, extraLabel, baseDelay = 0, step = 80 }: StaggerTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((name, index) => (
        <RevealOnScroll
          key={name}
          delay={baseDelay + index * step}
          animation="scale-in"
          className="inline-block"
        >
          <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 transition hover:border-brand-400 hover:bg-brand-100">
            {name}
          </span>
        </RevealOnScroll>
      ))}
      {extraLabel && (
        <RevealOnScroll delay={baseDelay + tags.length * step} animation="fade-in" className="inline-block">
          <span className="rounded-full border border-dashed border-brand-300 px-3 py-1.5 text-xs text-brand-500">
            {extraLabel}
          </span>
        </RevealOnScroll>
      )}
    </div>
  );
}
