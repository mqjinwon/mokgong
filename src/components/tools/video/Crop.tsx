"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadBlob } from "@/lib/download";
import { BetaBanner, SizeWarning, ProgressBar, DropZone } from "./shared";

interface Props {
  initialFile?: File | null;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function CropTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(() => initialFile ?? null);
  const [videoSize, setVideoSize] = useState({ w: 0, h: 0 });
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Draw crop rect
    ctx.strokeStyle = "#3B82F6";
    ctx.lineWidth = 2;
    const scaleX = canvas.width / videoSize.w;
    const scaleY = canvas.height / videoSize.h;
    ctx.strokeRect(rect.x * scaleX, rect.y * scaleY, rect.w * scaleX, rect.h * scaleY);
    ctx.fillStyle = "rgba(59,130,246,0.1)";
    ctx.fillRect(rect.x * scaleX, rect.y * scaleY, rect.w * scaleX, rect.h * scaleY);
  }, [rect, videoSize]);

  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  function handleVideoLoaded() {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0.1;
  }

  function handleSeeked() {
    const v = videoRef.current;
    const canvas = canvasRef.current;
    if (!v || !canvas) return;
    const vw = v.videoWidth;
    const vh = v.videoHeight;
    setVideoSize({ w: vw, h: vh });
    setRect({ x: 0, y: 0, w: vw, h: vh });
    canvas.width = Math.min(vw, 600);
    canvas.height = Math.round((canvas.width / vw) * vh);
    drawFrame();
  }

  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const scaleX = videoSize.w / canvas.width;
    const scaleY = videoSize.h / canvas.height;
    return {
      x: Math.round((e.clientX - r.left) * scaleX),
      y: Math.round((e.clientY - r.top) * scaleY),
    };
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const pos = getCanvasPos(e);
    setDragStart(pos);
    setRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
    setDragging(true);
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragging) return;
    const pos = getCanvasPos(e);
    setRect({
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      w: Math.abs(pos.x - dragStart.x),
      h: Math.abs(pos.y - dragStart.y),
    });
  }

  function onMouseUp() {
    setDragging(false);
  }

  async function handleRun() {
    if (!file || rect.w < 10 || rect.h < 10) return;
    setBusy(true);
    setProgress(0);
    setError("");
    setResultBlob(null);
    try {
      const { runFFmpeg } = await import("@/lib/ffmpeg");
      const blob = await runFFmpeg(
        ["-i", "INPUT", "-vf", `crop=${rect.w}:${rect.h}:${rect.x}:${rect.y}`, "-c:a", "copy", "OUTPUT"],
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
    setVideoSize({ w: 0, h: 0 });
    setRect({ x: 0, y: 0, w: 0, h: 0 });
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
        {/* Canvas preview */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="text-[13px] font-semibold mb-2">프레임에서 드래그로 크롭 영역 지정</div>
            {/* Hidden video for frame extraction */}
            <video
              ref={videoRef}
              src={URL.createObjectURL(file)}
              onLoadedMetadata={handleVideoLoaded}
              onSeeked={handleSeeked}
              className="hidden"
              crossOrigin="anonymous"
              preload="auto"
            />
            <canvas
              ref={canvasRef}
              className="w-full rounded-[8px] cursor-crosshair border border-[var(--color-border)]"
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            />
            {videoSize.w > 0 && (
              <div className="text-[12px] font-mono text-[var(--color-muted)] mt-2">
                원본 {videoSize.w}×{videoSize.h} · 크롭 {rect.w}×{rect.h} @ ({rect.x},{rect.y})
              </div>
            )}
          </div>
          {busy && <ProgressBar percent={progress} />}
        </div>

        {/* Controls */}
        <div className="w-full lg:w-56 flex flex-col gap-4">
          <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col gap-3">
            <div className="text-[13px] font-semibold">수동 입력</div>
            {(["x", "y", "w", "h"] as const).map((k) => (
              <label key={k} className="flex flex-col gap-1">
                <span className="text-[12px] text-[var(--color-muted)]">{k.toUpperCase()}</span>
                <input
                  type="number"
                  value={rect[k]}
                  min={0}
                  max={k === "x" || k === "w" ? videoSize.w : videoSize.h}
                  onChange={(e) => setRect((prev) => ({ ...prev, [k]: Number(e.target.value) }))}
                  className="text-[13px] px-2 py-1.5 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)] w-full"
                />
              </label>
            ))}
          </div>

          <Button variant="primary" onClick={handleRun} disabled={busy || rect.w < 10} className="w-full">
            {busy ? "처리 중…" : "처리하기"}
          </Button>
          {resultBlob && file && (
            <Button variant="primary" onClick={() => {
              const baseName = file.name.replace(/\.[^.]+$/, "");
              downloadBlob(resultBlob, `${baseName}_cropped.mp4`);
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
