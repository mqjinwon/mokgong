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
    count: 7,
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
    ],
  },
  {
    key: "pdf",
    name: "PDF",
    count: 6,
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
  {
    key: "doc",
    name: "Document",
    count: 4,
    active: false,
    badge: "SOON",
    bg: "var(--color-cat-doc)",
    bgStrong: "var(--color-cat-doc-strong)",
    ink: "var(--color-cat-doc-ink)",
    icon: (c: string) =>
      React.createElement(
        "svg",
        { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none" },
        React.createElement("path", {
          d: "M3 3 H13 L17 7 V17 H3 Z",
          stroke: c,
          strokeWidth: "1.6",
        }),
        React.createElement("path", {
          d: "M6 10 H14 M6 13 H12",
          stroke: c,
          strokeWidth: "1.6",
          strokeLinecap: "round",
        })
      ),
    tools: [
      { key: "doc-hwp-view", name: "HWP viewer", desc: "한글 파일 미리보기" },
      { key: "doc-hwp-pdf", name: "HWP → PDF", desc: "한글을 PDF로" },
      { key: "doc-docx-pdf", name: "DOCX → PDF", desc: "워드를 PDF로" },
      { key: "doc-ocr", name: "OCR", desc: "이미지·PDF에서 텍스트 추출" },
    ],
  },
  {
    key: "dev",
    name: "Developer",
    count: 5,
    active: false,
    badge: "SOON",
    bg: "var(--color-cat-dev)",
    bgStrong: "var(--color-cat-dev-strong)",
    ink: "var(--color-cat-dev-ink)",
    icon: (c: string) =>
      React.createElement(
        "svg",
        { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none" },
        React.createElement("path", {
          d: "M7 6 L3 10 L7 14",
          stroke: c,
          strokeWidth: "1.6",
          fill: "none",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }),
        React.createElement("path", {
          d: "M13 6 L17 10 L13 14",
          stroke: c,
          strokeWidth: "1.6",
          fill: "none",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }),
        React.createElement("path", {
          d: "M11.5 4 L8.5 16",
          stroke: c,
          strokeWidth: "1.6",
          strokeLinecap: "round",
        })
      ),
    tools: [
      { key: "dev-json", name: "JSON formatter", desc: "정렬·minify·validate" },
      { key: "dev-base64", name: "Base64", desc: "인코딩 / 디코딩" },
      { key: "dev-ts", name: "Timestamp", desc: "Unix ↔ 사람 시간" },
      { key: "dev-diff", name: "Diff", desc: "두 텍스트 비교" },
      { key: "dev-yaml", name: "YAML ↔ JSON", desc: "양방향 변환" },
    ],
  },
  {
    key: "korea",
    name: "Korea utils",
    count: 3,
    active: false,
    badge: "SOON",
    bg: "var(--color-cat-korea)",
    bgStrong: "var(--color-cat-korea-strong)",
    ink: "var(--color-cat-korea-ink)",
    icon: (c: string) =>
      React.createElement(
        "svg",
        { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none" },
        React.createElement("circle", {
          cx: "10",
          cy: "10",
          r: "7.5",
          stroke: c,
          strokeWidth: "1.6",
        }),
        React.createElement("circle", { cx: "10", cy: "10", r: "2.5", fill: c })
      ),
    tools: [
      { key: "kr-train", name: "기차 예매 헬퍼", desc: "여러 노선 동시 모니터링" },
      { key: "kr-holiday", name: "공휴일 계산", desc: "한국 공휴일 + D-day" },
      { key: "kr-rrn", name: "주민번호 검증", desc: "유효성·생년월일 추출 (로컬)" },
    ],
  },
  {
    key: "ai",
    name: "AI",
    count: 2,
    active: false,
    badge: "SOON",
    bg: "var(--color-cat-ai)",
    bgStrong: "var(--color-cat-ai-strong)",
    ink: "var(--color-cat-ai-ink)",
    icon: (c: string) =>
      React.createElement(
        "svg",
        { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none" },
        React.createElement("path", {
          d: "M10 2 L11.5 8 L17 8.5 L12.5 12 L14 18 L10 14.5 L6 18 L7.5 12 L3 8.5 L8.5 8 Z",
          stroke: c,
          strokeWidth: "1.6",
          fill: "none",
          strokeLinejoin: "round",
        })
      ),
    tools: [
      { key: "ai-upscale", name: "Image upscale", desc: "AI로 해상도 향상" },
      { key: "ai-bg", name: "Background remove (AI)", desc: "정교한 분리" },
    ],
  },
  {
    key: "more",
    name: "+ 더 추가될 예정",
    count: 0,
    active: false,
    ghost: true,
    note: "한글 파일, 기차 예매, AI 유틸 — 원하는 도구를 제안해주세요.",
    bg: "var(--color-cat-more)",
    bgStrong: "var(--color-cat-more-strong)",
    ink: "var(--color-cat-more-ink)",
    icon: (c: string) =>
      React.createElement(
        "svg",
        { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none" },
        React.createElement("path", {
          d: "M10 4 V16 M4 10 H16",
          stroke: c,
          strokeWidth: "1.6",
          strokeLinecap: "round",
        })
      ),
    tools: [],
  },
];
