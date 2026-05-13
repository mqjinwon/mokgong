import React from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { CATEGORIES } from "@/lib/categories";
import { Chip } from "@/components/ui/Chip";

export default function ImageCategoryPage() {
  const cat = CATEGORIES.find((c) => c.key === "image")!;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Nav />

      {/* Hero */}
      <div
        className="border-b border-[var(--color-border)] px-9 py-8"
        style={{ background: cat.bg }}
      >
        <div className="max-w-[1100px] mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[12px] font-mono mb-4 opacity-70" style={{ color: cat.ink }}>
            <Link href="/" className="hover:opacity-100">Hub</Link>
            <span>›</span>
            <span>Image</span>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-[12px] grid place-items-center shrink-0"
              style={{ background: "rgba(255,255,255,0.7)", color: cat.ink }}
            >
              {cat.icon(cat.ink)}
            </div>
            <div>
              <h1 className="text-[36px] font-bold tracking-[-1px] m-0" style={{ color: cat.ink }}>
                Image — {cat.count} tools
              </h1>
              <p className="text-[14px] mt-1 m-0 opacity-75" style={{ color: cat.ink }}>
                자르기·크기조절·압축·변환 등 모든 처리가 브라우저 안에서 이루어집니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tools + sidebar */}
      <section className="max-w-[1100px] mx-auto px-9 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-9">
          {/* Tool list */}
          <div>
            <div className="font-mono text-[12px] text-[var(--color-muted)] mb-3 uppercase">All Tools</div>
            <div className="flex flex-col gap-2">
              {cat.tools.map((tool) => (
                <Link
                  key={tool.key}
                  href={`/image/${tool.key}`}
                  className="no-underline group"
                >
                  <div className="flex items-center justify-between px-5 py-[18px] rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[17px] font-semibold">
                        <span>{tool.name}</span>
                        {tool.featured && <Chip tone="accent">POPULAR</Chip>}
                        {tool.beta && <Chip tone="beta">BETA</Chip>}
                      </div>
                      <div className="text-[13px] text-[var(--color-muted)] mt-0.5">{tool.desc}</div>
                    </div>
                    <span className="text-[var(--color-muted)] text-[18px] shrink-0 group-hover:text-[var(--color-accent)] transition-colors">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Right rail */}
          <aside className="flex flex-col gap-4">
            <div className="p-4 rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="font-semibold text-[14px] mb-2">처리 방식</div>
              <p className="text-[13px] text-[var(--color-muted)] leading-[1.6] m-0">
                브라우저 안에서 처리, 파일이 서버로 전송되지 않습니다.
              </p>
            </div>
            <div
              className="p-4 rounded-[16px]"
              style={{ background: cat.bg }}
            >
              <div className="font-semibold text-[14px] mb-2" style={{ color: cat.ink }}>
                도구 추가 요청
              </div>
              <p className="text-[13px] leading-[1.5] m-0 opacity-75" style={{ color: cat.ink }}>
                필요한 이미지 도구를 알려주시면 우선순위에 반영해요.
              </p>
              <a
                href="https://github.com/mqjinwon/mokgong/issues/new?labels=tool-request&title=%5B%EB%8F%84%EA%B5%AC+%EC%9A%94%EC%B2%AD%5D+&body=%EC%96%B4%EB%96%A4+%EB%8F%84%EA%B5%AC%EA%B0%80+%ED%95%84%EC%9A%94%ED%95%9C%EA%B0%80%EC%9A%94%3F%0A%0A%23%23+%EC%82%AC%EC%9A%A9+%EC%82%AC%EB%A1%80%0A%0A%23%23+%EC%B0%B8%EA%B3%A0+%EC%84%9C%EB%B9%84%EC%8A%A4"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-[13px] underline opacity-80 hover:opacity-100"
                style={{ color: cat.ink }}
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
