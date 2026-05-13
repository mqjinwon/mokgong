"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import { getHandoffFile } from "@/lib/handoff";
import { ToolShell } from "@/components/tool/ToolShell";
import dynamic from "next/dynamic";

const Mp4ToGifTool = dynamic(() => import("@/components/tools/video/Mp4ToGif").then((m) => m.Mp4ToGifTool), { ssr: false });
const TrimTool = dynamic(() => import("@/components/tools/video/Trim").then((m) => m.TrimTool), { ssr: false });
const CropTool = dynamic(() => import("@/components/tools/video/Crop").then((m) => m.CropTool), { ssr: false });
const ResizeTool = dynamic(() => import("@/components/tools/video/Resize").then((m) => m.ResizeTool), { ssr: false });
const MuteTool = dynamic(() => import("@/components/tools/video/Mute").then((m) => m.MuteTool), { ssr: false });

const videoCat = CATEGORIES.find((c) => c.key === "video")!;

export default function VideoToolPage() {
  const params = useParams<{ tool: string }>();
  const toolKey = params.tool;
  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [ready, setReady] = useState(false);

  const tool = videoCat.tools.find((t) => t.key === toolKey);

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

  const relatedTools = videoCat.tools.filter((t) => t.key !== toolKey);

  const breadcrumbs = [
    { label: "Hub", href: "/" },
    { label: "Video", href: "/video" },
    { label: tool.name },
  ];

  function renderTool() {
    if (!ready) return <div className="text-[var(--color-muted)] text-[14px]">로딩 중…</div>;
    switch (toolKey) {
      case "video-gif": return <Mp4ToGifTool initialFile={initialFile} />;
      case "video-trim": return <TrimTool initialFile={initialFile} />;
      case "video-crop": return <CropTool initialFile={initialFile} />;
      case "video-resize": return <ResizeTool initialFile={initialFile} />;
      case "video-mute": return <MuteTool initialFile={initialFile} />;
      default: return <div className="text-[var(--color-muted)]">준비 중입니다.</div>;
    }
  }

  return (
    <ToolShell
      tool={tool}
      category={videoCat}
      breadcrumbs={breadcrumbs}
      relatedTools={relatedTools}
    >
      {renderTool()}
    </ToolShell>
  );
}
