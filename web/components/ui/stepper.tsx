import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({
  steps,
  current,
  onStepClick,
}: {
  steps: string[];
  current: number;
  onStepClick?: (index: number) => void;
}) {
  return (
    <ol className="flex items-start gap-0 overflow-x-auto pb-1">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center">
            <button
              type="button"
              disabled={!onStepClick || index > current}
              onClick={() => onStepClick?.(index)}
              className="flex min-w-0 items-center gap-2 text-left disabled:cursor-default"
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 transition-colors",
                  done && "bg-brand-600 text-white ring-brand-600",
                  active && "bg-white text-brand-700 ring-brand-600",
                  !done && !active && "bg-white text-slate-400 ring-slate-200",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "hidden truncate text-xs font-medium sm:block",
                  active ? "text-slate-900" : "text-slate-500",
                )}
              >
                {label}
              </span>
            </button>
            {index < steps.length - 1 && (
              <span
                className={cn("mx-2 hidden h-px flex-1 sm:block", done ? "bg-brand-400" : "bg-slate-200")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
