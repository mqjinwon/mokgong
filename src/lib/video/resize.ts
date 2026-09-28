"use client";

import {
  Input,
  Output,
  Conversion,
  BlobSource,
  BufferTarget,
  Mp4OutputFormat,
  MP4,
  getFirstEncodableVideoCodec,
} from "mediabunny";

export type ResizeProgressHandler = (progress: number) => void;

export interface ResizeResult {
  blob: Blob;
  method: "webcodecs" | "ffmpeg";
}

export interface ResizeOptions {
  targetWidth: number;
  targetHeight: number;
  lockAspect: boolean;
  onProgress?: ResizeProgressHandler;
}

type SupportedVideoCodec = "avc" | "hevc" | "vp9" | "av1";

export async function checkWebCodecsResizeSupport(
  width: number,
  height: number
): Promise<{ supported: boolean; codec: SupportedVideoCodec | null; reason?: string }> {
  if (typeof VideoEncoder === "undefined" || typeof VideoDecoder === "undefined") {
    return { supported: false, codec: null, reason: "WebCodecs API가 지원되지 않습니다" };
  }

  const codec = await getFirstEncodableVideoCodec(
    ["avc", "hevc", "vp9", "av1"],
    { width, height }
  );

  if (!codec) {
    return { 
      supported: false, 
      codec: null, 
      reason: `이 해상도(${width}x${height})를 인코딩할 수 있는 코덱이 없습니다` 
    };
  }

  return { supported: true, codec: codec as SupportedVideoCodec };
}

export async function webCodecsResize(
  file: File,
  options: ResizeOptions
): Promise<ResizeResult> {
  const { targetWidth, targetHeight, lockAspect, onProgress } = options;

  const codecCheck = await checkWebCodecsResizeSupport(targetWidth, targetHeight);
  if (!codecCheck.supported || !codecCheck.codec) {
    throw new Error(codecCheck.reason || "WebCodecs resize not supported");
  }

  const input = new Input({
    source: new BlobSource(file),
    formats: [MP4],
  });

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });

  const roundToEven = (n: number) => Math.round(n / 2) * 2;
  const finalWidth = roundToEven(targetWidth);
  const finalHeight = roundToEven(targetHeight);

  const videoOptions: {
    width: number;
    height?: number;
    fit?: "fill" | "contain" | "cover";
    codec: SupportedVideoCodec;
    quality: number;
  } = {
    width: finalWidth,
    codec: codecCheck.codec,
    quality: 0.8,
  };

  if (lockAspect) {
    videoOptions.fit = "contain";
  } else {
    videoOptions.height = finalHeight;
    videoOptions.fit = "fill";
  }

  const conversion = await Conversion.init({
    input,
    output,
    tracks: "primary",
    video: videoOptions,
    audio: { codec: "aac", quality: 0.7 },
    showWarnings: false,
  });

  if (!conversion.isValid) {
    const discardedReasons = conversion.discardedTracks
      .map((d) => d.reason)
      .filter((r, i, arr) => arr.indexOf(r) === i);
    const reasonMsg = discardedReasons.length > 0 
      ? discardedReasons.join("; ") 
      : "video format not supported";
    throw new Error(`Cannot resize: ${reasonMsg}`);
  }

  if (onProgress) {
    conversion.onProgress = (p) => onProgress(p);
  }

  await conversion.execute();

  if (!target.buffer) {
    throw new Error("Resize failed: no output buffer generated");
  }

  const blob = new Blob([target.buffer], { type: "video/mp4" });
  return { blob, method: "webcodecs" };
}

export function canAttemptWebCodecsResize(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  const supportedExtensions = [".mp4", ".m4v", ".mov"];
  const supportedMimes = ["video/mp4", "video/x-m4v", "video/quicktime"];

  return (
    supportedExtensions.some((ext) => name.endsWith(ext)) ||
    supportedMimes.includes(type)
  );
}

export interface ResizeSizeGuidance {
  threshold: number;
  canUseWebCodecs: boolean;
  warningLevel: "none" | "info" | "warning" | "error";
  message: string;
  betaNote: string;
}

export function getResizeSizeGuidance(
  file: File,
  isWebCodecsCapable: boolean
): ResizeSizeGuidance {
  const sizeMB = file.size / 1024 / 1024;

  if (isWebCodecsCapable) {
    if (sizeMB <= 500) {
      return {
        threshold: 500 * 1024 * 1024,
        canUseWebCodecs: true,
        warningLevel: "none",
        message: "",
        betaNote: "MP4 파일은 스트리밍 방식으로 처리되어 대용량 파일도 지원됩니다.",
      };
    }
    if (sizeMB <= 2000) {
      return {
        threshold: 2000 * 1024 * 1024,
        canUseWebCodecs: true,
        warningLevel: "info",
        message: `파일 크기(${sizeMB.toFixed(0)}MB)가 큽니다. 스트리밍 처리가 가능하지만 시간이 걸릴 수 있습니다.`,
        betaNote: "대용량 MP4도 스트리밍으로 처리 가능 (re-encoding 필요).",
      };
    }
    return {
      threshold: Infinity,
      canUseWebCodecs: true,
      warningLevel: "warning",
      message: `파일 크기(${sizeMB.toFixed(0)}MB)가 매우 큽니다. 처리에 상당한 시간이 소요될 수 있으며, 브라우저 환경에 따라 실패할 수 있습니다.`,
      betaNote: "초대용량 파일은 처리 시간이 길고 브라우저 제약이 있을 수 있습니다.",
    };
  }

  if (sizeMB <= 100) {
    return {
      threshold: 100 * 1024 * 1024,
      canUseWebCodecs: false,
      warningLevel: "none",
      message: "",
      betaNote: "권장: 100MB 이하 영상. MP4 파일은 더 큰 파일도 지원합니다.",
    };
  }
  if (sizeMB <= 200) {
    return {
      threshold: 200 * 1024 * 1024,
      canUseWebCodecs: false,
      warningLevel: "warning",
      message: `파일 크기(${sizeMB.toFixed(0)}MB)가 큽니다. FFmpeg로 처리되며 메모리 사용량이 높을 수 있습니다.`,
      betaNote: "100MB 초과 파일은 처리가 느리거나 실패할 수 있습니다. MP4로 변환하면 더 큰 파일도 지원됩니다.",
    };
  }
  return {
    threshold: 200 * 1024 * 1024,
    canUseWebCodecs: false,
    warningLevel: "error",
    message: `파일 크기(${sizeMB.toFixed(0)}MB)가 200MB를 초과합니다. 브라우저 메모리 한계로 처리가 실패할 가능성이 높습니다. MP4 파일을 사용하면 스트리밍 처리로 대용량도 지원됩니다.`,
    betaNote: "200MB 초과 파일은 MP4 형식을 권장합니다.",
  };
}
