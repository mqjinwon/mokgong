"use client";

import {
  Input,
  Output,
  Conversion,
  BlobSource,
  BufferTarget,
  Mp4OutputFormat,
  MP4,
} from "mediabunny";

export type RemuxProgressHandler = (progress: number) => void;

export interface RemuxMuteResult {
  blob: Blob;
  method: "remux";
}

export interface RemuxTrimResult {
  blob: Blob;
  method: "remux" | "remux-expanded";
}

/**
 * Mute a video by removing the audio track using Mediabunny's streaming remux.
 * This is memory-efficient as it doesn't load the entire file into WASM memory.
 */
export async function remuxMute(
  file: File,
  onProgress?: RemuxProgressHandler
): Promise<RemuxMuteResult> {
  const input = new Input({
    source: new BlobSource(file),
    formats: [MP4],
  });

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });

  const conversion = await Conversion.init({
    input,
    output,
    tracks: "primary",
    audio: { discard: true },
    copy: { mode: "forced" },
    showWarnings: false,
  });

  if (!conversion.isValid) {
    throw new Error("Cannot remux: video track cannot be copied");
  }

  if (onProgress) {
    conversion.onProgress = (p) => onProgress(p);
  }

  await conversion.execute();

  if (!target.buffer) {
    throw new Error("Remux failed: no output buffer generated");
  }
  const blob = new Blob([target.buffer], { type: "video/mp4" });
  return { blob, method: "remux" };
}

export interface RemuxTrimOptions {
  startSec: number;
  endSec: number;
  onProgress?: RemuxProgressHandler;
}

/**
 * Trim a video to a specific time range using Mediabunny's streaming remux.
 * Uses stream copy (no re-encoding) when possible.
 * 
 * Note: Since stream copy must start at keyframes, the actual start time
 * may be slightly before the requested start time. The 'method' field
 * indicates if expansion was needed.
 */
export async function remuxTrim(
  file: File,
  options: RemuxTrimOptions
): Promise<RemuxTrimResult> {
  const { startSec, endSec, onProgress } = options;

  const input = new Input({
    source: new BlobSource(file),
    formats: [MP4],
  });

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });

  const conversion = await Conversion.init({
    input,
    output,
    tracks: "primary",
    trim: {
      start: startSec,
      end: endSec,
    },
    copy: {
      mode: "forced",
      boundaryPolicy: "expand",
      boundaryTolerance: 10,
    },
    showWarnings: false,
  });

  if (!conversion.isValid) {
    throw new Error("Cannot remux: tracks cannot be copied for this trim range");
  }

  if (onProgress) {
    conversion.onProgress = (p) => onProgress(p);
  }

  await conversion.execute();

  if (!target.buffer) {
    throw new Error("Remux failed: no output buffer generated");
  }
  const blob = new Blob([target.buffer], { type: "video/mp4" });
  return { blob, method: "remux-expanded" };
}

/**
 * Check if a file can potentially be remuxed (basic format check).
 * Returns true for MP4/MOV/M4V files which are most likely compatible.
 */
export function canAttemptRemux(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  
  const supportedExtensions = [".mp4", ".m4v", ".mov"];
  const supportedMimes = ["video/mp4", "video/x-m4v", "video/quicktime"];
  
  return (
    supportedExtensions.some((ext) => name.endsWith(ext)) ||
    supportedMimes.includes(type)
  );
}

/**
 * Get a user-friendly size limit message based on the operation type.
 */
export function getRemuxSizeMessage(isRemuxCapable: boolean): {
  threshold: number;
  warningMessage: string;
  betaNote: string;
} {
  if (isRemuxCapable) {
    return {
      threshold: 500 * 1024 * 1024,
      warningMessage:
        "파일 크기가 500MB를 초과합니다. 대용량 파일도 스트리밍 처리가 가능하지만, 브라우저 환경에 따라 시간이 걸릴 수 있습니다.",
      betaNote:
        "MP4 파일은 스트리밍 방식으로 처리되어 대용량 파일도 지원됩니다.",
    };
  }
  return {
    threshold: 200 * 1024 * 1024,
    warningMessage:
      "파일 크기가 200MB를 초과합니다. 브라우저 메모리 한계로 처리가 실패할 수 있습니다.",
    betaNote: "권장: 100MB 이하, 5분 이하 영상",
  };
}
