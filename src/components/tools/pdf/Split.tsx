"use client";

import React, { useRef, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";
import { downloadBlob } from "@/lib/download";
import { loadPdfDoc, renderPdfPageToCanvas } from "@/lib/pdfUtils";

interface Props {
  initialFile?: File | null;
}

type SplitMode = "each" | "range";

export function SplitTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [mode, setMode] = useState<SplitMode>("each");
  const [rangeInput, setRangeInput] = useState("");
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
      const thumbs: string[] = [];
      const count = Math.min(pc, 12);
      for (let i = 0; i < count; i++) {
        const canvas = await renderPdfPageToCanvas(data, i, 0.3);
        thumbs.push(canvas.toDataURL());
      }
      setThumbnails(thumbs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function parseRanges(input: string, total: number): number[][] {
    const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
    const ranges: number[][] = [];
    for (const part of parts) {
      if (part.includes("-")) {
        const [a, b] = part.split("-").map(Number);
        if (!a || !b || a < 1 || b > total || a > b) throw new Error(`잘못된 범위: ${part}`);
        ranges.push([a - 1, b - 1]);
      } else {
        const n = Number(part);
        if (!n || n < 1 || n > total) throw new Error(`잘못된 페이지: ${part}`);
        ranges.push([n - 1, n - 1]);
      }
    }
    return ranges;
  }

  async function handleSplit() {
    if (!pdfData || !file) return;
    setBusy(true);
    setError("");
    try {
      const { PDFDocument } = await import("pdf-lib");

      if (mode === "each") {
        for (let i = 0; i < pageCount; i++) {
          const src = await PDFDocument.load(pdfData);
          const out = await PDFDocument.create();
          const [page] = await out.copyPages(src, [i]);
          out.addPage(page);
          const bytes = await out.save();
          const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
          const base = file.name.replace(/\.pdf$/i, "");
          downloadBlob(blob, `${base}_page${i + 1}.pdf`);
        }
      } else {
        const ranges = parseRanges(rangeInput, pageCount);
        if (ranges.length === 0) throw new Error("범위를 입력해주세요. 예: 1-3, 5, 7-9");
        const src = await PDFDocument.load(pdfData);
        for (const [start, end] of ranges) {
          const out = await PDFDocument.create();
          const indices = Array.from({ length: end - start + 1 }, (_, k) => start + k);
          const pages = await out.copyPages(src, indices);
          pages.forEach((p) => out.addPage(p));
          const bytes = await out.save();
          const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
          const base = file.name.replace(/\.pdf$/i, "");
          downloadBlob(blob, `${base}_p${start + 1}-${end + 1}.pdf`);
        }
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
    setMode("each");
    setRangeInput("");
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
            <div className="text-[12px] font-mono text-[var(--color-muted)] mb-2">{pageCount} PAGES</div>
            <div className="flex flex-wrap gap-2">
              {thumbnails.map((src, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <img src={src} alt={`p${i + 1}`} className="h-20 rounded border border-[var(--color-border)] object-contain bg-white" />
                  <span className="text-[10px] font-mono text-[var(--color-muted)]">{i + 1}</span>
                </div>
              ))}
              {pageCount > 12 && (
                <div className="flex items-center text-[12px] text-[var(--color-muted)]">+{pageCount - 12}…</div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="w-full lg:w-56 flex flex-col gap-4">
            <div>
              <div className="text-[12px] font-mono text-[var(--color-muted)] mb-2">분리 방식</div>
              <div className="flex flex-col gap-1.5">
                {([["each", "페이지마다 한 파일"], ["range", "범위 지정"]] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setMode(val)}
                    className={`px-3 py-2 rounded-[6px] text-[13px] font-semibold border transition-all text-left ${mode === val ? "bg-[var(--color-accent)] text-white border-transparent" : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-accent)]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {mode === "range" && (
              <div>
                <div className="text-[12px] font-mono text-[var(--color-muted)] mb-1">범위 (예: 1-3, 5, 7-9)</div>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="1-3, 5, 7-9"
                  className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>
            )}

            <Button variant="primary" onClick={handleSplit} disabled={busy} className="w-full">
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
