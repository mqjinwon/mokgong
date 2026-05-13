import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-[16px] bg-white border border-[var(--color-border)] p-6 ${className}`}
    >
      {children}
    </div>
  );
}
