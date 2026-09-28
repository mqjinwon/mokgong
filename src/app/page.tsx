"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Dropzone } from "@/components/Dropzone";
import { AfterDropOverlay } from "@/components/AfterDropOverlay";
import { CATEGORIES } from "@/lib/categories";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";

export default function HubPage() {
  const [overlayFile, setOverlayFile] = useState<File | null>(null);

  function handleFile(file: File) {
    setOverlayFile(file);
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Nav />

      <Dropzone onFile={handleFile} />

      {/* Category grid */}
      <section className="px-9 pt-11 pb-9 max-w-[1280px] mx-auto">
        <div className="flex justify-between items-baseline mb-4">
          <h2 className="font-semibold text-[22px] m-0 text-[var(--color-fg)]">카테고리</h2>
          <div className="text-[var(--color-muted)] text-[13px]">
            도구가 점점 늘어요.{" "}
            <a
              href="https://github.com/mqjinwon/mokgong/issues/new?labels=tool-request&title=%5B%EB%8F%84%EA%B5%AC+%EC%9A%94%EC%B2%AD%5D+&body=%EC%96%B4%EB%96%A4+%EB%8F%84%EA%B5%AC%EA%B0%80+%ED%95%84%EC%9A%94%ED%95%9C%EA%B0%80%EC%9A%94%3F%0A%0A%23%23+%EC%82%AC%EC%9A%A9+%EC%82%AC%EB%A1%80%0A%0A%23%23+%EC%B0%B8%EA%B3%A0+%EC%84%9C%EB%B9%84%EC%8A%A4"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] underline"
            >
              원하는 도구 제안하기 →
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <CategoryCard key={cat.key} cat={cat} />
          ))}
        </div>

        {/* Request tools strip */}
        <div className="mt-9 p-5 px-6 bg-[var(--color-surface-alt)] rounded-[16px] flex justify-between items-center gap-6 flex-wrap">
          <div>
            <div className="font-semibold text-[16px] text-[var(--color-fg)]">원하는 도구가 없나요?</div>
            <div className="text-[var(--color-muted)] text-[13px] mt-1 leading-[1.6]">
              필요한 도구를 제안해 주세요. 사용자 요청을 우선 반영합니다.
            </div>
          </div>
          <a
            href="https://github.com/mqjinwon/mokgong/issues/new?labels=tool-request&title=%5B%EB%8F%84%EA%B5%AC+%EC%9A%94%EC%B2%AD%5D+&body=%EC%96%B4%EB%96%A4+%EB%8F%84%EA%B5%AC%EA%B0%80+%ED%95%84%EC%9A%94%ED%95%9C%EA%B0%80%EC%9A%94%3F"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="primary" size="sm">도구 제안</Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-9 py-5 border-t border-[var(--color-border)] flex justify-between items-center text-[var(--color-muted)] text-[12px] font-mono">
        <span>Made in browser. No upload, ever.</span>
        <span>v0.1.0</span>
      </footer>

      {overlayFile && (
        <AfterDropOverlay
          file={overlayFile}
          onClose={() => setOverlayFile(null)}
        />
      )}
    </div>
  );
}

type ChipToneType = "default" | "accent" | "beta" | "soon" | "new" | "popular";

interface CategoryCardProps {
  cat: (typeof CATEGORIES)[number];
}

function CategoryCard({ cat }: CategoryCardProps) {
  const [hover, setHover] = useState(false);

  const isGhost = cat.ghost;
  const isClickable = cat.active;

  const badgeTone: ChipToneType =
    cat.badge === "SOON"
      ? "soon"
      : cat.badge === "BETA"
      ? "beta"
      : cat.badge === "NEW"
      ? "new"
      : "default";

  const cardStyle: React.CSSProperties = {
    background: hover && isClickable ? cat.bgStrong : cat.bg,
    borderRadius: "16px",
    padding: "20px 20px 16px",
    cursor: isClickable ? "pointer" : isGhost ? "default" : "not-allowed",
    transform: hover && isClickable ? "translateY(-2px)" : "none",
    transition: "all 0.18s ease",
    border: isGhost
      ? "2px dashed var(--color-border-strong)"
      : "1px solid transparent",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    minHeight: "230px",
    opacity: !cat.active && !isGhost ? 0.6 : 1,
    textDecoration: "none",
  };

  const content = (
    <>
      {/* Icon row */}
      <div className="flex justify-between items-center">
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "8px",
            background: "rgba(255,255,255,0.7)",
            color: cat.ink,
            display: "grid",
            placeItems: "center",
          }}
        >
          {cat.icon(cat.ink)}
        </div>
        <div className="flex gap-1.5 items-center">
          {cat.badge && <Chip tone={badgeTone}>{cat.badge}</Chip>}
          {!isGhost && (
            <span
              className="font-mono text-[11px] opacity-70"
              style={{ color: cat.ink }}
            >
              {cat.count} tools
            </span>
          )}
        </div>
      </div>

      {/* Name */}
      <div
        className="font-semibold text-[22px] tracking-[-0.3px]"
        style={{ color: cat.ink }}
      >
        {cat.name}
      </div>

      {/* Content */}
      {isGhost ? (
        <div
          className="text-[13px] leading-[1.55] opacity-80"
          style={{ color: cat.ink }}
        >
          {cat.note}
          <div className="mt-2 underline">제안하기 →</div>
        </div>
      ) : (
        <ul
          className="list-none p-0 m-0 text-[13.5px] leading-[1.8]"
          style={{ color: cat.ink, opacity: 0.85 }}
        >
          {cat.tools.slice(0, 4).map((tool) => (
            <li key={tool.key}>· {tool.name}</li>
          ))}
          {cat.tools.length > 4 && (
            <li style={{ opacity: 0.6 }}>+ {cat.tools.length - 4} more</li>
          )}
        </ul>
      )}
    </>
  );

  if (isClickable) {
    return (
      <Link
        href={`/${cat.key}`}
        style={cardStyle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={cardStyle}
    >
      {content}
    </div>
  );
}
