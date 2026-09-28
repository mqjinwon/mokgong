"use client";

import React, { useState, useRef, useMemo } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadBlob } from "@/lib/download";
import { RemuxBetaBanner, RemuxSizeWarning, ProgressBar, DropZone } from "./shared";
import { canAttemptRemux } from "@/lib/video/remux";

interface Props {
  initialFile?: File | null;
}

export function TrimTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(() => initialFile ?? null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [usedMethod, setUsedMethod] = useState<"remux" | "ffmpeg-copy" | "ffmpeg-encode" | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isRemuxCapable = useMemo(() => file ? canAttemptRemux(file) : false, [file]);

  function handleVideoLoaded() {
    const v = videoRef.current;
    if (!v) return;
    setVideoDuration(v.duration);
    setEndSec(v.duration);
  }

  async function handleRun() {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setError("");
    setResultBlob(null);
    setUsedMethod(null);

    try {
      if (isRemuxCapable) {
        try {
          const { remuxTrim } = await import("@/lib/video/remux");
          const result = await remuxTrim(file, {
            startSec,
            endSec,
            onProgress: (p) => setProgress(Math.round(p * 100)),
          });
          setResultBlob(result.blob);
          setUsedMethod("remux");
          setProgress(100);
          return;
        } catch (remuxError) {
          console.warn("Remux trim failed, falling back to FFmpeg:", remuxError);
          setProgress(0);
        }
      }

      const { runFFmpeg } = await import("@/lib/ffmpeg");
      try {
        const blob = await runFFmpeg(
          ["-ss", String(startSec), "-to", String(endSec), "-i", "INPUT", "-c", "copy", "OUTPUT"],
          file,
          "output.mp4",
          "video/mp4",
          (p) => setProgress(Math.round(p.progress * 100))
        );
        setResultBlob(blob);
        setUsedMethod("ffmpeg-copy");
        setProgress(100);
      } catch {
        const blob = await runFFmpeg(
          ["-ss", String(startSec), "-to", String(endSec), "-i", "INPUT", "OUTPUT"],
          file,
          "output.mp4",
          "video/mp4",
          (p) => setProgress(Math.round(p.progress * 100))
        );
        setResultBlob(blob);
        setUsedMethod("ffmpeg-encode");
        setProgress(100);
      }
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
    setStartSec(0);
    setEndSec(0);
    setVideoDuration(0);
  }

  const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toFixed(1).padStart(4, "0");
    return `${m}:${sec}`;
  };

  const getMethodLabel = () => {
    switch (usedMethod) {
      case "remux":
        return "스트리밍 처리";
      case "ffmpeg-copy":
        return "FFmpeg (스트림 복사)";
      case "ffmpeg-encode":
        return "FFmpeg (재인코딩)";
      default:
        return null;
    }
  };

  if (!file) {
    return (
      <div className="flex flex-col gap-4">
        <RemuxBetaBanner isRemuxCapable={false} toolType="trim" />
        <DropZone accept="video/*" onFile={setFile} label="동영상 파일을 선택하세요" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <RemuxBetaBanner isRemuxCapable={isRemuxCapable} toolType="trim" />
      <RemuxSizeWarning file={file} isRemuxCapable={isRemuxCapable} />
      {error && (
        <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>
      )}

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Preview */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="text-[13px] font-semibold mb-2">미리보기</div>
            <video
              ref={videoRef}
              src={URL.createObjectURL(file)}
              controls
              onLoadedMetadata={handleVideoLoaded}
              className="w-full rounded-[8px] max-h-[300px] object-contain bg-black"
            />
            <div className="text-[12px] font-mono text-[var(--color-muted)] mt-2">{file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB</div>
          </div>

          {busy && <ProgressBar percent={progress} />}
        </div>

        {/* Controls */}
        <div className="w-full lg:w-56 flex flex-col gap-4">
          <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col gap-3">
            <div className="text-[13px] font-semibold">구간 설정</div>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-[var(--color-muted)]">시작 {fmt(startSec)}</span>
              <input
                type="range"
                min={0}
                max={videoDuration}
                step={0.1}
                value={startSec}
                onChange={(e) => setStartSec(Math.min(Number(e.target.value), endSec - 0.1))}
                className="w-full"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-[var(--color-muted)]">끝 {fmt(endSec)}</span>
              <input
                type="range"
                min={0}
                max={videoDuration}
                step={0.1}
                value={endSec}
                onChange={(e) => setEndSec(Math.max(Number(e.target.value), startSec + 0.1))}
                className="w-full"
              />
            </label>

            <div className="text-[12px] font-mono text-[var(--color-muted)]">
              길이: {fmt(endSec - startSec)}
            </div>
          </div>

          <Button variant="primary" onClick={handleRun} disabled={busy || videoDuration === 0} className="w-full">
            {busy ? "처리 중…" : "처리하기"}
          </Button>
          {resultBlob && file && (
            <div className="flex flex-col gap-2">
              {usedMethod && (
                <div className="text-[11px] text-center text-[var(--color-muted)]">
                  {getMethodLabel()}
                </div>
              )}
              <Button variant="primary" onClick={() => {
                const baseName = file.name.replace(/\.[^.]+$/, "");
                downloadBlob(resultBlob, `${baseName}_trimmed.mp4`);
              }} className="w-full">
                <Download size={14} className="mr-1.5" /> 다운로드
              </Button>
            </div>
          )}
          <Button variant="ghost" onClick={reset} className="w-full">
            <RotateCcw size={14} className="mr-1.5" /> 초기화
          </Button>
        </div>
      </div>
    </div>
  );
}
