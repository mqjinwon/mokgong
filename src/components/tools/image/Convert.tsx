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

type TargetFormat = "image/png" | "image/jpeg" | "image/webp";
const FORMATS: { label: string; value: TargetFormat; ext: string }[] = [
  { label: "PNG", value: "image/png", ext: "png" },
  { label: "JPEG", value: "image/jpeg", ext: "jpg" },
  { label: "WebP", value: "image/webp", ext: "webp" },
];

export function ConvertTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [target, setTarget] = useState<TargetFormat>("image/png");
  const [quality, setQuality] = useState(0.92);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) return;
    loadImage(file).then((i) => { setImg(i); setError(""); }).catch((e: Error) => setError(e.message));
  }, [file]);

  async function handleConvert() {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    if (target === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    const blob = await canvasToBlob(canvas, target, quality);
    const ext = FORMATS.find((f) => f.value === target)!.ext;
    const base = file!.name.replace(/\.[^.]+$/, "");
    downloadBlob(blob, `${base}.${ext}`);
  }

  function reset() { setFile(null); setImg(null); setError(""); }

  return (
    <div className="flex flex-col gap-5">
      {error && <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>}

      {!file ? (
        <FileDrop
          accept={["image/png", "image/jpeg", "image/webp"]}
          onFiles={(files) => setFile(files[0])}
          label="이미지를 선택하세요"
          sublabel="클릭하거나 파일을 드래그하세요"
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-5">
          <div className="flex-1 bg-[var(--color-surface-alt)] rounded-[12px] flex items-center justify-center p-4 min-h-[200px]">
            {img && <img src={img.src} alt="preview" className="max-w-full max-h-[360px] rounded object-contain" />}
          </div>
          <div className="w-full lg:w-64 flex flex-col gap-4">
            <div>
              <div className="text-[12px] font-mono text-[var(--color-muted)] mb-2">변환 형식</div>
              <div className="flex flex-col gap-1.5">
                {FORMATS.map((f) => (
                  <button key={f.value} onClick={() => setTarget(f.value)} className={`px-3 py-2 rounded-[8px] text-[13px] font-semibold border text-left transition-all ${target === f.value ? "bg-[var(--color-accent)] text-white border-transparent" : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-accent)]"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            {(target === "image/jpeg" || target === "image/webp") && (
              <div>
                <label className="text-[12px] font-mono text-[var(--color-muted)] block mb-1">품질 {Math.round(quality * 100)}%</label>
                <input type="range" min={40} max={100} value={Math.round(quality * 100)} onChange={(e) => setQuality(Number(e.target.value) / 100)} className="w-full" />
              </div>
            )}
            <Button variant="primary" onClick={handleConvert} className="w-full"><Download size={14} className="mr-1.5" /> 변환 & 다운로드</Button>
            <Button variant="ghost" onClick={reset} className="w-full"><RotateCcw size={14} className="mr-1.5" /> 초기화</Button>
          </div>
        </div>
      )}
    </div>
  );
}
