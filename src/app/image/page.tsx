"use client";

import React from "react";
import { CategoryPage } from "@/components/CategoryPage";

export default function ImageCategoryPage() {
  return (
    <CategoryPage
      categoryKey="image"
      description="자르기·크기조절·압축·변환 등 모든 처리가 브라우저 안에서 이루어집니다."
    />
  );
}
