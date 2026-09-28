"use client";

import React from "react";

export function BetaBanner() {
  return (
    <div className="p-3 rounded-[8px] bg-amber-50 border border-amber-200 text-amber-800 text-[13px] leading-[1.5]">
      <div className="flex items-start gap-2">
        <span className="font-bold shrink-0">BETA</span>
        <div className="space-y-1">
          <p>모든 처리는 브라우저 안에서 진행됩니다 — 서버에 업로드되지 않아요.</p>
          <ul className="text-[12px] opacity-80 list-disc list-inside space-y-0.5">
            <li>권장: 100MB 이하, 5분 이하 영상</li>
            <li>첫 사용 시 FFmpeg 로딩에 10~30초 소요</li>
            <li>브라우저 탭을 닫지 마세요</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function SizeWarning({ file }: { file: File | null }) {
  if (!file || file.size <= 200 * 1024 * 1024) return null;
  return (
    <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[13px]">
      파일 크기({(file.size / 1024 / 1024).toFixed(0)}MB)가 200MB를 초과합니다. 브라우저 메모리 한계로 처리가 실패할 수 있습니다.
    </div>
  );
}

interface RemuxBetaBannerProps {
  isRemuxCapable: boolean;
  toolType: "mute" | "trim";
}

export function RemuxBetaBanner({ isRemuxCapable, toolType }: RemuxBetaBannerProps) {
  const toolName = toolType === "mute" ? "음소거" : "자르기";
  
  if (isRemuxCapable) {
    return (
      <div className="p-3 rounded-[8px] bg-green-50 border border-green-200 text-green-800 text-[13px] leading-[1.5]">
        <div className="flex items-start gap-2">
          <span className="font-bold shrink-0">BETA</span>
          <div className="space-y-1">
            <p>모든 처리는 브라우저 안에서 진행됩니다 — 서버에 업로드되지 않아요.</p>
            <ul className="text-[12px] opacity-80 list-disc list-inside space-y-0.5">
              <li>MP4 파일: 스트리밍 방식으로 대용량도 지원</li>
              <li>{toolName}: 비디오 재인코딩 없이 빠르게 처리</li>
              <li>브라우저 탭을 닫지 마세요</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-[8px] bg-amber-50 border border-amber-200 text-amber-800 text-[13px] leading-[1.5]">
      <div className="flex items-start gap-2">
        <span className="font-bold shrink-0">BETA</span>
        <div className="space-y-1">
          <p>모든 처리는 브라우저 안에서 진행됩니다 — 서버에 업로드되지 않아요.</p>
          <ul className="text-[12px] opacity-80 list-disc list-inside space-y-0.5">
            <li>권장: 100MB 이하, 5분 이하 영상</li>
            <li>MP4 파일은 대용량도 스트리밍 처리 가능</li>
            <li>첫 사용 시 FFmpeg 로딩에 10~30초 소요</li>
            <li>브라우저 탭을 닫지 마세요</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

interface RemuxSizeWarningProps {
  file: File | null;
  isRemuxCapable: boolean;
}

export function RemuxSizeWarning({ file, isRemuxCapable }: RemuxSizeWarningProps) {
  if (!file) return null;
  
  const sizeMB = file.size / 1024 / 1024;
  
  if (isRemuxCapable) {
    if (sizeMB <= 500) return null;
    return (
      <div className="p-3 rounded-[8px] bg-amber-50 border border-amber-200 text-amber-700 text-[13px]">
        파일 크기({sizeMB.toFixed(0)}MB)가 큽니다. 스트리밍 처리가 가능하지만 브라우저 환경에 따라 시간이 걸릴 수 있습니다.
      </div>
    );
  }
  
  if (sizeMB <= 200) return null;
  return (
    <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[13px]">
      파일 크기({sizeMB.toFixed(0)}MB)가 200MB를 초과합니다. 브라우저 메모리 한계로 처리가 실패할 수 있습니다. MP4 파일을 사용하면 스트리밍 처리로 대용량도 지원됩니다.
    </div>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[12px] text-[var(--color-muted)] font-mono">
        <span>처리 중…</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--color-accent)] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function DropZone({
  accept,
  onFile,
  label,
}: {
  accept: string;
  onFile: (f: File) => void;
  label?: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ref.current?.click(); }
  }

  const displayLabel = label ?? "파일을 선택하세요";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={displayLabel}
      className={[
        "flex flex-col items-center justify-center border-2 border-dashed rounded-[16px] p-12 cursor-pointer transition-all text-[var(--color-muted)] text-[14px] gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
        dragging
          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
          : "border-[var(--color-border-strong)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]",
      ].join(" ")}
      onClick={() => ref.current?.click()}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {displayLabel}
      <span className="text-[12px] opacity-70">클릭하거나 파일을 드래그하세요</span>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
