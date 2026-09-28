"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";
import { downloadBlob } from "@/lib/download";
import { loadPdfDoc, renderPdfPageToCanvas } from "@/lib/pdfUtils";

interface Props {
  initialFile?: File | null;
}

interface Rect { x: number; y: number; w: number; h: number; }

export function CropPagesTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [applyAll, setApplyAll] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
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
      const canvas = await renderPdfPageToCanvas(data, 0, 1.0);
      setNaturalW(canvas.width);
      setNaturalH(canvas.height);
      setPreviewUrl(canvas.toDataURL());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const getScale = useCallback(() => {
    if (!containerRef.current || !naturalW || !naturalH) return 1;
    const maxW = containerRef.current.clientWidth;
    const maxH = 460;
    return Math.min(1, maxW / naturalW, maxH / naturalH);
  }, [naturalW, naturalH]);

  useEffect(() => {
    if (!naturalW || !naturalH || !containerRef.current) return;
    const maxW = containerRef.current.clientWidth;
    const maxH = 460;
    const scale = Math.min(1, maxW / naturalW, maxH / naturalH);
    setRect({ x: 0, y: 0, w: naturalW * scale, h: naturalH * scale });
  }, [naturalW, naturalH]);

  function onMouseDown(e: React.MouseEvent) {
    if (!containerRef.current) return;
    const b = containerRef.current.getBoundingClientRect();
    setDragStart({ x: e.clientX - b.left, y: e.clientY - b.top });
    setDragging(true);
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging || !containerRef.current) return;
    const b = containerRef.current.getBoundingClientRect();
    const scale = getScale();
    const dw = naturalW * scale;
    const dh = naturalH * scale;
    const cx = e.clientX - b.left;
    const cy = e.clientY - b.top;
    let x = Math.min(dragStart.x, cx);
    let y = Math.min(dragStart.y, cy);
    let w = Math.abs(cx - dragStart.x);
    let h = Math.abs(cy - dragStart.y);
    x = Math.max(0, Math.min(x, dw - w));
    y = Math.max(0, Math.min(y, dh - h));
    w = Math.min(w, dw - x);
    h = Math.min(h, dh - y);
    setRect({ x, y, w, h });
  }

  async function handleCrop() {
    if (!pdfData || !file) return;
    setBusy(true);
    setError("");
    try {
      const { PDFDocument } = await import("pdf-lib");
      const scale = getScale();
      const doc = await PDFDocument.load(pdfData);
      const pages = doc.getPages();

      const cropX = rect.x / scale;
      const cropY = rect.y / scale;
      const cropW = rect.w / scale;
      const cropH = rect.h / scale;

      const applyTo = applyAll ? pages : [pages[0]];
      for (const page of applyTo) {
        const { width, height } = page.getSize();
        // PDF coordinate system: origin bottom-left
        const pdfLeft = cropX;
        const pdfBottom = height - cropY - cropH;
        const pdfRight = cropX + cropW;
        const pdfTop = height - cropY;
        page.setCropBox(pdfLeft, pdfBottom, pdfRight - pdfLeft, pdfTop - pdfBottom);
        page.setMediaBox(pdfLeft, pdfBottom, pdfRight - pdfLeft, pdfTop - pdfBottom);
        void width; // used via page.getSize()
      }

      const bytes = await doc.save();
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const base = file.name.replace(/\.pdf$/i, "");
      downloadBlob(blob, `${base}_cropped.pdf`);
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
    setNaturalW(0);
    setNaturalH(0);
    setPreviewUrl("");
    setRect({ x: 0, y: 0, w: 0, h: 0 });
    setError("");
  }

  const scale = getScale();
  const dw = naturalW * scale;
  const dh = naturalH * scale;

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
          {/* Preview */}
          <div
            ref={containerRef}
            className="relative flex-1 bg-[var(--color-surface-alt)] rounded-[12px] overflow-hidden cursor-crosshair select-none"
            style={{ minHeight: dh || 300 }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={() => setDragging(false)}
            onMouseLeave={() => setDragging(false)}
          >
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="preview" style={{ width: dw, height: dh }} className="block" />
            )}
            {dw > 0 && (
              <div
                className="absolute border-2 border-[var(--color-accent)] pointer-events-none"
                style={{
                  left: rect.x,
                  top: rect.y,
                  width: rect.w,
                  height: rect.h,
                  boxShadow: `0 0 0 9999px rgba(0,0,0,0.35)`,
                }}
              />
            )}
          </div>

          {/* Controls */}
          <div className="w-full lg:w-56 flex flex-col gap-4">
            <div className="text-[12px] text-[var(--color-muted)]">
              {pageCount}페이지 · 영역: {Math.round(rect.w / scale)} × {Math.round(rect.h / scale)} px
            </div>

            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="text-[13px]">모든 페이지에 적용</span>
              <div
                onClick={() => setApplyAll((v) => !v)}
                className={`w-8 h-5 rounded-full relative transition-colors shrink-0 ${applyAll ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${applyAll ? "translate-x-3" : "translate-x-0.5"}`}
                />
              </div>
            </label>
            {!applyAll && (
              <div className="text-[12px] text-[var(--color-muted)]">첫 번째 페이지만 적용됩니다.</div>
            )}

            <Button variant="primary" onClick={handleCrop} disabled={busy} className="w-full">
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
