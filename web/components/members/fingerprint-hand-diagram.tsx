"use client";

import { CheckCircle2 } from "lucide-react";
import {
  FINGERPRINT_SLOTS,
  type FingerprintCaptureMap,
  type FingerprintHand,
  type FingerprintSlot,
  type FingerprintSlotMeta,
} from "@/lib/fingerprints";
import { cn } from "@/lib/utils";

const FINGER_ORDER: FingerprintSlotMeta["finger"][] = ["auriculaire", "index", "majeur"];

function slotMeta(hand: FingerprintHand, finger: FingerprintSlotMeta["finger"]) {
  return FINGERPRINT_SLOTS.find((item) => item.hand === hand && item.finger === finger)!;
}

function HandFinger({
  meta,
  selected,
  completed,
  disabled,
  onSelect,
}: {
  meta: FingerprintSlotMeta;
  selected: boolean;
  completed: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || completed}
      onClick={onSelect}
      title={meta.label}
      className={cn(
        "group relative flex flex-col items-center gap-1 transition-all",
        disabled && !completed && "cursor-not-allowed opacity-40",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all sm:h-12 sm:w-12",
          completed && "border-emerald-500 bg-emerald-500 text-white",
          selected && !completed && "border-brand-500 bg-brand-100 text-brand-800 ring-4 ring-brand-200",
          !selected && !completed && "border-slate-300 bg-white text-slate-500 group-hover:border-brand-400 group-hover:bg-brand-50",
        )}
      >
        {completed ? <CheckCircle2 className="h-5 w-5" /> : meta.shortLabel.split(" ")[0]}
      </span>
      <span className="max-w-[4.5rem] text-center text-[10px] leading-tight text-slate-600">
        {meta.label.split(" ")[0]}
      </span>
    </button>
  );
}

function HandPanel({
  hand,
  value,
  activeSlot,
  onSelect,
  selectionEnabled,
}: {
  hand: FingerprintHand;
  value: FingerprintCaptureMap;
  activeSlot: FingerprintSlot | null;
  onSelect: (slot: FingerprintSlot) => void;
  selectionEnabled: boolean;
}) {
  const label = hand === "left" ? "Main gauche" : "Main droite";
  const fingers = FINGER_ORDER.map((finger) => slotMeta(hand, finger));

  return (
    <div className="flex flex-1 flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>

      <svg viewBox="0 0 120 140" className="h-28 w-auto text-slate-300 sm:h-32" aria-hidden>
        <ellipse cx="60" cy="95" rx="38" ry="32" fill="currentColor" opacity="0.35" />
        <rect x="18" y="18" width="14" height="52" rx="7" fill="currentColor" opacity={hand === "left" ? 0.5 : 0.35} />
        <rect x="38" y="8" width="16" height="62" rx="8" fill="currentColor" opacity={0.55} />
        <rect x="58" y="12" width="16" height="58" rx="8" fill="currentColor" opacity={0.55} />
        <rect x="78" y="22" width="14" height="48" rx="7" fill="currentColor" opacity={hand === "left" ? 0.35 : 0.5} />
      </svg>

      <div className={cn("flex gap-2 sm:gap-3", hand === "right" && "flex-row-reverse")}>
        {fingers.map((meta) => (
          <HandFinger
            key={meta.slot}
            meta={meta}
            selected={activeSlot === meta.slot}
            completed={Boolean(value[meta.slot])}
            disabled={Boolean(value[meta.slot]) || !selectionEnabled}
            onSelect={() => onSelect(meta.slot)}
          />
        ))}
      </div>
    </div>
  );
}

export function FingerprintHandDiagram({
  value,
  activeSlot,
  onSelectFinger,
  selectionEnabled = true,
}: {
  value: FingerprintCaptureMap;
  activeSlot: FingerprintSlot | null;
  onSelectFinger: (slot: FingerprintSlot) => void;
  selectionEnabled?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <HandPanel
        hand="left"
        value={value}
        activeSlot={activeSlot}
        onSelect={onSelectFinger}
        selectionEnabled={selectionEnabled}
      />
      <HandPanel
        hand="right"
        value={value}
        activeSlot={activeSlot}
        onSelect={onSelectFinger}
        selectionEnabled={selectionEnabled}
      />
    </div>
  );
}
