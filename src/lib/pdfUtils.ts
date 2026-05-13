"use client";

export async function loadPdfDoc(file: File): Promise<{ data: ArrayBuffer; pageCount: number }> {
  const data = await file.arrayBuffer();
  const { PDFDocument } = await import("pdf-lib");
  let doc: Awaited<ReturnType<typeof PDFDocument.load>>;
  try {
    doc = await PDFDocument.load(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("encrypt") || msg.toLowerCase().includes("password")) {
      throw new Error("이 PDF는 암호화되어 있습니다. 비밀번호 보호된 PDF는 처리할 수 없습니다.");
    }
    throw e;
  }
  return { data, pageCount: doc.getPageCount() };
}

export async function renderPdfPageToCanvas(
  pdfData: ArrayBuffer,
  pageIndex: number,
  scale: number
): Promise<HTMLCanvasElement> {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }

  const loadingTask = pdfjs.getDocument({ data: pdfData.slice(0) });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas;
}
