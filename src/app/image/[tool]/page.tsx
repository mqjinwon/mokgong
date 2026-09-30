"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import { getHandoffFile } from "@/lib/handoff";
import { ToolShell } from "@/components/tool/ToolShell";
import { CropTool } from "@/components/tools/image/Crop";
import { ResizeTool } from "@/components/tools/image/Resize";
import { CompressTool } from "@/components/tools/image/Compress";
import { ConvertTool } from "@/components/tools/image/Convert";
import { WatermarkTool } from "@/components/tools/image/Watermark";
import { DownsampleTool } from "@/components/tools/image/Downsample";
import { BgRemoveTool } from "@/components/tools/image/BgRemove";
import { ImageToPdfTool } from "@/components/tools/image/ImageToPdf";

const imageCat = CATEGORIES.find((c) => c.key === "image")!;

export default function ImageToolPage() {
  const params = useParams<{ tool: string }>();
  const toolKey = params.tool;
  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [ready, setReady] = useState(false);

  const tool = imageCat.tools.find((t) => t.key === toolKey);

  useEffect(() => {
    getHandoffFile().then((f) => {
      setInitialFile(f);
      setReady(true);
    });
  }, []);

  if (!tool) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--color-muted)]">
        도구를 찾을 수 없습니다: {toolKey}
      </div>
    );
  }

  const relatedTools = imageCat.tools.filter((t) => t.key !== toolKey);

  const breadcrumbs = [
    { label: "Hub", href: "/" },
    { label: "Image", href: "/image" },
    { label: tool.name },
  ];

  function renderTool() {
    if (!ready) return <div className="text-[var(--color-muted)] text-[14px]">로딩 중…</div>;
    switch (toolKey) {
      case "image-crop": return <CropTool initialFile={initialFile} />;
      case "image-resize": return <ResizeTool initialFile={initialFile} />;
      case "image-compress": return <CompressTool initialFile={initialFile} />;
      case "image-convert": return <ConvertTool initialFile={initialFile} />;
      case "image-watermark": return <WatermarkTool initialFile={initialFile} />;
      case "image-downsample": return <DownsampleTool initialFile={initialFile} />;
      case "image-bgremove": return <BgRemoveTool initialFile={initialFile} />;
      case "image-to-pdf": return <ImageToPdfTool initialFile={initialFile} />;
      default: return <div className="text-[var(--color-muted)]">준비 중입니다.</div>;
    }
  }

  return (
    <ToolShell
      tool={tool}
      category={imageCat}
      breadcrumbs={breadcrumbs}
      relatedTools={relatedTools}
    >
      {renderTool()}
    </ToolShell>
  );
}
