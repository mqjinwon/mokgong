"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Download, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";
import { downloadBlob } from "@/lib/download";
import { loadPdfDoc, renderPdfPageToCanvas } from "@/lib/pdfUtils";
import { useDraggableRegion, CropHandles } from "@/hooks/useDraggableRegion";

interface Props {
  initialFile?: File | null;
}

export function CropPagesTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [displayDimensions, setDisplayDimensions] = useState({ dw: 0, dh: 0, scale: 1 });
  const [applyAll, setApplyAll] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState("crosshair");
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const {
    rect,
    setRect,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    getCursor,
  } = useDraggableRegion({
    bounds: { w: displayDimensions.dw, h: displayDimensions.dh },
    aspectRatio: null,
    minSize: 10,
  });

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
      setCurrentPage(0);
      
      // Load thumbnails (max 12)
      const thumbs: string[] = [];
      const count = Math.min(pc, 12);
      for (let i = 0; i < count; i++) {
        const canvas = await renderPdfPageToCanvas(data, i, 0.2);
        thumbs.push(canvas.toDataURL());
      }
      setThumbnails(thumbs);
      
      // Load first page full preview
      const canvas = await renderPdfPageToCanvas(data, 0, 1.0);
      setNaturalW(canvas.width);
      setNaturalH(canvas.height);
      setPreviewUrl(canvas.toDataURL());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  
  async function goToPage(pageIndex: number) {
    if (!pdfData || pageIndex < 0 || pageIndex >= pageCount) return;
    setCurrentPage(pageIndex);
    const canvas = await renderPdfPageToCanvas(pdfData, pageIndex, 1.0);
    setNaturalW(canvas.width);
    setNaturalH(canvas.height);
    setPreviewUrl(canvas.toDataURL());
  }

  const getScale = useCallback(() => {
    if (!naturalW || !naturalH || !containerRef.current) return 1;
    const maxW = containerRef.current.clientWidth;
    const maxH = 460;
    return Math.min(1, maxW / naturalW, maxH / naturalH);
  }, [naturalW, naturalH]);

  useEffect(() => {
    if (!naturalW || !naturalH || !containerRef.current) return;
    const maxW = containerRef.current.clientWidth;
    const maxH = 460;
    const scale = Math.min(1, maxW / naturalW, maxH / naturalH);
    const dw = naturalW * scale;
    const dh = naturalH * scale;
    setDisplayDimensions({ dw, dh, scale });
    setRect({ x: 0, y: 0, w: dw, h: dh });
  }, [naturalW, naturalH, setRect]);

  function onMouseDown(e: React.MouseEvent) {
    if (!containerRef.current) return;
    const b = containerRef.current.getBoundingClientRect();
    const px = e.clientX - b.left;
    const py = e.clientY - b.top;
    handleMouseDown(px, py);
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!containerRef.current) return;
    const b = containerRef.current.getBoundingClientRect();
    const px = e.clientX - b.left;
    const py = e.clientY - b.top;
    handleMouseMove(px, py);
    setCursor(getCursor(px, py));
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

      const applyTo = applyAll ? pages : [pages[currentPage]];
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
    setCurrentPage(0);
    setThumbnails([]);
    setNaturalW(0);
    setNaturalH(0);
    setPreviewUrl("");
    setRect({ x: 0, y: 0, w: 0, h: 0 });
    setError("");
  }

  const { dw, dh, scale } = displayDimensions;

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
        <div className="flex flex-col gap-5">
          {/* Page thumbnails */}
          {thumbnails.length > 1 && (
            <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="text-[12px] font-mono text-[var(--color-muted)] mb-2">
                페이지 선택 · {pageCount}페이지
              </div>
              <div className="flex flex-wrap gap-2">
                {thumbnails.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => goToPage(i)}
                    className={`flex flex-col items-center gap-1 p-1 rounded transition-all ${
                      currentPage === i
                        ? "ring-2 ring-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                        : "hover:bg-[var(--color-surface-alt)]"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`p${i + 1}`} className="h-16 rounded border border-[var(--color-border)] object-contain bg-white" />
                    <span className="text-[10px] font-mono text-[var(--color-muted)]">{i + 1}</span>
                  </button>
                ))}
                {pageCount > 12 && (
                  <div className="flex items-center text-[12px] text-[var(--color-muted)]">+{pageCount - 12}…</div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-5">
            {/* Preview with navigation */}
            <div className="flex-1 flex flex-col gap-3">
              {/* Page navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="p-2 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="text-[13px] font-mono">
                  {currentPage + 1} / {pageCount}
                </div>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === pageCount - 1}
                  className="p-2 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Crop area */}
              <div
                ref={containerRef}
                className="relative bg-[var(--color-surface-alt)] rounded-[12px] overflow-hidden select-none"
                style={{ minHeight: dh || 300, cursor }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="preview" style={{ width: dw, height: dh }} className="block" />
                )}
                {dw > 0 && (
                  <>
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
                    <CropHandles rect={rect} />
                  </>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="w-full lg:w-56 flex flex-col gap-4">
              <div className="text-[12px] text-[var(--color-muted)]">
                영역: {Math.round(rect.w / scale)} × {Math.round(rect.h / scale)} px
              </div>
              <div className="text-[11px] text-[var(--color-muted)] opacity-70">
                드래그로 새 영역 그리기 · 영역 안 클릭+드래그로 이동
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
                <div className="text-[12px] text-[var(--color-muted)]">현재 페이지({currentPage + 1})만 적용됩니다.</div>
              )}

              <Button variant="primary" onClick={handleCrop} disabled={busy} className="w-full">
                <Download size={14} className="mr-1.5" /> {busy ? "처리 중…" : "다운로드"}
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
