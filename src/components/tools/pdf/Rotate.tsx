"use client";

import React, { useRef, useState } from "react";
import { FileDrop } from "@/components/ui/FileDrop";
import { Download, RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadBlob } from "@/lib/download";
import { loadPdfDoc, renderPdfPageToCanvas } from "@/lib/pdfUtils";

interface Props {
  initialFile?: File | null;
}

export function RotateTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [rotations, setRotations] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const initialized = useRef(false);

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
      setRotations(Array(pc).fill(0));
      const thumbs: string[] = [];
      const count = Math.min(pc, 16);
      for (let i = 0; i < count; i++) {
        const canvas = await renderPdfPageToCanvas(data, i, 0.25);
        thumbs.push(canvas.toDataURL());
      }
      setThumbnails(thumbs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function rotate(index: number, delta: number) {
    setRotations((prev) => {
      const next = [...prev];
      next[index] = ((next[index] + delta) % 360 + 360) % 360;
      return next;
    });
  }

  function rotateAll(delta: number) {
    setRotations((prev) => prev.map((r) => ((r + delta) % 360 + 360) % 360));
  }

  async function handleSave() {
    if (!pdfData || !file) return;
    setBusy(true);
    setError("");
    try {
      const { PDFDocument, degrees } = await import("pdf-lib");
      const doc = await PDFDocument.load(pdfData);
      const pages = doc.getPages();
      pages.forEach((page, i) => {
        if (rotations[i]) {
          const current = page.getRotation().angle;
          page.setRotation(degrees((current + rotations[i]) % 360));
        }
      });
      const bytes = await doc.save();
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const base = file.name.replace(/\.pdf$/i, "");
      downloadBlob(blob, `${base}_rotated.pdf`);
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
    setRotations([]);
    setError("");
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>
      )}

      {!file ? (
        <FileDrop
          accept={["application/pdf"]}
          onFiles={(files) => loadFile(files[0])}
          label="PDF 파일을 선택하세요"
          sublabel="클릭하거나 파일을 드래그하세요"
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Thumbnails */}
          <div className="flex-1">
            <div className="text-[12px] font-mono text-[var(--color-muted)] mb-2">{pageCount} PAGES · 각 페이지별 회전 설정</div>
            <div className="flex flex-wrap gap-3">
              {thumbnails.map((src, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="relative rounded border border-[var(--color-border)] bg-white">
                    <img
                      src={src}
                      alt={`p${i + 1}`}
                      className="h-20 object-contain block"
                      style={{ transform: `rotate(${rotations[i] ?? 0}deg)`, transition: "transform 0.2s" }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--color-muted)]">{i + 1}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => rotate(i, -90)}
                      className="p-1 rounded text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-colors"
                      title="90° CCW"
                    >
                      <RotateCcw size={12} />
                    </button>
                    <button
                      onClick={() => rotate(i, 90)}
                      className="p-1 rounded text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-colors"
                      title="90° CW"
                    >
                      <RotateCw size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {pageCount > 16 && (
                <div className="flex items-center text-[12px] text-[var(--color-muted)]">+{pageCount - 16}페이지</div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="w-full lg:w-56 flex flex-col gap-4">
            <div>
              <div className="text-[12px] font-mono text-[var(--color-muted)] mb-2">전체 회전</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => rotateAll(-90)} className="flex items-center justify-center gap-1 px-2 py-2 rounded-[6px] text-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] transition-all">
                  <RotateCcw size={12} /> 90° CCW
                </button>
                <button onClick={() => rotateAll(90)} className="flex items-center justify-center gap-1 px-2 py-2 rounded-[6px] text-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] transition-all">
                  <RotateCw size={12} /> 90° CW
                </button>
                <button onClick={() => rotateAll(180)} className="col-span-2 px-2 py-2 rounded-[6px] text-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] transition-all">
                  180° 뒤집기
                </button>
              </div>
            </div>

            <Button variant="primary" onClick={handleSave} disabled={busy} className="w-full">
              <Download size={14} className="mr-1.5" /> {busy ? "처리 중…" : "다운로드"}
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
