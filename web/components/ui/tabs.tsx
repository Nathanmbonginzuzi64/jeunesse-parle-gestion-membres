"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export function Tabs({
  tabs,
  value,
  defaultValue,
  onChange,
  className,
}: {
  tabs: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  className?: string;
}) {
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.id);
  const current = value ?? internal;

  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1 overflow-x-auto rounded-xl bg-slate-100/80 p-1",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === current;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              setInternal(tab.id);
              onChange?.(tab.id);
            }}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-semibold",
                  active ? "bg-brand-50 text-brand-700" : "bg-slate-200/80 text-slate-600",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  when,
  active,
  children,
}: {
  when: string;
  active: string;
  children: ReactNode;
}) {
  if (when !== active) return null;
  return <div className="animate-fade-in">{children}</div>;
}
