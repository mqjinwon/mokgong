"use client";

import React, { useRef, useState } from "react";
import { Download, RotateCcw, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";
import { downloadBlob } from "@/lib/download";
import { loadPdfDoc, renderPdfPageToCanvas } from "@/lib/pdfUtils";

interface Props {
  initialFile?: File | null;
}

type ImageFormat = "png" | "jpeg";
type PageSelection = "all" | "range";

export function PdfToImageTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const initialized = useRef(false);

  const [format, setFormat] = useState<ImageFormat>("png");
  const [quality, setQuality] = useState(92);
  const [scale, setScale] = useState(2);
  const [pageSelection, setPageSelection] = useState<PageSelection>("all");
  const [rangeInput, setRangeInput] = useState("");

  React.useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (initialFile) loadFile(initialFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFile(f: File) {
    setError("");
    try {
      const { data, pageCount: pc } = await loadPdfDoc(f);
      setPdfData(data);
      setPageCount(pc);
      setFile(f);
      const thumbs: string[] = [];
      const count = Math.min(pc, 12);
      for (let i = 0; i < count; i++) {
        const canvas = await renderPdfPageToCanvas(data, i, 0.2);
        thumbs.push(canvas.toDataURL());
      }
      setThumbnails(thumbs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function parseRange(input: string, total: number): number[] {
    if (!input.trim()) return [];
    const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
    const pages: Set<number> = new Set();
    for (const part of parts) {
      if (part.includes("-")) {
        const [a, b] = part.split("-").map(Number);
        if (!a || !b || a < 1 || b > total || a > b)
          throw new Error(`잘못된 범위: ${part}`);
        for (let i = a; i <= b; i++) pages.add(i - 1);
      } else {
        const n = Number(part);
        if (!n || n < 1 || n > total) throw new Error(`잘못된 페이지: ${part}`);
        pages.add(n - 1);
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  }

  async function handleConvert() {
    if (!pdfData || !file) return;
    setBusy(true);
    setError("");
    setProgress(0);

    try {
      let pageIndices: number[];
      if (pageSelection === "all") {
        pageIndices = Array.from({ length: pageCount }, (_, i) => i);
      } else {
        pageIndices = parseRange(rangeInput, pageCount);
        if (pageIndices.length === 0) {
          throw new Error("범위를 입력해주세요. 예: 1-3, 5, 7-9");
        }
      }

      const mimeType = format === "png" ? "image/png" : "image/jpeg";
      const ext = format === "png" ? "png" : "jpg";
      const baseName = file.name.replace(/\.pdf$/i, "");

      if (pageIndices.length === 1) {
        const idx = pageIndices[0];
        setProgress(50);
        const canvas = await renderPdfPageToCanvas(pdfData, idx, scale);
        const dataUrl = canvas.toDataURL(mimeType, format === "jpeg" ? quality / 100 : undefined);
        const blob = await fetch(dataUrl).then((r) => r.blob());
        downloadBlob(blob, `${baseName}_page${idx + 1}.${ext}`);
        setProgress(100);
      } else {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();

        for (let i = 0; i < pageIndices.length; i++) {
          const idx = pageIndices[i];
          setProgress(Math.round(((i + 1) / pageIndices.length) * 90));
          const canvas = await renderPdfPageToCanvas(pdfData, idx, scale);
          const dataUrl = canvas.toDataURL(mimeType, format === "jpeg" ? quality / 100 : undefined);
          const base64 = dataUrl.split(",")[1];
          zip.file(`${baseName}_page${idx + 1}.${ext}`, base64, { base64: true });
        }

        setProgress(95);
        const zipBlob = await zip.generateAsync({ type: "blob" });
        downloadBlob(zipBlob, `${baseName}_images.zip`);
        setProgress(100);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setPdfData(null);
    setPageCount(0);
    setThumbnails([]);
    setError("");
    setProgress(0);
    setPageSelection("all");
    setRangeInput("");
  }

  const selectedCount =
    pageSelection === "all"
      ? pageCount
      : (() => {
          try {
            return parseRange(rangeInput, pageCount).length;
          } catch {
            return 0;
          }
        })();

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[13px]">
          {error}
        </div>
      )}

      {!file ? (
        <FileDrop
          accept={["application/pdf"]}
          onFiles={(files) => loadFile(files[0])}
          label="PDF 파일을 선택하세요"
          sublabel="클릭하거나 파일을 드래그하세요"
        />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Page thumbnails */}
          {thumbnails.length > 0 && (
            <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="text-[12px] font-mono text-[var(--color-muted)] mb-2">
                {pageCount}페이지
              </div>
              <div className="flex flex-wrap gap-2">
                {thumbnails.map((src, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`p${i + 1}`}
                      className="h-20 rounded border border-[var(--color-border)] object-contain bg-white"
                    />
                    <span className="text-[10px] font-mono text-[var(--color-muted)]">
                      {i + 1}
                    </span>
                  </div>
                ))}
                {pageCount > 12 && (
                  <div className="flex items-center text-[12px] text-[var(--color-muted)]">
                    +{pageCount - 12}…
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-5">
            {/* Options */}
            <div className="flex-1 flex flex-col gap-4">
              {/* Page selection */}
              <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="text-[13px] font-semibold mb-3">페이지 선택</div>
                <div className="flex flex-col gap-2">
                  {(
                    [
                      ["all", "전체 페이지"],
                      ["range", "범위 지정"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setPageSelection(val)}
                      className={`px-3 py-2 rounded-[6px] text-[13px] font-semibold border transition-all text-left ${
                        pageSelection === val
                          ? "bg-[var(--color-accent)] text-white border-transparent"
                          : "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-accent)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {pageSelection === "range" && (
                  <div className="mt-3">
                    <div className="text-[12px] font-mono text-[var(--color-muted)] mb-1">
                      범위 (예: 1-3, 5, 7-9)
                    </div>
                    <input
                      type="text"
                      value={rangeInput}
                      onChange={(e) => setRangeInput(e.target.value)}
                      placeholder="1-3, 5, 7-9"
                      className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>
                )}
              </div>

              {/* Format options */}
              <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="text-[13px] font-semibold mb-3">이미지 형식</div>
                <div className="flex gap-2">
                  {(
                    [
                      ["png", "PNG"],
                      ["jpeg", "JPEG"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setFormat(val)}
                      className={`flex-1 px-3 py-2 rounded-[6px] text-[13px] font-semibold border transition-all ${
                        format === val
                          ? "bg-[var(--color-accent)] text-white border-transparent"
                          : "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-accent)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {format === "jpeg" && (
                  <div className="mt-3">
                    <label className="text-[12px] font-mono text-[var(--color-muted)] block mb-1">
                      품질 {quality}%
                    </label>
                    <input
                      type="range"
                      min={40}
                      max={100}
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Scale options */}
              <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="text-[13px] font-semibold mb-3">해상도</div>
                <div className="flex flex-wrap gap-2">
                  {([1, 1.5, 2, 3] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setScale(s)}
                      className={`px-3 py-2 rounded-[6px] text-[13px] font-semibold border transition-all ${
                        scale === s
                          ? "bg-[var(--color-accent)] text-white border-transparent"
                          : "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-accent)]"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-[var(--color-muted)] mt-2">
                  {scale === 1 && "72 DPI (웹용)"}
                  {scale === 1.5 && "108 DPI (일반용)"}
                  {scale === 2 && "144 DPI (고화질)"}
                  {scale === 3 && "216 DPI (인쇄용)"}
                </div>
              </div>

              {/* Progress */}
              {busy && (
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[12px] text-[var(--color-muted)] font-mono">
                    <span>변환 중…</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="w-full lg:w-56 flex flex-col gap-4">
              {/* Result preview */}
              <div className="p-4 rounded-[12px] bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/20">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon size={16} className="text-[var(--color-accent)]" />
                  <span className="font-semibold text-[14px]">결과</span>
                </div>
                <div className="text-[13px] text-[var(--color-muted)]">
                  {selectedCount}개 이미지 ({format.toUpperCase()})
                  {selectedCount > 1 && " → ZIP"}
                </div>
              </div>

              <Button
                variant="primary"
                onClick={handleConvert}
                disabled={busy || selectedCount === 0}
                className="w-full"
              >
                <Download size={14} className="mr-1.5" />
                {busy ? "변환 중…" : "다운로드"}
              </Button>
              <Button variant="ghost" onClick={reset} className="w-full">
                <RotateCcw size={14} className="mr-1.5" /> 초기화
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
