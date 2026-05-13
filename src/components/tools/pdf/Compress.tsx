"use client";

import React, { useRef, useState } from "react";
import { FileDrop } from "@/components/ui/FileDrop";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadBlob } from "@/lib/download";
import { loadPdfDoc } from "@/lib/pdfUtils";

interface Props {
  initialFile?: File | null;
}

export function CompressTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [resultSize, setResultSize] = useState<number | null>(null);
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
    setResultSize(null);
    try {
      const { data } = await loadPdfDoc(f);
      setPdfData(data);
      setOriginalSize(f.size);
      setFile(f);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleCompress() {
    if (!pdfData || !file) return;
    setBusy(true);
    setError("");
    try {
      const { PDFDocument } = await import("pdf-lib");
      // Re-save with object streams enabled to compress cross-reference table
      const doc = await PDFDocument.load(pdfData);
      const bytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultSize(bytes.byteLength);
      const base = file.name.replace(/\.pdf$/i, "");
      downloadBlob(blob, `${base}_compressed.pdf`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setPdfData(null);
    setOriginalSize(0);
    setResultSize(null);
    setError("");
  }

  function fmt(bytes: number) {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  const ratio = resultSize ? Math.round((1 - resultSize / originalSize) * 100) : null;

  return (
    <div className="flex flex-col gap-5">
      {/* BETA banner */}
      <div className="p-3 rounded-[8px] bg-amber-50 border border-amber-200 text-amber-800 text-[13px]">
        <strong>BETA</strong> — 브라우저 환경에서는 본격적인 압축이 제한적입니다. 이미지 위주 PDF에서만 효과를 확인하세요.
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
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Info */}
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
          </div>

          {/* Controls */}
          <div className="w-full lg:w-56 flex flex-col gap-4">
            <Button variant="primary" onClick={handleCompress} disabled={busy} className="w-full">
              <Download size={14} className="mr-1.5" /> {busy ? "압축 중…" : "압축 후 다운로드"}
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
