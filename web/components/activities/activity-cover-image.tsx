"use client";

import { CalendarDays } from "lucide-react";
import { useProtectedImage } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export function ActivityCoverImage({
  url,
  alt = "",
  className,
  iconClassName,
  placeholderClassName,
}: {
  url?: string | null;
  alt?: string;
  className?: string;
  iconClassName?: string;
  placeholderClassName?: string;
}) {
  const src = useProtectedImage(url);

  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-brand-100 to-brand-50",
          placeholderClassName,
          className,
        )}
      >
        <CalendarDays className={cn("text-brand-300", iconClassName)} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={cn("object-cover", className)} />
  );
}
