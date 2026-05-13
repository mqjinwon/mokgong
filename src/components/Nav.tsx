import React from "react";
import Link from "next/link";

export function Nav() {
  return (
    <nav className="sticky top-0 z-10 h-16 bg-white border-b border-[var(--color-border)] flex items-center justify-between px-9">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <div
            className="w-7 h-7 rounded-[8px] bg-[var(--color-accent)] text-white grid place-items-center font-mono text-[14px] font-semibold"
          >
            ◉
          </div>
          <span className="font-bold text-[18px] tracking-[-0.3px] text-[var(--color-fg)]">
            Mokgong
            <span className="text-[var(--color-muted)] font-normal ml-1.5 text-[14px]">
              파일 도구함
            </span>
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-3.5 text-[var(--color-muted)] text-[13px] whitespace-nowrap">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[var(--color-fg)] transition-colors"
        >
          GitHub
        </a>
        <span className="font-mono text-[11px] px-2.5 py-1 rounded-full border border-[var(--color-border)]">
          한국어
        </span>
      </div>
    </nav>
  );
}
