"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadBlob } from "@/lib/download";
import { ProgressBar, DropZone } from "./shared";
import {
  canAttemptWebCodecsResize,
  getResizeSizeGuidance,
} from "@/lib/video/resize";

interface Props {
  initialFile?: File | null;
}

const RESOLUTION_PRESETS = [
  { label: "원본", w: 0 },
  { label: "1080p", w: 1920 },
  { label: "720p", w: 1280 },
  { label: "480p", w: 854 },
  { label: "360p", w: 640 },
] as const;

type ProcessingMethod = "webcodecs" | "ffmpeg" | null;

function ResizeBetaBanner({
  isWebCodecsCapable,
  betaNote,
}: {
  isWebCodecsCapable: boolean;
  betaNote: string;
}) {
  if (isWebCodecsCapable) {
    return (
      <div className="p-3 rounded-[8px] bg-green-50 border border-green-200 text-green-800 text-[13px] leading-[1.5]">
        <div className="flex items-start gap-2">
          <span className="font-bold shrink-0">BETA</span>
          <div className="space-y-1">
            <p>모든 처리는 브라우저 안에서 진행됩니다 — 서버에 업로드되지 않아요.</p>
            <ul className="text-[12px] opacity-80 list-disc list-inside space-y-0.5">
              <li>{betaNote}</li>
              <li>해상도 변경: 비디오 재인코딩 필요 (시간 소요)</li>
              <li>브라우저 탭을 닫지 마세요</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-[8px] bg-amber-50 border border-amber-200 text-amber-800 text-[13px] leading-[1.5]">
      <div className="flex items-start gap-2">
        <span className="font-bold shrink-0">BETA</span>
        <div className="space-y-1">
          <p>모든 처리는 브라우저 안에서 진행됩니다 — 서버에 업로드되지 않아요.</p>
          <ul className="text-[12px] opacity-80 list-disc list-inside space-y-0.5">
            <li>{betaNote}</li>
            <li>첫 사용 시 FFmpeg 로딩에 10~30초 소요</li>
            <li>브라우저 탭을 닫지 마세요</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ResizeSizeWarning({
  warningLevel,
  message,
}: {
  warningLevel: "none" | "info" | "warning" | "error";
  message: string;
}) {
  if (warningLevel === "none" || !message) return null;

  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-700",
    warning: "bg-amber-50 border-amber-200 text-amber-700",
    error: "bg-red-50 border-red-200 text-red-700",
  };

  return (
    <div className={`p-3 rounded-[8px] border text-[13px] ${styles[warningLevel]}`}>
      {message}
    </div>
  );
}

function ProcessingMethodIndicator({ method }: { method: "webcodecs" | "ffmpeg" }) {
  return (
    <span className="ml-2 text-[11px] font-normal text-[var(--color-muted)]">
      {method === "webcodecs" ? "스트리밍 처리" : "FFmpeg"}
    </span>
  );
}

export function ResizeTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(() => initialFile ?? null);
  const [origW, setOrigW] = useState(0);
  const [origH, setOrigH] = useState(0);
  const [targetW, setTargetW] = useState(0);
  const [targetH, setTargetH] = useState(0);
  const [lockAspect, setLockAspect] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [usedMethod, setUsedMethod] = useState<ProcessingMethod>(null);
  const dimensionsSet = useRef(false);

  const isWebCodecsCapable = useMemo(
    () => (file ? canAttemptWebCodecsResize(file) : false),
    [file]
  );

  const sizeGuidance = useMemo(
    () =>
      file
        ? getResizeSizeGuidance(file, isWebCodecsCapable)
        : {
            threshold: 0,
            canUseWebCodecs: false,
            warningLevel: "none" as const,
            message: "",
            betaNote: "권장: 100MB 이하 영상. MP4 파일은 더 큰 파일도 지원합니다.",
          },
    [file, isWebCodecsCapable]
  );

  const videoUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const handleVideoLoaded = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      if (dimensionsSet.current) return;
      const v = e.currentTarget;
      setOrigW(v.videoWidth);
      setOrigH(v.videoHeight);
      setTargetW(v.videoWidth);
      setTargetH(v.videoHeight);
      dimensionsSet.current = true;
    },
    []
  );

  function onWidthChange(val: number) {
    setTargetW(val);
    if (lockAspect && origW > 0) {
      setTargetH(Math.round((val / origW) * origH));
    }
  }

  function onHeightChange(val: number) {
    setTargetH(val);
    if (lockAspect && origH > 0) {
      setTargetW(Math.round((val / origH) * origW));
    }
  }

  function buildScale() {
    if (lockAspect) {
      return `scale=${targetW}:-2`;
    }
    return `scale=${targetW}:${targetH}`;
  }

  async function handleRun() {
    if (!file || targetW === 0) return;
    setBusy(true);
    setProgress(0);
    setError("");
    setResultBlob(null);
    setUsedMethod(null);

    try {
      if (isWebCodecsCapable) {
        try {
          const { webCodecsResize } = await import("@/lib/video/resize");
          const result = await webCodecsResize(file, {
            targetWidth: targetW,
            targetHeight: targetH,
            lockAspect,
            onProgress: (p) => setProgress(Math.round(p * 100)),
          });
          setResultBlob(result.blob);
          setUsedMethod("webcodecs");
          setProgress(100);
          return;
        } catch (webCodecsError) {
          console.warn("WebCodecs resize failed, falling back to FFmpeg:", webCodecsError);
          setProgress(0);
        }
      }

      const { runFFmpeg } = await import("@/lib/ffmpeg");
      const blob = await runFFmpeg(
        ["-i", "INPUT", "-vf", buildScale(), "-c:a", "copy", "OUTPUT"],
        file,
        "output.mp4",
        "video/mp4",
        (p) => setProgress(Math.round(p.progress * 100))
      );
      setResultBlob(blob);
      setUsedMethod("ffmpeg");
      setProgress(100);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (errMsg.includes("File could not be read") || errMsg.includes("Code=-1")) {
        setError(
          "파일을 읽을 수 없습니다. 파일이 너무 크거나 형식이 지원되지 않습니다. " +
            (isWebCodecsCapable
              ? "잠시 후 다시 시도하거나 더 작은 파일을 사용해 주세요."
              : "MP4 형식으로 변환하면 더 큰 파일도 처리할 수 있습니다.")
        );
      } else {
        setError(errMsg);
      }
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setResultBlob(null);
    setError("");
    setProgress(0);
    setOrigW(0);
    setOrigH(0);
    setTargetW(0);
    setTargetH(0);
    setUsedMethod(null);
    dimensionsSet.current = false;
  }

  if (!file) {
    return (
      <div className="flex flex-col gap-4">
        <ResizeBetaBanner isWebCodecsCapable={false} betaNote={sizeGuidance.betaNote} />
        <DropZone accept="video/*" onFile={setFile} label="동영상 파일을 선택하세요" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ResizeBetaBanner isWebCodecsCapable={isWebCodecsCapable} betaNote={sizeGuidance.betaNote} />
      <ResizeSizeWarning warningLevel={sizeGuidance.warningLevel} message={sizeGuidance.message} />
      {error && (
        <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[13px]">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Preview */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="text-[13px] font-semibold mb-2">미리보기</div>
            <video
              src={videoUrl ?? undefined}
              controls
              onLoadedMetadata={handleVideoLoaded}
              className="w-full rounded-[8px] max-h-[300px] object-contain bg-black"
            />
            {origW > 0 && (
              <div className="text-[12px] font-mono text-[var(--color-muted)] mt-2">
                원본 {origW}×{origH}
              </div>
            )}
          </div>
          {busy && <ProgressBar percent={progress} />}

          {resultBlob && (
            <div className="p-4 rounded-[12px] bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/20">
              <div className="font-semibold text-[14px] mb-2">
                결과 ({targetW}×{targetH})
                {usedMethod && <ProcessingMethodIndicator method={usedMethod} />}
              </div>
              <video
                src={URL.createObjectURL(resultBlob)}
                controls
                className="w-full rounded-[8px] max-h-[200px] object-contain bg-black"
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="w-full lg:w-56 flex flex-col gap-4">
          <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col gap-3">
            <div className="text-[13px] font-semibold">해상도</div>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-[var(--color-muted)]">너비 (px)</span>
              <input
                type="number"
                value={targetW}
                min={2}
                max={7680}
                step={2}
                onChange={(e) => onWidthChange(Number(e.target.value))}
                className="text-[13px] px-2 py-1.5 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)] w-full"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-[var(--color-muted)]">높이 (px)</span>
              <input
                type="number"
                value={targetH}
                min={2}
                max={7680}
                step={2}
                onChange={(e) => onHeightChange(Number(e.target.value))}
                disabled={lockAspect}
                className="text-[13px] px-2 py-1.5 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)] w-full disabled:opacity-50"
              />
            </label>

            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="text-[13px]">비율 고정</span>
              <div
                onClick={() => setLockAspect((v) => !v)}
                className={`w-8 h-5 rounded-full relative transition-colors shrink-0 ${
                  lockAspect
                    ? "bg-[var(--color-accent)]"
                    : "bg-[var(--color-border-strong)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    lockAspect ? "translate-x-3" : "translate-x-0.5"
                  }`}
                />
              </div>
            </label>

            {/* Resolution presets */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--color-border)]">
              <span className="text-[12px] text-[var(--color-muted)]">프리셋</span>
              <div className="flex flex-wrap gap-1.5">
                {RESOLUTION_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      if (preset.w === 0) {
                        onWidthChange(origW);
                      } else {
                        onWidthChange(preset.w);
                      }
                    }}
                    className={`px-2 py-1 rounded-[4px] text-[11px] font-medium border transition-colors ${
                      (preset.w === 0 && targetW === origW) ||
                      (preset.w !== 0 && targetW === preset.w)
                        ? "bg-[var(--color-accent)] text-white border-transparent"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)]"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button variant="primary" onClick={handleRun} disabled={busy || targetW === 0} className="w-full">
            {busy ? "처리 중…" : "처리하기"}
          </Button>
          {resultBlob && file && (
            <Button
              variant="primary"
              onClick={() => {
                const baseName = file.name.replace(/\.[^.]+$/, "");
                downloadBlob(resultBlob, `${baseName}_${targetW}x${targetH}.mp4`);
              }}
              className="w-full"
            >
              <Download size={14} className="mr-1.5" /> 다운로드
            </Button>
          )}
          <Button variant="ghost" onClick={reset} className="w-full">
            <RotateCcw size={14} className="mr-1.5" /> 초기화
          </Button>
        </div>
      </div>
    </div>
  );
}
