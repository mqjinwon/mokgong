"use client";

import React from "react";

type ChipTone = "default" | "accent" | "beta" | "soon" | "new" | "popular";

interface ChipProps {
  tone?: ChipTone;
  children: React.ReactNode;
  className?: string;
}

export function Chip({ tone = "default", children, className = "" }: ChipProps) {
  const base =
    "inline-flex items-center gap-1.5 px-[9px] py-[3px] font-mono text-[11px] rounded-full whitespace-nowrap border tracking-[0.2px]";

  const tones: Record<ChipTone, string> = {
    default:
      "bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)]",
    accent:
      "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border-transparent",
    beta:
      "bg-amber-50 text-amber-700 border-amber-200",
    soon:
      "bg-[var(--color-surface-alt)] text-[var(--color-muted)] border-[var(--color-border)]",
    new:
      "bg-green-50 text-green-700 border-green-200",
    popular:
      "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border-transparent",
  };

  return (
    <span className={`${base} ${tones[tone]} ${className}`}>{children}</span>
  );
}
