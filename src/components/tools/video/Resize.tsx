"use client";

import React, { useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadBlob } from "@/lib/download";
import { BetaBanner, SizeWarning, ProgressBar, DropZone } from "./shared";

interface Props {
  initialFile?: File | null;
}

export function ResizeTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(() => initialFile ?? null);
  const [origW, setOrigW] = useState(0);
  const [origH, setOrigH] = useState(0);
  const [targetW, setTargetW] = useState(0);
  const [targetH, setTargetH] = useState(0);
  const [lockAspect, setLockAspect] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");

  function handleVideoLoaded(e: React.SyntheticEvent<HTMLVideoElement>) {
    const v = e.currentTarget;
    setOrigW(v.videoWidth);
    setOrigH(v.videoHeight);
    setTargetW(v.videoWidth);
    setTargetH(v.videoHeight);
  }

  function onWidthChange(val: number) {
    setTargetW(val);
    if (lockAspect && origW > 0) {
      setTargetH(Math.round((val / origW) * origH));
    }
  }

  function onHeightChange(val: number) {
    setTargetH(val);
    if (lockAspect && origH > 0) {
      setTargetW(Math.round((val / origH) * origW));
    }
  }

  // ffmpeg scale: use -2 to keep divisible-by-2 constraint
  function buildScale() {
    if (lockAspect) {
      return `scale=${targetW}:-2`;
    }
    return `scale=${targetW}:${targetH}`;
  }

  async function handleRun() {
    if (!file || targetW === 0) return;
    setBusy(true);
    setProgress(0);
    setError("");
    setResultBlob(null);
    try {
      const { runFFmpeg } = await import("@/lib/ffmpeg");
      const blob = await runFFmpeg(
        ["-i", "INPUT", "-vf", buildScale(), "-c:a", "copy", "OUTPUT"],
        file,
        "output.mp4",
        "video/mp4",
        (p) => setProgress(Math.round(p.progress * 100))
      );
      setResultBlob(blob);
      setProgress(100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setResultBlob(null);
    setError("");
    setProgress(0);
    setOrigW(0);
    setOrigH(0);
    setTargetW(0);
    setTargetH(0);
  }

  if (!file) {
    return (
      <div className="flex flex-col gap-4">
        <BetaBanner />
        <DropZone accept="video/*" onFile={setFile} label="동영상 파일을 선택하세요" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <BetaBanner />
      <SizeWarning file={file} />
      {error && (
        <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>
      )}

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Preview */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="text-[13px] font-semibold mb-2">미리보기</div>
            <video
              src={URL.createObjectURL(file)}
              controls
              onLoadedMetadata={handleVideoLoaded}
              className="w-full rounded-[8px] max-h-[300px] object-contain bg-black"
            />
            {origW > 0 && (
              <div className="text-[12px] font-mono text-[var(--color-muted)] mt-2">
                원본 {origW}×{origH}
              </div>
            )}
          </div>
          {busy && <ProgressBar percent={progress} />}
        </div>

        {/* Controls */}
        <div className="w-full lg:w-56 flex flex-col gap-4">
          <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col gap-3">
            <div className="text-[13px] font-semibold">해상도</div>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-[var(--color-muted)]">너비 (px)</span>
              <input
                type="number"
                value={targetW}
                min={2}
                max={7680}
                step={2}
                onChange={(e) => onWidthChange(Number(e.target.value))}
                className="text-[13px] px-2 py-1.5 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)] w-full"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-[var(--color-muted)]">높이 (px)</span>
              <input
                type="number"
                value={targetH}
                min={2}
                max={7680}
                step={2}
                onChange={(e) => onHeightChange(Number(e.target.value))}
                disabled={lockAspect}
                className="text-[13px] px-2 py-1.5 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)] w-full disabled:opacity-50"
              />
            </label>

            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="text-[13px]">비율 고정</span>
              <div
                onClick={() => setLockAspect((v) => !v)}
                className={`w-8 h-5 rounded-full relative transition-colors shrink-0 ${lockAspect ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${lockAspect ? "translate-x-3" : "translate-x-0.5"}`} />
              </div>
            </label>
          </div>

          <Button variant="primary" onClick={handleRun} disabled={busy || targetW === 0} className="w-full">
            {busy ? "처리 중…" : "처리하기"}
          </Button>
          {resultBlob && (
            <Button variant="primary" onClick={() => downloadBlob(resultBlob, "resized.mp4")} className="w-full">
              <Download size={14} className="mr-1.5" /> 다운로드
            </Button>
          )}
          <Button variant="ghost" onClick={reset} className="w-full">
            <RotateCcw size={14} className="mr-1.5" /> 초기화
          </Button>
        </div>
      </div>
    </div>
  );
}
