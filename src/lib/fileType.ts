export type FileKind = "image" | "pdf" | "video" | "unknown";

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/svg+xml",
  "image/avif",
]);

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "tif", "avif", "svg"]);

const VIDEO_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-matroska",
  "video/avi",
  "video/x-msvideo",
]);

const VIDEO_EXTS = new Set(["mp4", "webm", "ogv", "mov", "mkv", "avi"]);

export function detectFileKind(file: File): FileKind {
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (IMAGE_MIMES.has(mime) || IMAGE_EXTS.has(ext)) return "image";
  if (VIDEO_MIMES.has(mime) || VIDEO_EXTS.has(ext)) return "video";
  return "unknown";
}
