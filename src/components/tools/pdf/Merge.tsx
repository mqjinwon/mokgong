"use client";

import React, { useRef, useState } from "react";
import { Download, RotateCcw, GripVertical, X, Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";
import { downloadBlob } from "@/lib/download";
import { loadPdfDoc, renderPdfPageToCanvas } from "@/lib/pdfUtils";

interface PdfEntry {
  id: string;
  file: File;
  pageCount: number;
  thumbnail?: string;
}

interface Props {
  initialFile?: File | null;
}

function SortableItem({
  entry,
  onRemove,
}: {
  entry: PdfEntry;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sizeKb = Math.round(entry.file.size / 1024);
  const sizeLabel = sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)}MB` : `${sizeKb}KB`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-3 rounded-[10px] bg-[var(--color-bg)] border border-[var(--color-border)]"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-[var(--color-muted)] cursor-grab active:cursor-grabbing shrink-0 touch-none"
      >
        <GripVertical size={16} />
      </button>
      {entry.thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={entry.thumbnail} alt="" className="h-12 rounded border border-[var(--color-border)] object-contain bg-white shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium truncate">{entry.file.name}</div>
        <div className="text-[12px] font-mono text-[var(--color-muted)]">
          {entry.pageCount} PAGES · {sizeLabel}
        </div>
      </div>
      <button
        onClick={() => onRemove(entry.id)}
        className="text-[var(--color-muted)] hover:text-red-500 transition-colors shrink-0"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function MergeTool({ initialFile }: Props) {
  const [entries, setEntries] = useState<PdfEntry[]>([]);
  const [blankPage, setBlankPage] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  React.useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (initialFile) addFiles([initialFile]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addFiles(files: File[]) {
    setError("");
    const newEntries: PdfEntry[] = [];
    for (const file of files) {
      try {
        const { data, pageCount } = await loadPdfDoc(file);
        const canvas = await renderPdfPageToCanvas(data, 0, 0.15);
        const thumbnail = canvas.toDataURL();
        newEntries.push({ id: `${file.name}-${Date.now()}-${Math.random()}`, file, pageCount, thumbnail });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        return;
      }
    }
    setEntries((prev) => [...prev, ...newEntries]);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEntries((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  async function handleMerge() {
    if (entries.length < 2) {
      setError("합칠 PDF를 2개 이상 추가해주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { PDFDocument } = await import("pdf-lib");
      const merged = await PDFDocument.create();

      for (const entry of entries) {
        const data = await entry.file.arrayBuffer();
        const src = await PDFDocument.load(data);
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((p) => merged.addPage(p));

        if (blankPage) {
          const last = src.getPage(src.getPageCount() - 1);
          const { width, height } = last.getSize();
          merged.addPage([width, height]);
        }
      }

      const bytes = await merged.save();
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
      downloadBlob(blob, "merged.pdf");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setEntries([]);
    setBlankPage(false);
    setError("");
  }

  const totalPages = entries.reduce((s, e) => s + e.pageCount, 0);

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>
      )}

      {entries.length === 0 ? (
        <FileDrop
          accept={["application/pdf"]}
          multiple
          onFiles={(files) => addFiles(files)}
          label="PDF 파일을 선택하세요"
          sublabel="여러 개 동시 선택 가능 · 클릭하거나 파일을 드래그하세요"
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-5">
          {/* File list */}
          <div className="flex-1 flex flex-col gap-3">
            <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[15px] font-semibold">합칠 PDF · {entries.length}개</div>
                <div className="text-[11px] font-mono text-[var(--color-muted)]">↕ DRAG TO REORDER</div>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2">
                    {entries.map((entry) => (
                      <SortableItem
                        key={entry.id}
                        entry={entry}
                        onRemove={(id) => setEntries((prev) => prev.filter((e) => e.id !== id))}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <button
                onClick={() => addInputRef.current?.click()}
                className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[10px] border-2 border-dashed border-[var(--color-border-strong)] text-[var(--color-muted)] text-[13px] hover:border-[var(--color-accent)] transition-colors cursor-pointer"
              >
                <Plus size={14} /> 파일 더 추가
              </button>
              <input
                ref={addInputRef}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(Array.from(e.target.files));
                }}
              />
            </div>

            {/* Result info bar */}
            <div className="p-4 rounded-[12px] bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-[15px]">결과 · merged.pdf</div>
                  <div className="text-[13px] text-[var(--color-muted)] mt-0.5">
                    총 {totalPages}페이지 · 모두 브라우저에서 처리
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="w-full lg:w-56 flex flex-col gap-4">
            <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="text-[13px] font-semibold mb-3">옵션</div>
              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-[13px]">각 PDF 사이에 빈 페이지 추가</span>
                <div
                  onClick={() => setBlankPage((v) => !v)}
                  className={`w-8 h-5 rounded-full relative transition-colors shrink-0 ${blankPage ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]"}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${blankPage ? "translate-x-3" : "translate-x-0.5"}`}
                  />
                </div>
              </label>
            </div>

            <Button variant="primary" onClick={handleMerge} disabled={busy} className="w-full">
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
