"use client";

import React, { useRef, useState, useEffect } from "react";
import { Download, RotateCcw } from "lucide-react";
import imageCompression from "browser-image-compression";
import { Button } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";
import { downloadBlob } from "@/lib/download";

interface Props {
  initialFile?: File | null;
}

type OutputType = "image/jpeg" | "image/png" | "image/webp";

function fmt(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function CompressTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [quality, setQuality] = useState(0.8);
  const [maxDim, setMaxDim] = useState(3840);
  const [outputType, setOutputType] = useState<OutputType>("image/jpeg");
  const [result, setResult] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const previewUrl = useRef<string>("");

  useEffect(() => {
    if (!file) return;
    setResult(null);
  }, [file]);

  async function handleCompress() {
    if (!file) return;
    setProcessing(true);
    setError("");
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 999,
        maxWidthOrHeight: maxDim,
        useWebWorker: true,
        initialQuality: quality,
        fileType: outputType,
      });
      setResult(compressed);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  function handleDownload() {
    if (!result) return;
    const ext = outputType.split("/")[1];
    downloadBlob(result, `compressed.${ext}`);
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError("");
  }

  const previewFile = result ?? file;
  if (previewFile && previewUrl.current) URL.revokeObjectURL(previewUrl.current);
  if (previewFile) previewUrl.current = URL.createObjectURL(previewFile);

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
            {previewFile && <img src={URL.createObjectURL(previewFile)} alt="preview" className="max-w-full max-h-[360px] rounded object-contain" />}
          </div>
          <div className="w-full lg:w-64 flex flex-col gap-4">
            {file && (
              <div className="p-3 rounded-[8px] bg-[var(--color-surface-alt)] text-[13px] space-y-1">
                <div className="flex justify-between"><span className="text-[var(--color-muted)]">원본</span><span className="font-mono">{fmt(file.size)}</span></div>
                {result && <div className="flex justify-between"><span className="text-[var(--color-muted)]">압축 후</span><span className="font-mono text-green-600">{fmt(result.size)}</span></div>}
                {result && <div className="flex justify-between"><span className="text-[var(--color-muted)]">절감</span><span className="font-mono text-green-600">{Math.round((1 - result.size / file.size) * 100)}%</span></div>}
              </div>
            )}
            <div>
              <label className="text-[12px] font-mono text-[var(--color-muted)] block mb-1">품질 {Math.round(quality * 100)}%</label>
              <input type="range" min={40} max={95} value={Math.round(quality * 100)} onChange={(e) => setQuality(Number(e.target.value) / 100)} className="w-full" />
            </div>
            <div>
              <label className="text-[12px] font-mono text-[var(--color-muted)] block mb-1">최대 크기</label>
              <select value={maxDim} onChange={(e) => setMaxDim(Number(e.target.value))} className="w-full border border-[var(--color-border)] rounded-[8px] px-3 py-2 text-[13px] bg-[var(--color-surface)]">
                {[800, 1280, 1920, 2560, 3840].map((v) => <option key={v} value={v}>{v}px</option>)}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-mono text-[var(--color-muted)] block mb-1">출력 형식</label>
              <select value={outputType} onChange={(e) => setOutputType(e.target.value as OutputType)} className="w-full border border-[var(--color-border)] rounded-[8px] px-3 py-2 text-[13px] bg-[var(--color-surface)]">
                <option value="image/jpeg">JPEG</option>
                <option value="image/png">PNG</option>
                <option value="image/webp">WebP</option>
              </select>
            </div>
            {!result ? (
              <Button variant="primary" onClick={handleCompress} disabled={processing} className="w-full">
                {processing ? "처리 중…" : "압축 시작"}
              </Button>
            ) : (
              <Button variant="primary" onClick={handleDownload} className="w-full"><Download size={14} className="mr-1.5" /> 다운로드</Button>
            )}
            <Button variant="ghost" onClick={reset} className="w-full"><RotateCcw size={14} className="mr-1.5" /> 초기화</Button>
          </div>
        </div>
      )}
    </div>
  );
}
