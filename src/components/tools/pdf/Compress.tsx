"use client";

import React, { useRef, useState } from "react";
import { FileDrop } from "@/components/ui/FileDrop";
import { Download, RotateCcw, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadBlob } from "@/lib/download";
import { loadPdfDoc, renderPdfPageToCanvas } from "@/lib/pdfUtils";

type CompressionPreset = "light" | "balanced" | "strong";

interface Props {
  initialFile?: File | null;
}

const COMPRESSION_PRESETS: Record<CompressionPreset, { 
  imageQuality: number; 
  scale: number;
  label: string; 
  desc: string;
}> = {
  light: { 
    imageQuality: 0.85, 
    scale: 1.0,
    label: "가벼운 압축", 
    desc: "품질 유지, 약간의 용량 감소" 
  },
  balanced: { 
    imageQuality: 0.7, 
    scale: 0.85,
    label: "균형 압축", 
    desc: "적당한 품질과 용량 감소" 
  },
  strong: { 
    imageQuality: 0.5, 
    scale: 0.7,
    label: "강한 압축", 
    desc: "용량 우선, 품질 저하 감수" 
  },
};

export function CompressTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [originalSize, setOriginalSize] = useState(0);
  const [resultSize, setResultSize] = useState<number | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const initialized = useRef(false);
  
  const [preset, setPreset] = useState<CompressionPreset>("balanced");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useCustom, setUseCustom] = useState(false);
  const [customImageQuality, setCustomImageQuality] = useState(70);
  const [customScale, setCustomScale] = useState(85);
  const [compressImages, setCompressImages] = useState(true);
  const [hasImages, setHasImages] = useState<boolean | null>(null);

  React.useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (initialFile) loadFile(initialFile);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFile(f: File) {
    setError("");
    setResultSize(null);
    setResultBlob(null);
    setHasImages(null);
    try {
      const { data, pageCount: pc } = await loadPdfDoc(f);
      setPdfData(data);
      setPageCount(pc);
      setOriginalSize(f.size);
      setFile(f);
      
      const thumbs: string[] = [];
      const count = Math.min(pc, 8);
      for (let i = 0; i < count; i++) {
        const canvas = await renderPdfPageToCanvas(data, i, 0.2);
        thumbs.push(canvas.toDataURL());
      }
      setThumbnails(thumbs);
      
      await analyzeForImages(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function analyzeForImages(data: ArrayBuffer) {
    try {
      const { PDFDocument, PDFName, PDFDict } = await import("pdf-lib");
      const doc = await PDFDocument.load(data);
      const pages = doc.getPages();
      let foundImage = false;
      
      for (const page of pages) {
        const resourcesRef = page.node.get(PDFName.of("Resources"));
        if (!resourcesRef) continue;
        
        const resources = doc.context.lookup(resourcesRef);
        if (resources instanceof PDFDict) {
          const xObjectRef = resources.get(PDFName.of("XObject"));
          if (xObjectRef) {
            foundImage = true;
            break;
          }
        }
      }
      setHasImages(foundImage);
    } catch {
      setHasImages(null);
    }
  }

  async function handleCompress() {
    if (!pdfData || !file) return;
    setBusy(true);
    setError("");
    setProgress(0);
    setResultBlob(null);
    
    try {
      const presetConfig = useCustom ? null : COMPRESSION_PRESETS[preset];
      const imageQuality = useCustom ? customImageQuality / 100 : presetConfig!.imageQuality;
      const scale = useCustom ? customScale / 100 : presetConfig!.scale;
      
      if (compressImages) {
        const pdfjs = await import("pdfjs-dist");
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url
          ).toString();
        }
        
        const loadingTask = pdfjs.getDocument({ data: pdfData.slice(0) });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        
        const { PDFDocument } = await import("pdf-lib");
        const newDoc = await PDFDocument.create();
        
        for (let i = 1; i <= numPages; i++) {
          setProgress(Math.round((i - 1) / numPages * 80));
          
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });
          
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext("2d")!;
          
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          
          const jpegDataUrl = canvas.toDataURL("image/jpeg", imageQuality);
          const jpegBytes = Uint8Array.from(atob(jpegDataUrl.split(",")[1]), c => c.charCodeAt(0));
          
          const jpegImage = await newDoc.embedJpg(jpegBytes);
          
          const originalViewport = page.getViewport({ scale: 1 });
          const newPage = newDoc.addPage([originalViewport.width, originalViewport.height]);
          
          newPage.drawImage(jpegImage, {
            x: 0,
            y: 0,
            width: originalViewport.width,
            height: originalViewport.height,
          });
        }
        
        setProgress(90);
        
        const bytes = await newDoc.save({ useObjectStreams: true });
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
        setResultSize(bytes.byteLength);
        setResultBlob(blob);
        
      } else {
        const { PDFDocument } = await import("pdf-lib");
        const doc = await PDFDocument.load(pdfData);
        const bytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
        setResultSize(bytes.byteLength);
        setResultBlob(blob);
      }
      
      setProgress(100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function handleDownload() {
    if (!resultBlob || !file) return;
    const base = file.name.replace(/\.pdf$/i, "");
    downloadBlob(resultBlob, `${base}_compressed.pdf`);
  }

  function reset() {
    setFile(null);
    setPdfData(null);
    setPageCount(0);
    setThumbnails([]);
    setOriginalSize(0);
    setResultSize(null);
    setResultBlob(null);
    setError("");
    setProgress(0);
    setHasImages(null);
  }

  function fmt(bytes: number) {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  const ratio = resultSize ? Math.round((1 - resultSize / originalSize) * 100) : null;

  return (
    <div className="flex flex-col gap-5">
      {/* BETA banner */}
      <div className="p-3 rounded-[8px] bg-amber-50 border border-amber-200 text-amber-800 text-[13px] leading-[1.5]">
        <div className="flex items-start gap-2">
          <span className="font-bold shrink-0">BETA</span>
          <div className="space-y-1">
            <p>모든 처리는 브라우저 안에서 진행됩니다 — 서버에 업로드되지 않아요.</p>
            <ul className="text-[12px] opacity-80 list-disc list-inside space-y-0.5">
              <li>이미지 압축: 페이지를 이미지로 변환 후 JPEG 압축</li>
              <li>텍스트 선택 불가: 압축 후 텍스트 복사 기능이 사라집니다</li>
              <li>스캔 문서나 이미지 위주 PDF에서 효과적</li>
            </ul>
          </div>
        </div>
      </div>

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
          {thumbnails.length > 0 && (
            <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="text-[12px] font-mono text-[var(--color-muted)] mb-2">
                미리보기 · {pageCount}페이지
              </div>
              <div className="flex flex-wrap gap-2">
                {thumbnails.map((src, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`p${i + 1}`} className="h-16 rounded border border-[var(--color-border)] object-contain bg-white" />
                    <span className="text-[10px] font-mono text-[var(--color-muted)]">{i + 1}</span>
                  </div>
                ))}
                {pageCount > 8 && (
                  <div className="flex items-center text-[12px] text-[var(--color-muted)]">+{pageCount - 8}…</div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-5">
            {/* Info + Options */}
            <div className="flex-1 flex flex-col gap-4">
              <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="text-[14px] font-semibold mb-3">{file.name}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] font-mono text-[var(--color-muted)] mb-0.5">원본 크기</div>
                    <div className="text-[16px] font-semibold">{fmt(originalSize)}</div>
                  </div>
                  {resultSize !== null && (
                    <div>
                      <div className="text-[11px] font-mono text-[var(--color-muted)] mb-0.5">결과 크기</div>
                      <div className={`text-[16px] font-semibold ${resultSize < originalSize ? "text-green-600" : "text-[var(--color-muted)]"}`}>
                        {fmt(resultSize)}
                      </div>
                    </div>
                  )}
                </div>
                {ratio !== null && (
                  <div className={`mt-3 text-[13px] font-mono ${ratio > 0 ? "text-green-600" : "text-[var(--color-muted)]"}`}>
                    {ratio > 0 ? `${ratio}% 감소` : ratio === 0 ? "크기 동일" : `${Math.abs(ratio)}% 증가 (이미 최적화됨)`}
                  </div>
                )}
              </div>

              {/* Compression options */}
              <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col gap-3">
                <div className="text-[13px] font-semibold">압축 옵션</div>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={compressImages}
                    onChange={(e) => setCompressImages(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-[13px]">이미지 압축 (페이지를 JPEG로 변환)</span>
                </label>

                {compressImages && (
                  <>
                    {hasImages === false && (
                      <div className="p-2 rounded-[6px] bg-amber-50 border border-amber-200 text-amber-700 text-[12px] flex items-start gap-2">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>이 PDF는 텍스트 위주입니다. 이미지 압축 효과가 적을 수 있습니다.</span>
                      </div>
                    )}

                    <label className="flex flex-col gap-1">
                      <span className="text-[12px] text-[var(--color-muted)]">압축 강도</span>
                      <select
                        value={useCustom ? "custom" : preset}
                        onChange={(e) => {
                          if (e.target.value === "custom") {
                            setUseCustom(true);
                            setShowAdvanced(true);
                          } else {
                            setUseCustom(false);
                            setPreset(e.target.value as CompressionPreset);
                          }
                        }}
                        className="text-[13px] px-2 py-1.5 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)]"
                      >
                        {Object.entries(COMPRESSION_PRESETS).map(([key, { label, desc }]) => (
                          <option key={key} value={key}>{label} — {desc}</option>
                        ))}
                        <option value="custom">사용자 정의</option>
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center justify-between text-[12px] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                    >
                      <span>고급 옵션</span>
                      {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showAdvanced && (
                      <div className="flex flex-col gap-3 pt-2 border-t border-[var(--color-border)]">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={useCustom}
                            onChange={(e) => setUseCustom(e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-[12px]">사용자 정의 설정 사용</span>
                        </label>

                        {useCustom && (
                          <>
                            <label className="flex flex-col gap-1">
                              <span className="text-[12px] text-[var(--color-muted)]">
                                이미지 품질 ({customImageQuality}%)
                              </span>
                              <input
                                type="range"
                                min={10}
                                max={100}
                                step={5}
                                value={customImageQuality}
                                onChange={(e) => setCustomImageQuality(Number(e.target.value))}
                                className="w-full"
                              />
                              <span className="text-[10px] text-[var(--color-muted)]">
                                낮을수록 파일 작음, 높을수록 품질 좋음
                              </span>
                            </label>

                            <label className="flex flex-col gap-1">
                              <span className="text-[12px] text-[var(--color-muted)]">
                                해상도 스케일 ({customScale}%)
                              </span>
                              <input
                                type="range"
                                min={50}
                                max={100}
                                step={5}
                                value={customScale}
                                onChange={(e) => setCustomScale(Number(e.target.value))}
                                className="w-full"
                              />
                              <span className="text-[10px] text-[var(--color-muted)]">
                                100%: 원본 해상도, 낮을수록 해상도 감소
                              </span>
                            </label>
                          </>
                        )}

                        <div className="text-[11px] text-[var(--color-muted)] bg-[var(--color-bg)] p-2 rounded-[6px]">
                          <strong>주의:</strong> 이미지 압축 시 텍스트가 이미지로 변환되어 복사/검색이 불가능해집니다. 
                          인쇄용이나 보관용으로만 사용하세요.
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!compressImages && (
                  <div className="text-[11px] text-[var(--color-muted)] bg-[var(--color-bg)] p-2 rounded-[6px]">
                    기본 압축만 적용됩니다 (PDF 구조 최적화). 이미지가 많은 PDF에서는 효과가 미미할 수 있습니다.
                  </div>
                )}
              </div>

              {/* Progress */}
              {busy && (
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[12px] text-[var(--color-muted)] font-mono">
                    <span>압축 중… ({Math.ceil(progress / 80 * pageCount)}/{pageCount} 페이지)</span>
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
              {!resultBlob ? (
                <Button variant="primary" onClick={handleCompress} disabled={busy} className="w-full">
                  {busy ? "압축 중…" : "압축하기"}
                </Button>
              ) : (
                <>
                  <Button variant="primary" onClick={handleDownload} className="w-full">
                    <Download size={14} className="mr-1.5" /> 다운로드
                  </Button>
                  <Button variant="ghost" onClick={handleCompress} disabled={busy} className="w-full">
                    다시 압축
                  </Button>
                </>
              )}
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
