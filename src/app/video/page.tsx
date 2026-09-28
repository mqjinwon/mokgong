"use client";

import React from "react";
import { CategoryPage } from "@/components/CategoryPage";

export default function VideoCategoryPage() {
  return (
    <CategoryPage
      categoryKey="video"
      description="GIF 변환·자르기·크롭·리사이즈·음소거 등 모든 처리가 브라우저 안에서 이루어집니다."
      processingNote="FFmpeg.wasm을 사용해 브라우저 안에서 처리합니다. 파일이 서버로 전송되지 않습니다."
    />
  );
}
