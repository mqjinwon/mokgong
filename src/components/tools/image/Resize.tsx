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

type Unit = "px" | "%";

const ASPECT_PRESETS = [
  { label: "원본", ratio: null },
  { label: "1:1", ratio: 1 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "3:2", ratio: 3 / 2 },
  { label: "9:16", ratio: 9 / 16 },
] as const;

export function ResizeTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState<Unit>("px");
  const [lockAspect, setLockAspect] = useState(true);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  useEffect(() => {
    if (!file) return;
    loadImage(file).then((i) => {
      setImg(i);
      setWidth(String(i.width));
      setHeight(String(i.height));
      setError("");
    }).catch((e: Error) => setError(e.message));
  }, [file]);

  function onWidthChange(v: string) {
    setWidth(v);
    if (!img || !lockAspect) return;
    const n = parseFloat(v);
    if (isNaN(n)) return;
    if (unit === "px") setHeight(String(Math.round(n * img.height / img.width)));
    else setHeight(v);
  }

  function onHeightChange(v: string) {
    setHeight(v);
    if (!img || !lockAspect) return;
    const n = parseFloat(v);
    if (isNaN(n)) return;
    if (unit === "px") setWidth(String(Math.round(n * img.width / img.height)));
    else setWidth(v);
  }

  function switchUnit(u: Unit) {
    if (!img) { setUnit(u); return; }
    if (u === "%" && unit === "px") {
      setWidth(String(Math.round(parseFloat(width) / img.width * 100)));
      setHeight(String(Math.round(parseFloat(height) / img.height * 100)));
    } else if (u === "px" && unit === "%") {
      setWidth(String(Math.round(parseFloat(width) / 100 * img.width)));
      setHeight(String(Math.round(parseFloat(height) / 100 * img.height)));
    }
    setUnit(u);
  }

  async function handleResize() {
    if (!img || !file) return;
    let tw = parseFloat(width);
    let th = parseFloat(height);
    if (unit === "%") { tw = img.width * tw / 100; th = img.height * th / 100; }
    if (isNaN(tw) || isNaN(th) || tw <= 0 || th <= 0) { setError("올바른 크기를 입력하세요."); return; }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(tw);
    canvas.height = Math.round(th);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await canvasToBlob(canvas, "image/png");
    const baseName = file.name.replace(/\.[^.]+$/, "");
    downloadBlob(blob, `${baseName}_${Math.round(tw)}x${Math.round(th)}.png`);
  }

  function reset() {
    setFile(null);
    setImg(null);
    setError("");
    setWidth("");
    setHeight("");
  }

  const previewSrc = img?.src ?? "";

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
          <div className="flex-1 bg-[var(--color-surface-alt)] rounded-[12px] overflow-hidden flex items-center justify-center p-4 min-h-[200px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {previewSrc && <img src={previewSrc} alt="preview" className="max-w-full max-h-[360px] rounded object-contain" />}
          </div>
          <div className="w-full lg:w-64 flex flex-col gap-4">
            <div className="flex gap-1.5">
              {(["px", "%"] as Unit[]).map((u) => (
                <button key={u} onClick={() => switchUnit(u)} className={`flex-1 py-1.5 rounded-[6px] text-[13px] font-semibold border transition-all ${unit === u ? "bg-[var(--color-accent)] text-white border-transparent" : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-fg)]"}`}>{u}</button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-mono text-[var(--color-muted)]">Width</label>
              <input type="number" value={width} onChange={(e) => onWidthChange(e.target.value)} className="border border-[var(--color-border)] rounded-[8px] px-3 py-2 text-[14px] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-accent)]" />
              <label className="text-[12px] font-mono text-[var(--color-muted)]">Height</label>
              <input type="number" value={height} onChange={(e) => onHeightChange(e.target.value)} className="border border-[var(--color-border)] rounded-[8px] px-3 py-2 text-[14px] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-accent)]" />
            </div>
            <label className="flex items-center gap-2 text-[13px] cursor-pointer select-none">
              <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} className="w-4 h-4" />
              비율 유지
            </label>
            {/* Aspect ratio presets */}
            <div className="flex flex-col gap-1.5">
              <div className="text-[12px] font-mono text-[var(--color-muted)]">비율 프리셋</div>
              <div className="flex flex-wrap gap-1.5">
                {ASPECT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      if (!img) return;
                      if (preset.ratio === null) {
                        setWidth(String(img.width));
                        setHeight(String(img.height));
                        setUnit("px");
                      } else {
                        const curW = parseFloat(width) || img.width;
                        const newH = Math.round(curW / preset.ratio);
                        setHeight(String(newH));
                        setLockAspect(false);
                        setUnit("px");
                      }
                    }}
                    className="px-2 py-1 rounded-[4px] text-[11px] font-medium border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            {img && (
              <div className="text-[12px] text-[var(--color-muted)]">
                원본: {img.width} × {img.height} px
              </div>
            )}
            <Button variant="primary" onClick={handleResize} className="w-full"><Download size={14} className="mr-1.5" /> 다운로드</Button>
            <Button variant="ghost" onClick={reset} className="w-full"><RotateCcw size={14} className="mr-1.5" /> 초기화</Button>
          </div>
        </div>
      )}
    </div>
  );
}
