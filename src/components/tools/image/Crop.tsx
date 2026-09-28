"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";
import { loadImage, canvasToBlob } from "@/lib/imageUtils";
import { downloadBlob } from "@/lib/download";

type AspectRatio = "free" | "1:1" | "4:3" | "16:9";

const RATIOS: { label: string; value: AspectRatio }[] = [
  { label: "Free", value: "free" },
  { label: "1:1", value: "1:1" },
  { label: "4:3", value: "4:3" },
  { label: "16:9", value: "16:9" },
];

interface Props {
  initialFile?: File | null;
}

export function CropTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [ratio, setRatio] = useState<AspectRatio>("free");
  const [error, setError] = useState("");
  const [rect, setRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [displayDimensions, setDisplayDimensions] = useState({ dw: 0, dh: 0, scale: 1 });

  const getScale = useCallback(() => {
    if (!img || !containerRef.current) return 1;
    const maxW = containerRef.current.clientWidth;
    const maxH = 400;
    return Math.min(1, maxW / img.width, maxH / img.height);
  }, [img]);

  useEffect(() => {
    if (!file) return;
    loadImage(file).then((i) => {
      setImg(i);
      setError("");
    }).catch((e: Error) => setError(e.message));
  }, [file]);

  useEffect(() => {
    if (!img || !containerRef.current) return;
    const maxW = containerRef.current.clientWidth;
    const maxH = 400;
    const scale = Math.min(1, maxW / img.width, maxH / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    setDisplayDimensions({ dw, dh, scale });
    setRect({ x: 0, y: 0, w: dw, h: dh });
  }, [img]);

  useEffect(() => {
    if (!img || !previewCanvasRef.current) return;
    const scale = getScale();
    const canvas = previewCanvasRef.current;
    const dw = img.width * scale;
    const dh = img.height * scale;
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, dw, dh);
  }, [img, getScale]);

  function applyRatio(newRatio: AspectRatio) {
    setRatio(newRatio);
    if (!img) return;
    const scale = getScale();
    const dw = img.width * scale;
    const dh = img.height * scale;
    if (newRatio === "free") {
      setRect({ x: 0, y: 0, w: dw, h: dh });
      return;
    }
    const [rw, rh] = newRatio.split(":").map(Number);
    const rRatio = rw / rh;
    let w = dw;
    let h = w / rRatio;
    if (h > dh) { h = dh; w = h * rRatio; }
    const x = (dw - w) / 2;
    const y = (dh - h) / 2;
    setRect({ x, y, w, h });
  }

  function onMouseDown(e: React.MouseEvent) {
    if (!containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    setDragStart({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
    setDragging(true);
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging || !img || !containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    const scale = getScale();
    const dw = img.width * scale;
    const dh = img.height * scale;
    const cx = e.clientX - bounds.left;
    const cy = e.clientY - bounds.top;
    let x = Math.min(dragStart.x, cx);
    let y = Math.min(dragStart.y, cy);
    let w = Math.abs(cx - dragStart.x);
    let h = Math.abs(cy - dragStart.y);
    if (ratio !== "free") {
      const [rw, rh] = ratio.split(":").map(Number);
      h = w / (rw / rh);
    }
    x = Math.max(0, Math.min(x, dw - w));
    y = Math.max(0, Math.min(y, dh - h));
    w = Math.min(w, dw - x);
    h = Math.min(h, dh - y);
    setRect({ x, y, w, h });
  }

  async function handleCrop() {
    if (!img || !file) return;
    const scale = getScale();
    const canvas = document.createElement("canvas");
    const sx = rect.x / scale;
    const sy = rect.y / scale;
    const sw = rect.w / scale;
    const sh = rect.h / scale;
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const blob = await canvasToBlob(canvas, "image/png");
    const baseName = file.name.replace(/\.[^.]+$/, "");
    downloadBlob(blob, `${baseName}_cropped.png`);
  }

  function reset() {
    setFile(null);
    setImg(null);
    setError("");
    setRatio("free");
  }

  const { dh, scale } = displayDimensions;

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>
      )}

      {!file ? (
        <FileDrop
          accept={["image/*"]}
          onFiles={(files) => setFile(files[0])}
          label="이미지를 선택하세요 (PNG, JPG, WebP)"
          sublabel="클릭하거나 파일을 드래그하세요"
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Preview */}
          <div
            ref={containerRef}
            className="relative flex-1 bg-[var(--color-surface-alt)] rounded-[12px] overflow-hidden cursor-crosshair select-none"
            style={{ minHeight: dh || 300 }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={() => setDragging(false)}
            onMouseLeave={() => setDragging(false)}
          >
            <canvas ref={previewCanvasRef} className="block" />
            {img && (
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
            )}
          </div>

          {/* Controls */}
          <div className="w-full lg:w-56 flex flex-col gap-4">
            <div>
              <div className="text-[12px] font-mono text-[var(--color-muted)] mb-2">비율</div>
              <div className="grid grid-cols-2 gap-1.5">
                {RATIOS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => applyRatio(r.value)}
                    className={`px-2 py-1.5 rounded-[6px] text-[13px] font-semibold border transition-all ${ratio === r.value ? "bg-[var(--color-accent)] text-white border-transparent" : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-accent)]"}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-[12px] text-[var(--color-muted)]">
              영역: {Math.round(rect.w / scale)} × {Math.round(rect.h / scale)} px
            </div>
            <Button variant="primary" onClick={handleCrop} className="w-full">
              <Download size={14} className="mr-1.5" /> 다운로드
            </Button>
            <Button variant="ghost" onClick={reset} className="w-full">
              <RotateCcw size={14} className="mr-1.5" /> 초기화
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
