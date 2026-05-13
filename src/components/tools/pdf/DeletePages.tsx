"use client";

import React, { useRef, useState } from "react";
import { FileDrop } from "@/components/ui/FileDrop";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadBlob } from "@/lib/download";
import { loadPdfDoc, renderPdfPageToCanvas } from "@/lib/pdfUtils";

interface Props {
  initialFile?: File | null;
}

export function DeletePagesTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [marked, setMarked] = useState<Set<number>>(new Set());
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
      setMarked(new Set());
      const thumbs: string[] = [];
      const count = Math.min(pc, 20);
      for (let i = 0; i < count; i++) {
        const canvas = await renderPdfPageToCanvas(data, i, 0.25);
        thumbs.push(canvas.toDataURL());
      }
      setThumbnails(thumbs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function toggleMark(i: number) {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function handleDelete() {
    if (!pdfData || !file) return;
    if (marked.size === 0) { setError("삭제할 페이지를 선택해주세요."); return; }
    if (marked.size === pageCount) { setError("모든 페이지를 삭제할 수 없습니다."); return; }
    setBusy(true);
    setError("");
    try {
      const { PDFDocument } = await import("pdf-lib");
      const src = await PDFDocument.load(pdfData);
      const keepIndices = Array.from({ length: pageCount }, (_, i) => i).filter((i) => !marked.has(i));
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, keepIndices);
      pages.forEach((p) => out.addPage(p));
      const bytes = await out.save();
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const base = file.name.replace(/\.pdf$/i, "");
      downloadBlob(blob, `${base}_deleted.pdf`);
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
    setMarked(new Set());
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
            <div className="text-[12px] font-mono text-[var(--color-muted)] mb-2">
              클릭하여 삭제할 페이지를 선택하세요 · {pageCount} PAGES
            </div>
            <div className="flex flex-wrap gap-3">
              {thumbnails.map((src, i) => (
                <div
                  key={i}
                  onClick={() => toggleMark(i)}
                  className={`flex flex-col items-center gap-1 cursor-pointer group`}
                >
                  <div className={`relative rounded border-2 transition-all ${marked.has(i) ? "border-red-400" : "border-[var(--color-border)] hover:border-[var(--color-accent)]"}`}>
                    <img src={src} alt={`p${i + 1}`} className="h-20 rounded object-contain bg-white" />
                    {marked.has(i) && (
                      <div className="absolute inset-0 bg-red-400/30 rounded flex items-center justify-center">
                        <span className="text-red-600 font-bold text-[11px]">삭제</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-mono ${marked.has(i) ? "text-red-500" : "text-[var(--color-muted)]"}`}>{i + 1}</span>
                </div>
              ))}
              {pageCount > 20 && (
                <div className="flex items-center text-[12px] text-[var(--color-muted)]">+{pageCount - 20}페이지 (미리보기 최대 20)</div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="w-full lg:w-56 flex flex-col gap-4">
            <div className="p-3 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] text-[13px]">
              <div className="text-[var(--color-muted)] mb-1">선택된 페이지</div>
              <div className="font-semibold text-red-500">{marked.size}개 삭제</div>
              <div className="text-[var(--color-muted)]">→ {pageCount - marked.size}페이지 남음</div>
            </div>

            <Button variant="primary" onClick={handleDelete} disabled={busy || marked.size === 0} className="w-full">
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
