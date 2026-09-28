"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";
import { loadImage, canvasToBlob } from "@/lib/imageUtils";
import { downloadBlob } from "@/lib/download";

interface Props {
  initialFile?: File | null;
}

type Position = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";
const POSITIONS: Position[] = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"];
const POS_LABEL: Record<Position, string> = { tl: "↖", tc: "↑", tr: "↗", ml: "←", mc: "●", mr: "→", bl: "↙", bc: "↓", br: "↘" };

function getPosCoords(pos: Position, cw: number, ch: number, tw: number, th: number, pad: number): [number, number] {
  const map: Record<Position, [number, number]> = {
    tl: [pad, pad + th], tc: [cw / 2 - tw / 2, pad + th], tr: [cw - pad - tw, pad + th],
    ml: [pad, ch / 2 + th / 2], mc: [cw / 2 - tw / 2, ch / 2 + th / 2], mr: [cw - pad - tw, ch / 2 + th / 2],
    bl: [pad, ch - pad], bc: [cw / 2 - tw / 2, ch - pad], br: [cw - pad - tw, ch - pad],
  };
  return map[pos];
}

export function WatermarkTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [text, setText] = useState("© Mokgong");
  const [position, setPosition] = useState<Position>("br");
  const [opacity, setOpacity] = useState(0.5);
  const [color, setColor] = useState("#ffffff");
  const [fontSize, setFontSize] = useState(32);
  const [error, setError] = useState("");
  const previewRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!file) return;
    loadImage(file).then((i) => { setImg(i); setError(""); }).catch((e: Error) => setError(e.message));
  }, [file]);

  const drawPreview = useCallback(() => {
    if (!img || !previewRef.current) return;
    const canvas = previewRef.current;
    const scale = Math.min(1, 600 / img.width, 400 / img.height);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const fs = fontSize * scale;
    ctx.font = `bold ${fs}px Pretendard, sans-serif`;
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    const tm = ctx.measureText(text);
    const [x, y] = getPosCoords(position, canvas.width, canvas.height, tm.width, fs, 16 * scale);
    ctx.fillText(text, x, y);
    ctx.globalAlpha = 1;
  }, [img, text, position, opacity, color, fontSize]);

  useEffect(() => { drawPreview(); }, [drawPreview]);

  async function handleDownload() {
    if (!img || !file) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    ctx.font = `bold ${fontSize}px Pretendard, sans-serif`;
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    const tm = ctx.measureText(text);
    const [x, y] = getPosCoords(position, canvas.width, canvas.height, tm.width, fontSize, 16);
    ctx.fillText(text, x, y);
    ctx.globalAlpha = 1;
    const blob = await canvasToBlob(canvas, "image/png");
    const baseName = file.name.replace(/\.[^.]+$/, "");
    downloadBlob(blob, `${baseName}_watermarked.png`);
  }

  function reset() { setFile(null); setImg(null); setError(""); }

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
          <div className="flex-1 bg-[var(--color-surface-alt)] rounded-[12px] flex items-center justify-center p-4 min-h-[200px] bg-[repeating-conic-gradient(#ccc_0%_25%,white_0%_50%)] bg-[length:20px_20px]">
            <canvas ref={previewRef} className="max-w-full max-h-[360px] rounded" />
          </div>
          <div className="w-full lg:w-64 flex flex-col gap-4">
            <div>
              <label className="text-[12px] font-mono text-[var(--color-muted)] block mb-1">텍스트</label>
              <input value={text} onChange={(e) => setText(e.target.value)} className="w-full border border-[var(--color-border)] rounded-[8px] px-3 py-2 text-[13px] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-accent)]" />
            </div>
            <div>
              <div className="text-[12px] font-mono text-[var(--color-muted)] mb-1.5">위치</div>
              <div className="grid grid-cols-3 gap-1">
                {POSITIONS.map((p) => (
                  <button key={p} onClick={() => setPosition(p)} className={`py-1.5 rounded-[6px] text-[13px] border transition-all ${position === p ? "bg-[var(--color-accent)] text-white border-transparent" : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent)]"}`}>
                    {POS_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[12px] font-mono text-[var(--color-muted)] block mb-1">불투명도 {Math.round(opacity * 100)}%</label>
              <input type="range" min={5} max={100} value={Math.round(opacity * 100)} onChange={(e) => setOpacity(Number(e.target.value) / 100)} className="w-full" />
            </div>
            <div>
              <label className="text-[12px] font-mono text-[var(--color-muted)] block mb-1">글자 크기 {fontSize}px</label>
              <input type="range" min={12} max={120} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="text-[12px] font-mono text-[var(--color-muted)] block mb-1">색상</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-9 rounded-[8px] border border-[var(--color-border)] cursor-pointer" />
            </div>
            <Button variant="primary" onClick={handleDownload} className="w-full"><Download size={14} className="mr-1.5" /> 다운로드</Button>
            <Button variant="ghost" onClick={reset} className="w-full"><RotateCcw size={14} className="mr-1.5" /> 초기화</Button>
          </div>
        </div>
      )}
    </div>
  );
}
