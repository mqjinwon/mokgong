"use client";

import React, { useState } from "react";
import { Download, RotateCcw, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadBlob } from "@/lib/download";
import { BetaBanner, SizeWarning, ProgressBar, DropZone } from "./shared";

interface Props {
  initialFile?: File | null;
}

export function MuteTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(() => initialFile ?? null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");

  async function handleRun() {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setError("");
    setResultBlob(null);
    try {
      const { runFFmpeg } = await import("@/lib/ffmpeg");
      const blob = await runFFmpeg(
        ["-i", "INPUT", "-c:v", "copy", "-an", "OUTPUT"],
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
              className="w-full rounded-[8px] max-h-[300px] object-contain bg-black"
            />
            <div className="text-[12px] font-mono text-[var(--color-muted)] mt-2">{file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB</div>
          </div>
          {busy && <ProgressBar percent={progress} />}

          {resultBlob && (
            <div className="p-4 rounded-[12px] bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/20">
              <div className="font-semibold text-[14px] mb-2">결과 (음소거됨)</div>
              <video
                src={URL.createObjectURL(resultBlob)}
                controls
                muted
                className="w-full rounded-[8px] max-h-[200px] object-contain bg-black"
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="w-full lg:w-56 flex flex-col gap-4">
          <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="text-[13px] font-semibold mb-2">오디오 제거</div>
            <p className="text-[12px] text-[var(--color-muted)] leading-[1.5]">
              비디오 스트림은 그대로 복사, 오디오 트랙만 제거합니다. 빠르게 처리됩니다.
            </p>
          </div>

          <Button variant="primary" onClick={handleRun} disabled={busy} className="w-full">
            <VolumeX size={14} className="mr-1.5" /> {busy ? "처리 중…" : "처리하기"}
          </Button>
          {resultBlob && file && (
            <Button variant="primary" onClick={() => {
              const baseName = file.name.replace(/\.[^.]+$/, "");
              downloadBlob(resultBlob, `${baseName}_muted.mp4`);
            }} className="w-full">
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
