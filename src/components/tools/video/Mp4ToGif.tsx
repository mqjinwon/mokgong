"use client";

import React, { useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadBlob } from "@/lib/download";
import { BetaBanner, SizeWarning, ProgressBar, DropZone } from "./shared";

interface Props {
  initialFile?: File | null;
}

export function Mp4ToGifTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(() => initialFile ?? null);
  const [fps, setFps] = useState<10 | 15 | 24>(15);
  const [width, setWidth] = useState(480);
  const [startSec, setStartSec] = useState(0);
  const [duration, setDuration] = useState(5);
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
      const paletteFilter = `fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse`;
      const blob = await runFFmpeg(
        [
          "-ss", String(startSec),
          "-t", String(duration),
          "-i", "INPUT",
          "-vf", paletteFilter,
          "-loop", "0",
          "OUTPUT",
        ],
        file,
        "output.gif",
        "image/gif",
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
        <DropZone accept="video/*" onFile={setFile} label="MP4 파일을 선택하세요" />
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

          {resultBlob && (
            <div className="p-4 rounded-[12px] bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/20">
              <div className="font-semibold text-[14px] mb-2">결과 GIF</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(resultBlob)} alt="result gif" className="w-full rounded-[8px] max-h-[300px] object-contain" />
            </div>
          )}

          {busy && <ProgressBar percent={progress} />}
        </div>

        {/* Controls */}
        <div className="w-full lg:w-56 flex flex-col gap-4">
          <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col gap-3">
            <div className="text-[13px] font-semibold">옵션</div>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-[var(--color-muted)]">FPS</span>
              <select
                value={fps}
                onChange={(e) => setFps(Number(e.target.value) as 10 | 15 | 24)}
                className="text-[13px] px-2 py-1.5 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)]"
              >
                <option value={10}>10fps</option>
                <option value={15}>15fps</option>
                <option value={24}>24fps</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-[var(--color-muted)]">너비 (px)</span>
              <input
                type="number"
                value={width}
                min={100}
                max={1920}
                step={10}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="text-[13px] px-2 py-1.5 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)] w-full"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-[var(--color-muted)]">시작 (초)</span>
              <input
                type="number"
                value={startSec}
                min={0}
                step={0.5}
                onChange={(e) => setStartSec(Number(e.target.value))}
                className="text-[13px] px-2 py-1.5 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)] w-full"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-[var(--color-muted)]">길이 (초)</span>
              <input
                type="number"
                value={duration}
                min={1}
                max={60}
                step={0.5}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="text-[13px] px-2 py-1.5 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)] w-full"
              />
            </label>
          </div>

          <Button variant="primary" onClick={handleRun} disabled={busy} className="w-full">
            {busy ? "처리 중…" : "처리하기"}
          </Button>
          {resultBlob && file && (
            <Button variant="primary" onClick={() => {
              const baseName = file.name.replace(/\.[^.]+$/, "");
              downloadBlob(resultBlob, `${baseName}.gif`);
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
