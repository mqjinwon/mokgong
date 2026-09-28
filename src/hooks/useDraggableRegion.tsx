"use client";

import React, { useState, useCallback, useRef } from "react";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type DragMode = "none" | "draw" | "move" | "resize-nw" | "resize-ne" | "resize-sw" | "resize-se";

const HANDLE_SIZE = 12;

function isInsideRect(px: number, py: number, rect: Rect): boolean {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

function getResizeHandle(px: number, py: number, rect: Rect): DragMode | null {
  const { x, y, w, h } = rect;
  const hs = HANDLE_SIZE;
  if (px >= x - hs && px <= x + hs && py >= y - hs && py <= y + hs) return "resize-nw";
  if (px >= x + w - hs && px <= x + w + hs && py >= y - hs && py <= y + hs) return "resize-ne";
  if (px >= x - hs && px <= x + hs && py >= y + h - hs && py <= y + h + hs) return "resize-sw";
  if (px >= x + w - hs && px <= x + w + hs && py >= y + h - hs && py <= y + h + hs) return "resize-se";
  return null;
}

interface UseDraggableRegionOptions {
  bounds: { w: number; h: number };
  aspectRatio?: number | null;
  minSize?: number;
}

export function useDraggableRegion(options: UseDraggableRegionOptions) {
  const { bounds, aspectRatio = null, minSize = 10 } = options;
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: bounds.w, h: bounds.h });
  const [dragMode, setDragMode] = useState<DragMode>("none");
  const dragStart = useRef({ x: 0, y: 0 });
  const rectAtDragStart = useRef<Rect>({ x: 0, y: 0, w: 0, h: 0 });

  const handleMouseDown = useCallback((px: number, py: number) => {
    dragStart.current = { x: px, y: py };
    rectAtDragStart.current = { ...rect };

    const resizeHandle = getResizeHandle(px, py, rect);
    if (resizeHandle) {
      setDragMode(resizeHandle);
      return;
    }

    if (rect.w > minSize && rect.h > minSize && isInsideRect(px, py, rect)) {
      setDragMode("move");
      return;
    }

    setDragMode("draw");
    setRect({ x: px, y: py, w: 0, h: 0 });
  }, [rect, minSize]);

  const handleMouseMove = useCallback((px: number, py: number) => {
    if (dragMode === "none") return;

    const dx = px - dragStart.current.x;
    const dy = py - dragStart.current.y;
    const orig = rectAtDragStart.current;

    if (dragMode === "move") {
      let newX = orig.x + dx;
      let newY = orig.y + dy;
      newX = Math.max(0, Math.min(newX, bounds.w - orig.w));
      newY = Math.max(0, Math.min(newY, bounds.h - orig.h));
      setRect({ ...orig, x: newX, y: newY });
      return;
    }

    if (dragMode === "draw") {
      const startX = dragStart.current.x;
      const startY = dragStart.current.y;
      let x = Math.min(startX, px);
      let y = Math.min(startY, py);
      let w = Math.abs(px - startX);
      let h = Math.abs(py - startY);

      if (aspectRatio) {
        h = w / aspectRatio;
        if (py < startY) y = startY - h;
      }

      x = Math.max(0, Math.min(x, bounds.w - w));
      y = Math.max(0, Math.min(y, bounds.h - h));
      w = Math.min(w, bounds.w - x);
      h = Math.min(h, bounds.h - y);
      setRect({ x, y, w, h });
      return;
    }

    if (dragMode.startsWith("resize-")) {
      let { x, y, w, h } = orig;
      
      if (dragMode === "resize-se") {
        w = Math.max(minSize, orig.w + dx);
        h = aspectRatio ? w / aspectRatio : Math.max(minSize, orig.h + dy);
      } else if (dragMode === "resize-sw") {
        const newW = Math.max(minSize, orig.w - dx);
        x = orig.x + orig.w - newW;
        w = newW;
        h = aspectRatio ? w / aspectRatio : Math.max(minSize, orig.h + dy);
      } else if (dragMode === "resize-ne") {
        w = Math.max(minSize, orig.w + dx);
        const newH = aspectRatio ? w / aspectRatio : Math.max(minSize, orig.h - dy);
        y = orig.y + orig.h - newH;
        h = newH;
      } else if (dragMode === "resize-nw") {
        const newW = Math.max(minSize, orig.w - dx);
        const newH = aspectRatio ? newW / aspectRatio : Math.max(minSize, orig.h - dy);
        x = orig.x + orig.w - newW;
        y = orig.y + orig.h - newH;
        w = newW;
        h = newH;
      }

      x = Math.max(0, x);
      y = Math.max(0, y);
      w = Math.min(w, bounds.w - x);
      h = Math.min(h, bounds.h - y);
      setRect({ x, y, w, h });
    }
  }, [dragMode, bounds, aspectRatio, minSize]);

  const handleMouseUp = useCallback(() => {
    setDragMode("none");
  }, []);

  const getCursor = useCallback((px: number, py: number): string => {
    const resizeHandle = getResizeHandle(px, py, rect);
    if (resizeHandle === "resize-nw" || resizeHandle === "resize-se") return "nwse-resize";
    if (resizeHandle === "resize-ne" || resizeHandle === "resize-sw") return "nesw-resize";
    if (rect.w > minSize && rect.h > minSize && isInsideRect(px, py, rect)) return "move";
    return "crosshair";
  }, [rect, minSize]);

  const resetRect = useCallback((newRect: Rect) => {
    setRect(newRect);
  }, []);

  return {
    rect,
    setRect: resetRect,
    dragMode,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    getCursor,
    isDragging: dragMode !== "none",
  };
}

export function CropHandles({ rect, scale = 1 }: { rect: Rect; scale?: number }) {
  const hs = HANDLE_SIZE;
  const handles = [
    { pos: "nw", x: rect.x - hs / 2, y: rect.y - hs / 2 },
    { pos: "ne", x: rect.x + rect.w - hs / 2, y: rect.y - hs / 2 },
    { pos: "sw", x: rect.x - hs / 2, y: rect.y + rect.h - hs / 2 },
    { pos: "se", x: rect.x + rect.w - hs / 2, y: rect.y + rect.h - hs / 2 },
  ];

  return (
    <>
      {handles.map((h) => (
        <div
          key={h.pos}
          className="absolute bg-white border-2 border-[var(--color-accent)] rounded-sm pointer-events-none"
          style={{
            left: h.x * scale,
            top: h.y * scale,
            width: hs,
            height: hs,
          }}
        />
      ))}
    </>
  );
}
