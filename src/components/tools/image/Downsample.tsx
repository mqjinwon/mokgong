"use client";

import React, { useState, useEffect } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";
import { loadImage, canvasToBlob } from "@/lib/imageUtils";
import { downloadBlob } from "@/lib/download";

interface Props {
  initialFile?: File | null;
}

type Mode = "percent" | "maxedge";
const PERCENTS = [75, 50, 25, 10];

export function DownsampleTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<Mode>("percent");
  const [percent, setPercent] = useState(50);
  const [maxEdge, setMaxEdge] = useState(1280);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) return;
    loadImage(file).then((i) => { setImg(i); setError(""); }).catch((e: Error) => setError(e.message));
  }, [file]);

  function getTargetDims(): [number, number] {
    if (!img) return [0, 0];
    if (mode === "percent") {
      return [Math.round(img.width * percent / 100), Math.round(img.height * percent / 100)];
    }
    const s = Math.min(1, maxEdge / Math.max(img.width, img.height));
    return [Math.round(img.width * s), Math.round(img.height * s)];
  }

  async function handleDownload() {
    if (!img) return;
    const [tw, th] = getTargetDims();
    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, tw, th);
    const blob = await canvasToBlob(canvas, "image/png");
    downloadBlob(blob, `downsampled_${tw}x${th}.png`);
  }

  function reset() { setFile(null); setImg(null); setError(""); }

  const [tw, th] = getTargetDims();

  return (
    <div className="flex flex-col gap-5">
      {error && <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>}
      {!file ? (
        <FileDrop
          accept={["image/*"]}
          onFiles={(files) => setFile(files[0])}
          label="이미지를 선택하세요"
          sublabel="클릭하거나 파일을 드래그하세요"
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-5">
          <div className="flex-1 bg-[var(--color-surface-alt)] rounded-[12px] flex items-center justify-center p-4 min-h-[200px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {img && <img src={img.src} alt="preview" className="max-w-full max-h-[360px] rounded object-contain" />}
          </div>
          <div className="w-full lg:w-64 flex flex-col gap-4">
            <div className="flex gap-1.5">
              {([["percent", "비율 %"], ["maxedge", "최대 px"]] as [Mode, string][]).map(([m, l]) => (
                <button key={m} onClick={() => setMode(m)} className={`flex-1 py-1.5 rounded-[6px] text-[13px] font-semibold border transition-all ${mode === m ? "bg-[var(--color-accent)] text-white border-transparent" : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-fg)]"}`}>{l}</button>
              ))}
            </div>
            {mode === "percent" ? (
              <div>
                <div className="text-[12px] font-mono text-[var(--color-muted)] mb-2">배율 선택</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {PERCENTS.map((p) => (
                    <button key={p} onClick={() => setPercent(p)} className={`py-1.5 rounded-[6px] text-[13px] font-semibold border transition-all ${percent === p ? "bg-[var(--color-accent)] text-white border-transparent" : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-accent)]"}`}>{p}%</button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="text-[12px] font-mono text-[var(--color-muted)] block mb-1">최대 엣지 (px)</label>
                <input type="number" value={maxEdge} onChange={(e) => setMaxEdge(Number(e.target.value))} className="w-full border border-[var(--color-border)] rounded-[8px] px-3 py-2 text-[14px] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-accent)]" />
              </div>
            )}
            {img && <div className="text-[12px] text-[var(--color-muted)]">원본: {img.width}×{img.height} → {tw}×{th} px</div>}
            <Button variant="primary" onClick={handleDownload} className="w-full"><Download size={14} className="mr-1.5" /> 다운로드</Button>
            <Button variant="ghost" onClick={reset} className="w-full"><RotateCcw size={14} className="mr-1.5" /> 초기화</Button>
          </div>
        </div>
      )}
    </div>
  );
}
