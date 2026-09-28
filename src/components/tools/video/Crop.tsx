"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadBlob } from "@/lib/download";
import { BetaBanner, SizeWarning, ProgressBar, DropZone } from "./shared";
import { useDraggableRegion, CropHandles } from "@/hooks/useDraggableRegion";

interface Props {
  initialFile?: File | null;
}

export function CropTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(() => initialFile ?? null);
  const [videoSize, setVideoSize] = useState({ w: 0, h: 0 });
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState("crosshair");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  const {
    rect,
    setRect,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    getCursor,
  } = useDraggableRegion({
    bounds: canvasSize,
    aspectRatio: null,
    minSize: 10,
  });

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || canvasSize.w === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }, [canvasSize]);

  useEffect(() => {
    drawFrame();
  }, [drawFrame, rect]);

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
    const cw = Math.min(vw, 600);
    const ch = Math.round((cw / vw) * vh);
    canvas.width = cw;
    canvas.height = ch;
    setCanvasSize({ w: cw, h: ch });
    setRect({ x: 0, y: 0, w: cw, h: ch });
    drawFrame();
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    handleMouseDown(px, py);
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    handleMouseMove(px, py);
    setCursor(getCursor(px, py));
  }

  function toVideoCoords() {
    if (canvasSize.w === 0) return { x: 0, y: 0, w: 0, h: 0 };
    const scaleX = videoSize.w / canvasSize.w;
    const scaleY = videoSize.h / canvasSize.h;
    return {
      x: Math.round(rect.x * scaleX),
      y: Math.round(rect.y * scaleY),
      w: Math.round(rect.w * scaleX),
      h: Math.round(rect.h * scaleY),
    };
  }

  async function handleRun() {
    const vc = toVideoCoords();
    if (!file || vc.w < 10 || vc.h < 10) return;
    setBusy(true);
    setProgress(0);
    setError("");
    setResultBlob(null);
    try {
      const { runFFmpeg } = await import("@/lib/ffmpeg");
      const blob = await runFFmpeg(
        ["-i", "INPUT", "-vf", `crop=${vc.w}:${vc.h}:${vc.x}:${vc.y}`, "-c:a", "copy", "OUTPUT"],
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
    setCanvasSize({ w: 0, h: 0 });
    setRect({ x: 0, y: 0, w: 0, h: 0 });
  }

  const vc = toVideoCoords();

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
              src={videoUrl ?? undefined}
              onLoadedMetadata={handleVideoLoaded}
              onSeeked={handleSeeked}
              className="hidden"
              preload="auto"
            />
            <div className="relative inline-block">
              <canvas
                ref={canvasRef}
                className="rounded-[8px] border border-[var(--color-border)]"
                style={{ cursor }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              {canvasSize.w > 0 && (
                <>
                  <div
                    className="absolute border-2 border-[var(--color-accent)] pointer-events-none"
                    style={{
                      left: rect.x,
                      top: rect.y,
                      width: rect.w,
                      height: rect.h,
                      boxShadow: `0 0 0 9999px rgba(0,0,0,0.35)`,
                    }}
                  />
                  <CropHandles rect={rect} />
                </>
              )}
            </div>
            {videoSize.w > 0 && (
              <div className="text-[12px] font-mono text-[var(--color-muted)] mt-2">
                원본 {videoSize.w}×{videoSize.h} · 크롭 {vc.w}×{vc.h} @ ({vc.x},{vc.y})
              </div>
            )}
            <div className="text-[11px] text-[var(--color-muted)] opacity-70 mt-1">
              드래그로 새 영역 그리기 · 영역 안 클릭+드래그로 이동
            </div>
          </div>
          {busy && <ProgressBar percent={progress} />}
        </div>

        {/* Controls */}
        <div className="w-full lg:w-56 flex flex-col gap-4">
          <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col gap-3">
            <div className="text-[13px] font-semibold">크롭 영역 (비디오 좌표)</div>
            <div className="grid grid-cols-2 gap-2">
              {(["x", "y", "w", "h"] as const).map((k) => (
                <label key={k} className="flex flex-col gap-1">
                  <span className="text-[12px] text-[var(--color-muted)]">{k.toUpperCase()}</span>
                  <input
                    type="number"
                    value={vc[k]}
                    min={0}
                    max={k === "x" || k === "w" ? videoSize.w : videoSize.h}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const scaleX = canvasSize.w / videoSize.w;
                      const scaleY = canvasSize.h / videoSize.h;
                      const canvasVal = k === "x" || k === "w" ? val * scaleX : val * scaleY;
                      setRect({ ...rect, [k]: canvasVal });
                    }}
                    className="text-[13px] px-2 py-1.5 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)] w-full"
                  />
                </label>
              ))}
            </div>
          </div>

          <Button variant="primary" onClick={handleRun} disabled={busy || vc.w < 10} className="w-full">
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
