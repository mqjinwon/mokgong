"use client";

import React from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Chip } from "@/components/ui/Chip";
import type { Tool, Category } from "@/lib/categories";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface ToolShellProps {
  tool: Tool;
  category: Category;
  breadcrumbs: BreadcrumbItem[];
  relatedTools?: Tool[];
  children: React.ReactNode;
}

export function ToolShell({
  tool,
  category,
  breadcrumbs,
  relatedTools,
  children,
}: ToolShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Nav />

      {/* Header */}
      <div
        className="border-b border-[var(--color-border)] px-9 py-5"
        style={{ background: category.bg }}
      >
        <div className="max-w-[1200px] mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[12px] font-mono mb-3 opacity-70" style={{ color: category.ink }}>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>›</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:opacity-100 transition-opacity">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Title row */}
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-[32px] font-bold tracking-[-0.8px] m-0" style={{ color: category.ink }}>
                  {tool.name}
                </h1>
                {tool.beta && <Chip tone="beta">BETA</Chip>}
              </div>
              <p className="text-[14px] mt-1 m-0 opacity-75" style={{ color: category.ink }}>
                {tool.desc}
              </p>
            </div>
            <div className="flex gap-2 items-center shrink-0">
              <span
                className="font-mono text-[11px] px-2.5 py-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.7)", color: category.ink }}
              >
                {category.name.toUpperCase()}
              </span>
              <span
                className="font-mono text-[11px] px-2.5 py-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.7)", color: category.ink }}
              >
                🔒 BROWSER-ONLY
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <section className="max-w-[1200px] mx-auto px-9 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
          <div>{children}</div>

          {/* Right rail */}
          <aside className="flex flex-col gap-4">
            <div className="p-4 rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="font-semibold text-[14px] mb-2">처리 방식</div>
              <p className="text-[13px] text-[var(--color-muted)] leading-[1.6] m-0">
                브라우저 안에서 처리. 파일이 서버로 전송되지 않습니다.
              </p>
            </div>

            {relatedTools && relatedTools.length > 0 && (
              <div
                className="p-4 rounded-[16px]"
                style={{ background: category.bg }}
              >
                <div className="font-semibold text-[14px] mb-3" style={{ color: category.ink }}>
                  관련 도구
                </div>
                <div className="flex flex-wrap gap-2">
                  {relatedTools.map((t) => (
                    <Link
                      key={t.key}
                      href={`/${category.key}/${t.key}`}
                      className="font-mono text-[11px] px-2.5 py-1 rounded-full no-underline hover:opacity-80 transition-opacity"
                      style={{ background: "rgba(255,255,255,0.7)", color: category.ink }}
                    >
                      {t.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="font-semibold text-[14px] mb-2">도구 제안</div>
              <p className="text-[13px] text-[var(--color-muted)] leading-[1.5] m-0">
                필요한 기능이 있으면 알려주세요.
              </p>
              <a
                href="https://github.com/mqjinwon/mokgong/issues/new?labels=tool-request&title=%5B%EB%8F%84%EA%B5%AC+%EC%9A%94%EC%B2%AD%5D+&body=%EC%96%B4%EB%96%A4+%EB%8F%84%EA%B5%AC%EA%B0%80+%ED%95%84%EC%9A%94%ED%95%9C%EA%B0%80%EC%9A%94%3F%0A%0A%23%23+%EC%82%AC%EC%9A%A9+%EC%82%AC%EB%A1%80%0A%0A%23%23+%EC%B0%B8%EA%B3%A0+%EC%84%9C%EB%B9%84%EC%8A%A4"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-[13px] text-[var(--color-accent)] underline"
              >
                요청하기 →
              </a>
            </div>
          </aside>
        </div>
      </section>

      <footer className="px-9 py-5 border-t border-[var(--color-border)] flex justify-between items-center text-[var(--color-muted)] text-[12px] font-mono">
        <span>Made in browser. No upload, ever.</span>
        <span>v0.1.0</span>
      </footer>
    </div>
  );
}
