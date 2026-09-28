"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { detectFileKind } from "@/lib/fileType";
import { setHandoffFile } from "@/lib/handoff";
import { CATEGORIES } from "@/lib/categories";
import { Chip } from "./ui/Chip";
import { Button } from "./ui/Button";

interface AfterDropOverlayProps {
  file: File | null;
  onClose: () => void;
}

export function AfterDropOverlay({ file, onClose }: AfterDropOverlayProps) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!file) return null;

  const kind = detectFileKind(file);
  const category = CATEGORIES.find((c) => c.key === kind && c.active);
  const tools = category ? category.tools.slice(0, 8) : [];

  function handleToolClick(categoryKey: string, toolKey: string) {
    if (file) setHandoffFile(file);
    router.push(`/${categoryKey}/${toolKey}`);
    onClose();
  }

  const kindLabel: Record<string, string> = {
    image: "이미지",
    pdf: "PDF",
    video: "동영상",
    unknown: "파일",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drop-overlay-title"
      className="fixed inset-0 bg-[rgba(20,22,31,0.45)] z-30 flex items-start justify-center p-[60px_24px] animate-[uwu-fade_.18s_ease]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-[16px] max-w-[960px] w-full p-7 shadow-[0_24px_60px_rgba(20,22,31,0.18)]"
      >
        {/* Header */}
        <div className="flex justify-between items-center">
          <Chip tone="accent">FILE DETECTED</Chip>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="text-[var(--color-muted)] text-[22px] cursor-pointer bg-none border-none p-0 leading-none hover:text-[var(--color-fg)] transition-colors"
          >
            ×
          </button>
        </div>

        {/* File info */}
        <div className="mt-3.5 p-3.5 px-4 bg-[var(--color-surface-alt)] rounded-[8px] flex items-center gap-3.5">
          <div className="text-[32px]">
            {kind === "pdf" ? "📄" : kind === "image" ? "🖼️" : kind === "video" ? "🎬" : "📁"}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-[16px] text-[var(--color-fg)]">{file.name}</div>
            <div className="text-[var(--color-muted)] text-[13px] font-mono">
              {kindLabel[kind] ?? "파일"} · {(file.size / 1024).toFixed(0)} KB
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            다른 파일
          </Button>
        </div>

        {/* Actions header */}
        <div className="mt-5 flex justify-between items-baseline">
          <h3 id="drop-overlay-title" className="m-0 font-semibold text-[18px] text-[var(--color-fg)]">
            {file.name} — {kindLabel[kind] ?? "알 수 없는"} 파일
          </h3>
          <span className="text-[var(--color-muted)] text-[12px] font-mono">
            {tools.length} ACTIONS AVAILABLE
          </span>
        </div>

        {/* Tool grid */}
        {tools.length > 0 ? (
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            {tools.map((tool) => (
              <div
                key={tool.key}
                onClick={() => handleToolClick(kind, tool.key)}
                className={`
                  p-3.5 rounded-[8px] cursor-pointer transition-all duration-[120ms]
                  border hover:border-[var(--color-accent)]
                  ${tool.featured
                    ? "bg-[var(--color-accent-soft)] border-transparent"
                    : "bg-white border-[var(--color-border)]"
                  }
                `}
              >
                <div
                  className={`font-semibold text-[15px] ${
                    tool.featured ? "text-[var(--color-accent-ink)]" : "text-[var(--color-fg)]"
                  }`}
                >
                  {tool.name}
                </div>
                <div className="text-[var(--color-muted)] text-[12px] mt-1 leading-[1.45]">
                  {tool.desc}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 p-4 bg-[var(--color-surface-alt)] rounded-[8px] text-[var(--color-muted)] text-[14px] text-center">
            {kind === "unknown"
              ? "지원하지 않는 파일 형식입니다. Image, PDF, Video 파일을 선택해주세요."
              : "해당 카테고리의 도구가 아직 준비 중입니다."}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4.5 pt-3.5 border-t border-dashed border-[var(--color-border)] text-[var(--color-muted)] text-[12px] font-mono flex justify-between">
          <span>✓ 이 파일은 서버로 전송되지 않았습니다</span>
          <span>esc 또는 다른 파일을 드롭하면 초기화</span>
        </div>
      </div>
    </div>
  );
}
