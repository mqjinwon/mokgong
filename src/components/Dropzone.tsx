"use client";

import React, { useRef, useState } from "react";
import { Button } from "./ui/Button";

interface DropzoneProps {
  onFile: (file: File) => void;
}

export function Dropzone({ onFile }: DropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = "";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  return (
    <div className="px-9 pt-16 pb-7 text-center bg-gradient-to-b from-[var(--color-accent-soft)] to-[var(--color-bg)] border-b border-[var(--color-border)]">
      <div className="inline-flex items-center gap-1.5 bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] text-[11px] font-mono px-3 py-1 rounded-full border-transparent mb-4">
        ● BROWSER-ONLY · NO SIGNUP
      </div>

      <h1 className="font-bold text-[48px] leading-[1.05] tracking-[-2px] text-[var(--color-fg)] m-0 sm:text-[56px]">
        설치 없이, 가입 없이.<br />
        <span className="text-[var(--color-accent)]">웹에서 끝내는</span> 도구함.
      </h1>

      <p className="text-[var(--color-muted)] mt-3.5 text-[16px] max-w-[540px] mx-auto">
        Image · PDF · Video — 브라우저 안에서 처리, 업로드 없음
      </p>

      {/* Drop area */}
      <div
        role="button"
        tabIndex={0}
        aria-label="파일을 떨어뜨리면 작업을 시작합니다"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        className={`
          mt-8 mx-auto max-w-[720px] rounded-[24px] p-7 px-8
          flex items-center justify-between gap-4
          transition-all duration-150 cursor-pointer
          border-2 border-dashed outline-none
          focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
          ${dragging
            ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
            : "border-[var(--color-border-strong)] bg-white hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
          }
        `}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex items-center gap-4.5 text-left">
          <div className="w-14 h-14 rounded-[8px] bg-[var(--color-accent)] text-white grid place-items-center text-[26px] shrink-0">
            ⬇
          </div>
          <div>
            <div className="font-semibold text-[18px] text-[var(--color-fg)]">
              파일을 떨어뜨리면 작업을 시작합니다
            </div>
            <div className="text-[var(--color-muted)] text-[14px] mt-1">
              Image · PDF · Video — 브라우저 안에서 처리, 업로드 없음
            </div>
          </div>
        </div>

        <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="primary"
            size="md"
            onClick={() => inputRef.current?.click()}
          >
            파일 선택
          </Button>
        </div>
      </div>

      {/* Trust strip */}
      <div className="flex justify-center gap-7 mt-5 text-[var(--color-muted)] text-[12px] font-mono flex-wrap">
        <span className="whitespace-nowrap">🔒 업로드 없음</span>
        <span className="whitespace-nowrap">⚡ 즉시 처리</span>
        <span className="whitespace-nowrap">🆓 무료</span>
        <span className="whitespace-nowrap">📱 모바일 OK</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept="image/*,application/pdf,video/*"
      />
    </div>
  );
}
