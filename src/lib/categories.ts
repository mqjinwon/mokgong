import type { ReactNode } from "react";
import React from "react";

export interface Tool {
  key: string;
  name: string;
  desc: string;
  featured?: boolean;
  beta?: boolean;
}

export interface Category {
  key: string;
  name: string;
  count: number;
  active: boolean;
  ghost?: boolean;
  badge?: string;
  note?: string;
  icon: (color: string) => ReactNode;
  tools: Tool[];
  bg: string;
  bgStrong: string;
  ink: string;
}

export const CATEGORIES: Category[] = [
  {
    key: "image",
    name: "Image",
    count: 8,
    active: true,
    bg: "var(--color-cat-image)",
    bgStrong: "var(--color-cat-image-strong)",
    ink: "var(--color-cat-image-ink)",
    icon: (c: string) =>
      React.createElement(
        "svg",
        { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none" },
        React.createElement("rect", {
          x: "2.5",
          y: "2.5",
          width: "15",
          height: "15",
          rx: "2",
          stroke: c,
          strokeWidth: "1.6",
        }),
        React.createElement("circle", { cx: "7", cy: "7.5", r: "1.5", fill: c }),
        React.createElement("path", {
          d: "M3.5 16 L8 11 L12 15 L16 12 L17 13.5",
          stroke: c,
          strokeWidth: "1.6",
          fill: "none",
          strokeLinejoin: "round",
        })
      ),
    tools: [
      { key: "image-crop", name: "Crop", desc: "원하는 비율로 잘라내기" },
      { key: "image-resize", name: "Resize", desc: "크기 조절 (px·%)" },
      { key: "image-compress", name: "Compress", desc: "용량 줄이기 (시각적 손실 최소)" },
      { key: "image-convert", name: "Convert", desc: "PNG ↔ JPG ↔ WebP" },
      { key: "image-bgremove", name: "Background remove", desc: "배경 자동 제거" },
      { key: "image-watermark", name: "Watermark", desc: "텍스트·이미지 워터마크" },
      { key: "image-downsample", name: "Downsample", desc: "해상도 축소" },
      { key: "image-to-pdf", name: "Image → PDF", desc: "이미지를 PDF로 변환" },
    ],
  },
  {
    key: "pdf",
    name: "PDF",
    count: 7,
    active: true,
    bg: "var(--color-cat-pdf)",
    bgStrong: "var(--color-cat-pdf-strong)",
    ink: "var(--color-cat-pdf-ink)",
    icon: (c: string) =>
      React.createElement(
        "svg",
        { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none" },
        React.createElement("path", {
          d: "M4 2 H12 L16 6 V18 H4 Z",
          stroke: c,
          strokeWidth: "1.6",
          fill: "none",
        }),
        React.createElement("path", {
          d: "M12 2 V6 H16",
          stroke: c,
          strokeWidth: "1.6",
          fill: "none",
        }),
        React.createElement(
          "text",
          {
            x: "10",
            y: "14",
            textAnchor: "middle",
            fontFamily: "JetBrains Mono",
            fontWeight: "700",
            fontSize: "5",
            fill: c,
          },
          "PDF"
        )
      ),
    tools: [
      { key: "pdf-merge", name: "Merge", desc: "여러 PDF를 하나로", featured: true },
      { key: "pdf-split", name: "Split", desc: "페이지 단위로 분리" },
      { key: "pdf-delete", name: "Delete pages", desc: "특정 페이지 제거" },
      { key: "pdf-crop", name: "Crop pages", desc: "여백 잘라내기" },
      { key: "pdf-rotate", name: "Rotate", desc: "90 / 180° 회전" },
      { key: "pdf-compress", name: "Compress", desc: "용량 줄이기", beta: true },
      { key: "pdf-to-image", name: "PDF → Image", desc: "PDF를 이미지로 변환" },
    ],
  },
  {
    key: "video",
    name: "Video",
    count: 5,
    active: true,
    bg: "var(--color-cat-video)",
    bgStrong: "var(--color-cat-video-strong)",
    ink: "var(--color-cat-video-ink)",
    icon: (c: string) =>
      React.createElement(
        "svg",
        { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none" },
        React.createElement("rect", {
          x: "2.5",
          y: "4",
          width: "11",
          height: "12",
          rx: "1.5",
          stroke: c,
          strokeWidth: "1.6",
        }),
        React.createElement("path", {
          d: "M14 8 L18 5 V15 L14 12 Z",
          stroke: c,
          strokeWidth: "1.6",
          fill: "none",
          strokeLinejoin: "round",
        })
      ),
    tools: [
      { key: "video-gif", name: "MP4 → GIF", desc: "영상을 움짤로", beta: true },
      { key: "video-trim", name: "Trim", desc: "구간 자르기", beta: true },
      { key: "video-crop", name: "Crop", desc: "프레임 자르기", beta: true },
      { key: "video-resize", name: "Resize", desc: "해상도 조절", beta: true },
      { key: "video-mute", name: "Mute", desc: "오디오 제거", beta: true },
    ],
  },
];
