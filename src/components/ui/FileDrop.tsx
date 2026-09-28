"use client";

import React, { useRef, useState } from "react";

interface FileDropProps {
  accept: string[];
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
  sublabel?: string;
}

export function FileDrop({ accept, multiple = false, onFiles, label, sublabel }: FileDropProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(multiple ? files : [files[0]]);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) onFiles(files);
    e.target.value = "";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  const displayLabel = label ?? "파일을 선택하세요";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={displayLabel}
      onClick={() => inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        "flex flex-col items-center justify-center border-2 border-dashed rounded-[16px] p-12 cursor-pointer transition-all text-[var(--color-muted)] text-[14px] text-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
        dragging
          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
          : "border-[var(--color-border-strong)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]",
      ].join(" ")}
    >
      <span>{displayLabel}</span>
      {sublabel && <span className="text-[12px] opacity-70">{sublabel}</span>}
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(",")}
        multiple={multiple}
        className="hidden"
        onChange={handleChange}
        aria-hidden="true"
      />
    </div>
  );
}
