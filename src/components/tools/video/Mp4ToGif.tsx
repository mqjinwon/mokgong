"use client";

import React, { useState } from "react";
import { Download, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadBlob } from "@/lib/download";
import { BetaBanner, SizeWarning, ProgressBar, DropZone } from "./shared";

type QualityPreset = "small" | "balanced" | "high";
type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.5 | 2;

interface Props {
  initialFile?: File | null;
}

const QUALITY_PRESETS: Record<QualityPreset, { colors: number; dither: string; label: string; desc: string }> = {
  small: { colors: 64, dither: "none", label: "작은 파일", desc: "용량↓ 품질↓" },
  balanced: { colors: 128, dither: "bayer:bayer_scale=3", label: "균형", desc: "적당한 품질과 크기" },
  high: { colors: 256, dither: "floyd_steinberg", label: "고품질", desc: "품질↑ 용량↑" },
};

const SPEED_OPTIONS: { value: PlaybackSpeed; label: string }[] = [
  { value: 0.5, label: "0.5× (슬로우)" },
  { value: 0.75, label: "0.75×" },
  { value: 1, label: "1× (원본)" },
  { value: 1.5, label: "1.5×" },
  { value: 2, label: "2× (빠르게)" },
];

export function Mp4ToGifTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(() => initialFile ?? null);
  const [fps, setFps] = useState(15);
  const [width, setWidth] = useState(480);
  const [startSec, setStartSec] = useState(0);
  const [duration, setDuration] = useState(5);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>("balanced");
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customColors, setCustomColors] = useState(128);
  const [customDither, setCustomDither] = useState<"none" | "bayer" | "floyd_steinberg">("bayer");
  const [useCustom, setUseCustom] = useState(false);

  async function handleRun() {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setError("");
    setResultBlob(null);
    try {
      const { runFFmpeg } = await import("@/lib/ffmpeg");
      
      const preset = useCustom ? null : QUALITY_PRESETS[qualityPreset];
      const colors = useCustom ? customColors : preset!.colors;
      const ditherOpt = useCustom 
        ? (customDither === "none" ? "none" : customDither === "bayer" ? "bayer:bayer_scale=3" : "floyd_steinberg")
        : preset!.dither;
      
      const outputFps = fps * playbackSpeed;
      const ptsMultiplier = 1 / playbackSpeed;
      
      const palettegenOpts = `max_colors=${colors}`;
      const paletteuseOpts = ditherOpt === "none" ? "dither=none" : `dither=${ditherOpt}`;
      
      const paletteFilter = playbackSpeed === 1
        ? `fps=${outputFps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=${palettegenOpts}[p];[b][p]paletteuse=${paletteuseOpts}`
        : `setpts=${ptsMultiplier.toFixed(4)}*PTS,fps=${outputFps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=${palettegenOpts}[p];[b][p]paletteuse=${paletteuseOpts}`;
      
      const blob = await runFFmpeg(
        [
          "-ss", String(startSec),
          "-t", String(duration),
          "-i", "INPUT",
          "-vf", paletteFilter,
          "-loop", "0",
          "OUTPUT",
        ],
        file,
        "output.gif",
        "image/gif",
        (p) => setProgress(Math.round(p.progress * 100))
      );
      setResultBlob(blob);
      setProgress(100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setResultBlob(null);
    setError("");
    setProgress(0);
  }

  if (!file) {
    return (
      <div className="flex flex-col gap-4">
        <BetaBanner />
        <DropZone accept="video/*" onFile={setFile} label="MP4 파일을 선택하세요" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <BetaBanner />
      <SizeWarning file={file} />
      {error && (
        <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>
      )}

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Preview */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="text-[13px] font-semibold mb-2">미리보기</div>
            <video
              src={URL.createObjectURL(file)}
              controls
              className="w-full rounded-[8px] max-h-[300px] object-contain bg-black"
            />
            <div className="text-[12px] font-mono text-[var(--color-muted)] mt-2">{file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB</div>
          </div>

          {resultBlob && (
            <div className="p-4 rounded-[12px] bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/20">
              <div className="font-semibold text-[14px] mb-2">결과 GIF</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(resultBlob)} alt="result gif" className="w-full rounded-[8px] max-h-[300px] object-contain" />
            </div>
          )}

          {busy && <ProgressBar percent={progress} />}
        </div>

        {/* Controls */}
        <div className="w-full lg:w-72 flex flex-col gap-4">
          <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col gap-3">
            <div className="text-[13px] font-semibold">기본 옵션</div>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-[var(--color-muted)]">품질 프리셋</span>
              <select
                value={useCustom ? "custom" : qualityPreset}
                onChange={(e) => {
                  if (e.target.value === "custom") {
                    setUseCustom(true);
                    setShowAdvanced(true);
                  } else {
                    setUseCustom(false);
                    setQualityPreset(e.target.value as QualityPreset);
                  }
                }}
                className="text-[13px] px-2 py-1.5 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)]"
              >
                {Object.entries(QUALITY_PRESETS).map(([key, { label, desc }]) => (
                  <option key={key} value={key}>{label} — {desc}</option>
                ))}
                <option value="custom">사용자 정의</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-[var(--color-muted)]">재생 속도 (배속)</span>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value) as PlaybackSpeed)}
                className="text-[13px] px-2 py-1.5 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)]"
              >
                {SPEED_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[12px] text-[var(--color-muted)]">FPS</span>
                <select
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="text-[13px] px-2 py-1.5 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)]"
                >
                  <option value={8}>8fps</option>
                  <option value={10}>10fps</option>
                  <option value={12}>12fps</option>
                  <option value={15}>15fps</option>
                  <option value={20}>20fps</option>
                  <option value={24}>24fps</option>
                  <option value={30}>30fps</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[12px] text-[var(--color-muted)]">너비 (px)</span>
                <select
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="text-[13px] px-2 py-1.5 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)]"
                >
                  <option value={240}>240px (작음)</option>
                  <option value={320}>320px</option>
                  <option value={480}>480px (기본)</option>
                  <option value={640}>640px</option>
                  <option value={800}>800px (큼)</option>
                  <option value={1280}>1280px (HD)</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[12px] text-[var(--color-muted)]">시작 (초)</span>
                <input
                  type="number"
                  value={startSec}
                  min={0}
                  step={0.5}
                  onChange={(e) => setStartSec(Number(e.target.value))}
                  className="text-[13px] px-2 py-1.5 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)] w-full"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[12px] text-[var(--color-muted)]">길이 (초)</span>
                <input
                  type="number"
                  value={duration}
                  min={1}
                  max={60}
                  step={0.5}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="text-[13px] px-2 py-1.5 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)] w-full"
                />
              </label>
            </div>
          </div>

          {/* Advanced options */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between text-[12px] text-[var(--color-muted)] hover:text-[var(--color-fg)] px-1"
          >
            <span>고급 옵션</span>
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showAdvanced && (
            <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useCustom}
                  onChange={(e) => setUseCustom(e.target.checked)}
                  className="rounded"
                />
                <span className="text-[12px]">사용자 정의 품질 사용</span>
              </label>

              {useCustom && (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-[12px] text-[var(--color-muted)]">색상 수 ({customColors})</span>
                    <input
                      type="range"
                      min={16}
                      max={256}
                      step={8}
                      value={customColors}
                      onChange={(e) => setCustomColors(Number(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-[10px] text-[var(--color-muted)]">
                      적을수록 파일 작음, 많을수록 색상 풍부
                    </span>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[12px] text-[var(--color-muted)]">디더링</span>
                    <select
                      value={customDither}
                      onChange={(e) => setCustomDither(e.target.value as "none" | "bayer" | "floyd_steinberg")}
                      className="text-[13px] px-2 py-1.5 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)]"
                    >
                      <option value="none">없음 (플랫한 색상)</option>
                      <option value="bayer">Bayer (패턴 디더링)</option>
                      <option value="floyd_steinberg">Floyd-Steinberg (자연스러운 그라데이션)</option>
                    </select>
                  </label>
                </>
              )}

              <div className="text-[11px] text-[var(--color-muted)] bg-[var(--color-bg)] p-2 rounded-[6px]">
                <strong>팁:</strong> 파일 크기를 줄이려면 색상 수↓, FPS↓, 너비↓<br />
                부드러운 애니메이션은 FPS↑, 좋은 색감은 색상 수↑
              </div>
            </div>
          )}

          {/* Estimated impact */}
          <div className="text-[11px] text-[var(--color-muted)] p-2 rounded-[6px] bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="font-semibold mb-1">예상 결과</div>
            <div className="space-y-0.5">
              <div>• 출력 프레임: ~{Math.ceil(duration * fps)} 프레임</div>
              <div>• GIF 재생 시간: ~{(duration / playbackSpeed).toFixed(1)}초</div>
              {playbackSpeed !== 1 && (
                <div className="text-[var(--color-accent)]">• {playbackSpeed > 1 ? "빠른" : "느린"} 재생 ({playbackSpeed}배속)</div>
              )}
            </div>
          </div>

          <Button variant="primary" onClick={handleRun} disabled={busy} className="w-full">
            {busy ? "처리 중…" : "처리하기"}
          </Button>
          {resultBlob && file && (
            <Button variant="primary" onClick={() => {
              const baseName = file.name.replace(/\.[^.]+$/, "");
              downloadBlob(resultBlob, `${baseName}.gif`);
            }} className="w-full">
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
