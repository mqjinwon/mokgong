"use client";

import React from "react";

type ButtonVariant = "primary" | "ghost" | "outline";
type ButtonSize = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

export function Button({
  variant = "outline",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-semibold rounded-[8px] cursor-pointer transition-all whitespace-nowrap border";

  const sizes: Record<ButtonSize, string> = {
    sm: "text-[13px] px-3 py-[6px]",
    md: "text-[14px] px-4 py-[9px]",
  };

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--color-accent)] text-white border-transparent hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-active)]",
    ghost:
      "bg-transparent text-[var(--color-fg)] border-transparent hover:bg-[var(--color-surface-alt)]",
    outline:
      "bg-[var(--color-surface)] text-[var(--color-fg)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
