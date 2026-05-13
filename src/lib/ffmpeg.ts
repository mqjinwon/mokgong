"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

export type ProgressHandler = (progress: { progress: number; time: number }) => void;

export async function getFFmpeg(onProgress?: ProgressHandler): Promise<FFmpeg> {
  if (ffmpegInstance) {
    if (onProgress) {
      ffmpegInstance.on("progress", onProgress);
    }
    return ffmpegInstance;
  }

  if (loadPromise) {
    const ff = await loadPromise;
    if (onProgress) ff.on("progress", onProgress);
    return ff;
  }

  loadPromise = (async () => {
    const ff = new FFmpeg();
    const coreURL = await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript");
    const wasmURL = await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm");
    await ff.load({ coreURL, wasmURL });
    ffmpegInstance = ff;
    return ff;
  })();

  const ff = await loadPromise;
  if (onProgress) ff.on("progress", onProgress);
  return ff;
}

export async function runFFmpeg(
  args: string[],
  inputFile: File,
  outputName: string,
  outputMime: string,
  onProgress?: ProgressHandler
): Promise<Blob> {
  const ff = await getFFmpeg(onProgress);
  const inputName = `input_${Date.now()}_${inputFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  await ff.writeFile(inputName, await fetchFile(inputFile));

  try {
    await ff.exec(args.map((a) => a.replace("INPUT", inputName).replace("OUTPUT", outputName)));
    const data = await ff.readFile(outputName);
    let buffer: ArrayBuffer;
    if (typeof data === "string") {
      buffer = new TextEncoder().encode(data).buffer as ArrayBuffer;
    } else {
      const u8 = data as unknown as Uint8Array;
      buffer = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
    }
    const blob = new Blob([buffer], { type: outputMime });
    return blob;
  } finally {
    try { await ff.deleteFile(inputName); } catch { /* ignore */ }
    try { await ff.deleteFile(outputName); } catch { /* ignore */ }
  }
}
