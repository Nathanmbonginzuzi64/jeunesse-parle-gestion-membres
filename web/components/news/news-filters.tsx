"use client";

import { cn } from "@/lib/utils";
import { NEWS_CATEGORIES } from "@/lib/news/constants";

interface NewsFiltersProps {
  category: string;
  onCategoryChange: (value: string) => void;
}

export function NewsFilters({ category, onCategoryChange }: NewsFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {NEWS_CATEGORIES.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onCategoryChange(item.value)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
            category === item.value
              ? "bg-brand-600 text-white shadow-md"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-700",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
