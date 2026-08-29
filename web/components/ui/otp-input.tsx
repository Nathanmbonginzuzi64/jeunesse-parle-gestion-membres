"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled,
}: {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(length, " ").slice(0, length).split("");

  function setDigit(index: number, digit: string) {
    const next = value.split("");
    next[index] = digit;
    onChange(next.join("").replace(/\s/g, "").slice(0, length));
  }

  return (
    <div className="flex justify-center gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Chiffre ${index + 1}`}
          disabled={disabled}
          maxLength={1}
          value={digit.trim()}
          onChange={(event) => {
            const char = event.target.value.replace(/\D/g, "").slice(-1);
            setDigit(index, char);
            if (char) refs.current[index + 1]?.focus();
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !value[index]) {
              refs.current[index - 1]?.focus();
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            onChange(pasted);
            refs.current[Math.min(pasted.length, length - 1)]?.focus();
          }}
          className={cn(
            "h-12 w-10 rounded-[var(--radius-control)] border border-slate-300 text-center text-lg font-semibold tabular-nums",
            "focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
          )}
        />
      ))}
    </div>
  );
}
