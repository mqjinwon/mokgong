"use client";

import React, { useRef, useState } from "react";
import { Download, RotateCcw, GripVertical, X, Plus, FileText } from "lucide-react";
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
import { loadImage } from "@/lib/imageUtils";

interface ImageEntry {
  id: string;
  file: File;
  img: HTMLImageElement;
  thumbnail: string;
}

interface Props {
  initialFile?: File | null;
}

type PageSize = "fit" | "a4" | "letter";
type Orientation = "auto" | "portrait" | "landscape";

const PAGE_SIZES: Record<PageSize, { label: string; desc: string }> = {
  fit: { label: "이미지에 맞춤", desc: "이미지 크기로 페이지 생성" },
  a4: { label: "A4", desc: "210 × 297 mm" },
  letter: { label: "Letter", desc: "8.5 × 11 inch" },
};

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const LETTER_WIDTH = 612;
const LETTER_HEIGHT = 792;

function SortableItem({
  entry,
  onRemove,
}: {
  entry: ImageEntry;
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={entry.thumbnail}
        alt=""
        className="h-12 rounded border border-[var(--color-border)] object-contain bg-white shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium truncate">{entry.file.name}</div>
        <div className="text-[12px] font-mono text-[var(--color-muted)]">
          {entry.img.width} × {entry.img.height} · {sizeLabel}
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

export function ImageToPdfTool({ initialFile }: Props) {
  const [entries, setEntries] = useState<ImageEntry[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const addInputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  const [pageSize, setPageSize] = useState<PageSize>("fit");
  const [orientation, setOrientation] = useState<Orientation>("auto");
  const [margin, setMargin] = useState(0);
  const [quality, setQuality] = useState(92);

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
    const newEntries: ImageEntry[] = [];
    for (const file of files) {
      try {
        const img = await loadImage(file);
        const canvas = document.createElement("canvas");
        const maxDim = 100;
        const ratio = Math.min(maxDim / img.width, maxDim / img.height);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL("image/jpeg", 0.7);
        newEntries.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          img,
          thumbnail,
        });
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

  async function handleConvert() {
    if (entries.length === 0) {
      setError("이미지를 1개 이상 추가해주세요.");
      return;
    }
    setBusy(true);
    setError("");
    setProgress(0);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        setProgress(Math.round(((i + 1) / entries.length) * 90));

        const canvas = document.createElement("canvas");
        canvas.width = entry.img.width;
        canvas.height = entry.img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(entry.img, 0, 0);

        const dataUrl = canvas.toDataURL("image/jpeg", quality / 100);
        const base64 = dataUrl.split(",")[1];
        const jpegBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const jpegImage = await pdfDoc.embedJpg(jpegBytes);

        const imgWidth = entry.img.width;
        const imgHeight = entry.img.height;
        const isLandscape = imgWidth > imgHeight;

        let pageWidth: number;
        let pageHeight: number;

        if (pageSize === "fit") {
          pageWidth = imgWidth + margin * 2;
          pageHeight = imgHeight + margin * 2;
        } else {
          const baseWidth = pageSize === "a4" ? A4_WIDTH : LETTER_WIDTH;
          const baseHeight = pageSize === "a4" ? A4_HEIGHT : LETTER_HEIGHT;

          if (orientation === "auto") {
            if (isLandscape) {
              pageWidth = baseHeight;
              pageHeight = baseWidth;
            } else {
              pageWidth = baseWidth;
              pageHeight = baseHeight;
            }
          } else if (orientation === "landscape") {
            pageWidth = baseHeight;
            pageHeight = baseWidth;
          } else {
            pageWidth = baseWidth;
            pageHeight = baseHeight;
          }
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        let drawWidth: number;
        let drawHeight: number;
        let drawX: number;
        let drawY: number;

        if (pageSize === "fit") {
          drawWidth = imgWidth;
          drawHeight = imgHeight;
          drawX = margin;
          drawY = margin;
        } else {
          const availableWidth = pageWidth - margin * 2;
          const availableHeight = pageHeight - margin * 2;
          const scaleX = availableWidth / imgWidth;
          const scaleY = availableHeight / imgHeight;
          const scale = Math.min(scaleX, scaleY);

          drawWidth = imgWidth * scale;
          drawHeight = imgHeight * scale;
          drawX = margin + (availableWidth - drawWidth) / 2;
          drawY = margin + (availableHeight - drawHeight) / 2;
        }

        page.drawImage(jpegImage, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight,
        });
      }

      setProgress(95);
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });

      const baseName =
        entries.length === 1
          ? entries[0].file.name.replace(/\.[^.]+$/, "")
          : "images";
      downloadBlob(blob, `${baseName}.pdf`);
      setProgress(100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setEntries([]);
    setError("");
    setProgress(0);
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[13px]">
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <FileDrop
          accept={["image/png", "image/jpeg", "image/webp"]}
          multiple
          onFiles={(files) => addFiles(files)}
          label="이미지 파일을 선택하세요"
          sublabel="여러 개 동시 선택 가능 · 클릭하거나 파일을 드래그하세요"
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-5">
          {/* File list */}
          <div className="flex-1 flex flex-col gap-3">
            <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[15px] font-semibold">
                  이미지 · {entries.length}개
                </div>
                <div className="text-[11px] font-mono text-[var(--color-muted)]">
                  ↕ 드래그하여 순서 변경
                </div>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={entries.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-2">
                    {entries.map((entry) => (
                      <SortableItem
                        key={entry.id}
                        entry={entry}
                        onRemove={(id) =>
                          setEntries((prev) => prev.filter((e) => e.id !== id))
                        }
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <button
                onClick={() => addInputRef.current?.click()}
                className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[10px] border-2 border-dashed border-[var(--color-border-strong)] text-[var(--color-muted)] text-[13px] hover:border-[var(--color-accent)] transition-colors cursor-pointer"
              >
                <Plus size={14} /> 이미지 더 추가
              </button>
              <input
                ref={addInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(Array.from(e.target.files));
                }}
              />
            </div>

            {/* Options */}
            <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="text-[13px] font-semibold mb-3">페이지 크기</div>
              <div className="flex flex-col gap-1.5">
                {(Object.entries(PAGE_SIZES) as [PageSize, { label: string; desc: string }][]).map(
                  ([key, { label, desc }]) => (
                    <button
                      key={key}
                      onClick={() => setPageSize(key)}
                      className={`px-3 py-2 rounded-[6px] text-[13px] border transition-all text-left ${
                        pageSize === key
                          ? "bg-[var(--color-accent)] text-white border-transparent"
                          : "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-accent)]"
                      }`}
                    >
                      <span className="font-semibold">{label}</span>
                      <span className="ml-2 opacity-70 text-[12px]">{desc}</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {pageSize !== "fit" && (
              <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="text-[13px] font-semibold mb-3">방향</div>
                <div className="flex gap-2">
                  {(
                    [
                      ["auto", "자동"],
                      ["portrait", "세로"],
                      ["landscape", "가로"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setOrientation(val)}
                      className={`flex-1 px-3 py-2 rounded-[6px] text-[13px] font-semibold border transition-all ${
                        orientation === val
                          ? "bg-[var(--color-accent)] text-white border-transparent"
                          : "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-accent)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-mono text-[var(--color-muted)]">
                    여백 {margin}pt
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={72}
                    step={4}
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    className="w-full"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-mono text-[var(--color-muted)]">
                    이미지 품질 {quality}%
                  </span>
                  <input
                    type="range"
                    min={40}
                    max={100}
                    step={5}
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full"
                  />
                </label>
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
                <FileText size={16} className="text-[var(--color-accent)]" />
                <span className="font-semibold text-[14px]">결과</span>
              </div>
              <div className="text-[13px] text-[var(--color-muted)]">
                {entries.length}페이지 PDF
              </div>
              <div className="text-[11px] text-[var(--color-muted)] mt-1">
                {pageSize === "fit" && "이미지 원본 크기"}
                {pageSize === "a4" && "A4 용지"}
                {pageSize === "letter" && "Letter 용지"}
                {pageSize !== "fit" && orientation === "auto" && " · 자동 방향"}
                {pageSize !== "fit" && orientation === "portrait" && " · 세로"}
                {pageSize !== "fit" && orientation === "landscape" && " · 가로"}
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleConvert}
              disabled={busy}
              className="w-full"
            >
              <Download size={14} className="mr-1.5" />
              {busy ? "변환 중…" : "PDF 다운로드"}
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
