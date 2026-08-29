"use client";

/* eslint-disable @next/next/no-img-element */

import { useProtectedImage } from "@/lib/hooks";
import { cn, initials } from "@/lib/utils";

const SIZES = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-lg",
  xl: "h-28 w-28 text-2xl",
};

/**
 * Photo de membre. Les images vivent derrière une route authentifiée : elles
 * sont donc récupérées via fetch puis affichées en object URL.
 */
export function Avatar({
  src,
  name,
  size = "md",
  className,
  rounded = "full",
}: {
  src?: string | null;
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  rounded?: "full" | "lg";
}) {
  const resolved = useProtectedImage(src);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-brand-100 font-semibold text-brand-700 select-none",
        rounded === "full" ? "rounded-full" : "rounded-lg",
        SIZES[size],
        className,
      )}
      aria-hidden={!name}
    >
      {resolved ? (
        <img src={resolved} alt={name ? `Photo de ${name}` : ""} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/** Variante pour les images déjà publiques (vérification par jeton QR). */
export function PublicAvatar({
  src,
  name,
  size = "lg",
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-100 font-semibold text-brand-700 select-none",
        SIZES[size],
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name ? `Photo de ${name}` : ""} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
