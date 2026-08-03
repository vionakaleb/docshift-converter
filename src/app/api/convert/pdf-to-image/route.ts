import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const scaleParam = formData.get("scale") as string | null;
    const scale = scaleParam ? parseFloat(scaleParam) : 2;

    if (!file) {
      return NextResponse.json({ error: { code: "NO_FILE", message: "No file provided" } }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjsLib.getDocument({ data: uint8, useSystemFonts: true });
    const pdfDoc = await loadingTask.promise;

    const pages: { page: number; width: number; height: number }[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      pages.push({
        page: pageNum,
        width: Math.round(viewport.width),
        height: Math.round(viewport.height),
      });
    }

    return NextResponse.json({
      totalPages: pdfDoc.numPages,
      scale,
      pages,
      message: "PDF page info retrieved. Use client-side canvas rendering for images.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process PDF";
    return NextResponse.json({ error: { code: "PROCESS_ERROR", message } }, { status: 500 });
  }
}
