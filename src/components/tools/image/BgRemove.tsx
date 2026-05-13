"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { FileDrop } from "@/components/ui/FileDrop";
import { loadImage, canvasToBlob } from "@/lib/imageUtils";
import { downloadBlob } from "@/lib/download";

interface Props {
  initialFile?: File | null;
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

export function BgRemoveTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [tolerance, setTolerance] = useState(30);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  useEffect(() => {
    if (!file) return;
    loadImage(file).then((i) => { setImg(i); setError(""); setResultUrl(null); setResultBlob(null); }).catch((e: Error) => setError(e.message));
  }, [file]);

  const removeBackground = useCallback(async () => {
    if (!img) return;
    setProcessing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data, width } = imageData;

      // Sample corner colors
      const corners = [
        [data[0], data[1], data[2]],
        [data[(width - 1) * 4], data[(width - 1) * 4 + 1], data[(width - 1) * 4 + 2]],
        [data[(canvas.height - 1) * width * 4], data[(canvas.height - 1) * width * 4 + 1], data[(canvas.height - 1) * width * 4 + 2]],
        [data[((canvas.height - 1) * width + width - 1) * 4], data[((canvas.height - 1) * width + width - 1) * 4 + 1], data[((canvas.height - 1) * width + width - 1) * 4 + 2]],
      ] as [number, number, number][];

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const isBackground = corners.some(([cr, cg, cb]) => colorDistance(r, g, b, cr, cg, cb) < tolerance);
        if (isBackground) data[i + 3] = 0;
      }

      ctx.putImageData(imageData, 0, 0);
      const blob = await canvasToBlob(canvas, "image/png");
      setResultBlob(blob);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing(false);
    }
  }, [img, tolerance, resultUrl]);

  function handleDownload() {
    if (!resultBlob) return;
    downloadBlob(resultBlob, "bg-removed.png");
  }

  function reset() {
    setFile(null); setImg(null); setResultUrl(null); setResultBlob(null); setError("");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="p-3 rounded-[8px] bg-[var(--color-accent-soft)] border border-[var(--color-accent)] text-[13px] text-[var(--color-accent-ink)] flex items-start gap-2">
        <Chip tone="beta">BETA</Chip>
        <span>현재는 단색 배경만 제거됩니다. 정교한 AI 분리는 곧 추가됩니다.</span>
      </div>
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
          <div className="flex-1 bg-[repeating-conic-gradient(#ccc_0%_25%,white_0%_50%)] bg-[length:20px_20px] rounded-[12px] flex items-center justify-center p-4 min-h-[200px]">
            {(resultUrl ?? (img?.src)) && (
              <img src={resultUrl ?? img!.src} alt="preview" className="max-w-full max-h-[360px] rounded object-contain" />
            )}
          </div>
          <div className="w-full lg:w-64 flex flex-col gap-4">
            <div>
              <label className="text-[12px] font-mono text-[var(--color-muted)] block mb-1">허용 오차 (tolerance) {tolerance}</label>
              <input type="range" min={5} max={100} value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} className="w-full" />
              <div className="text-[11px] text-[var(--color-muted)] mt-1">모서리 픽셀 색상과의 거리가 이 값보다 작으면 제거</div>
            </div>
            {!resultUrl ? (
              <Button variant="primary" onClick={removeBackground} disabled={processing} className="w-full">
                {processing ? "처리 중…" : "배경 제거"}
              </Button>
            ) : (
              <>
                <Button variant="primary" onClick={handleDownload} className="w-full"><Download size={14} className="mr-1.5" /> PNG 다운로드</Button>
                <Button variant="outline" onClick={removeBackground} disabled={processing} className="w-full">다시 적용</Button>
              </>
            )}
            <Button variant="ghost" onClick={reset} className="w-full"><RotateCcw size={14} className="mr-1.5" /> 초기화</Button>
          </div>
        </div>
      )}
    </div>
  );
}
