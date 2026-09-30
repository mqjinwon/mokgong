"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import { getHandoffFile } from "@/lib/handoff";
import { ToolShell } from "@/components/tool/ToolShell";
import { MergeTool } from "@/components/tools/pdf/Merge";
import { SplitTool } from "@/components/tools/pdf/Split";
import { DeletePagesTool } from "@/components/tools/pdf/DeletePages";
import { CropPagesTool } from "@/components/tools/pdf/CropPages";
import { RotateTool } from "@/components/tools/pdf/Rotate";
import { CompressTool } from "@/components/tools/pdf/Compress";
import { PdfToImageTool } from "@/components/tools/pdf/PdfToImage";

const pdfCat = CATEGORIES.find((c) => c.key === "pdf")!;

export default function PdfToolPage() {
  const params = useParams<{ tool: string }>();
  const toolKey = params.tool;
  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [ready, setReady] = useState(false);

  const tool = pdfCat.tools.find((t) => t.key === toolKey);

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

  const relatedTools = pdfCat.tools.filter((t) => t.key !== toolKey);

  const breadcrumbs = [
    { label: "Hub", href: "/" },
    { label: "PDF", href: "/pdf" },
    { label: tool.name },
  ];

  function renderTool() {
    if (!ready) return <div className="text-[var(--color-muted)] text-[14px]">로딩 중…</div>;
    switch (toolKey) {
      case "pdf-merge": return <MergeTool initialFile={initialFile} />;
      case "pdf-split": return <SplitTool initialFile={initialFile} />;
      case "pdf-delete": return <DeletePagesTool initialFile={initialFile} />;
      case "pdf-crop": return <CropPagesTool initialFile={initialFile} />;
      case "pdf-rotate": return <RotateTool initialFile={initialFile} />;
      case "pdf-compress": return <CompressTool initialFile={initialFile} />;
      case "pdf-to-image": return <PdfToImageTool initialFile={initialFile} />;
      default: return <div className="text-[var(--color-muted)]">준비 중입니다.</div>;
    }
  }

  return (
    <ToolShell
      tool={tool}
      category={pdfCat}
      breadcrumbs={breadcrumbs}
      relatedTools={relatedTools}
    >
      {renderTool()}
    </ToolShell>
  );
}
