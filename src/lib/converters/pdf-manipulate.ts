import { PDFDocument } from "pdf-lib";
import { CropArea, ConversionResult, PageRange } from "@/types";

export async function mergePdfs(files: File[]): Promise<ConversionResult> {
  const merged = await PDFDocument.create();

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const source = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }

  const pdfBytes = await merged.save();
  return {
    blob: new Blob([pdfBytes as BlobPart], { type: "application/pdf" }),
    filename: "merged.pdf",
  };
}

export async function splitPdf(
  file: File,
  pageIndices?: number[]
): Promise<ConversionResult[]> {
  const bytes = await file.arrayBuffer();
  const source = await PDFDocument.load(bytes);
  const totalPages = source.getPageCount();

  const indices = pageIndices || Array.from({ length: totalPages }, (_, i) => i);
  const results: ConversionResult[] = [];
  const baseName = file.name.replace(/\.pdf$/i, "");

  for (const index of indices) {
    if (index < 0 || index >= totalPages) continue;

    const singleDoc = await PDFDocument.create();
    const [copiedPage] = await singleDoc.copyPages(source, [index]);
    singleDoc.addPage(copiedPage);

    const pdfBytes = await singleDoc.save();
    results.push({
      blob: new Blob([pdfBytes as BlobPart], { type: "application/pdf" }),
      filename: `${baseName}_page_${index + 1}.pdf`,
    });
  }

  return results;
}

export async function splitPdfByRanges(
  file: File,
  ranges: PageRange[]
): Promise<ConversionResult[]> {
  const bytes = await file.arrayBuffer();
  const source = await PDFDocument.load(bytes);
  const totalPages = source.getPageCount();
  const baseName = file.name.replace(/\.pdf$/i, "");
  const results: ConversionResult[] = [];

  for (const range of ranges) {
    const start = Math.max(1, range.start);
    const end = Math.min(totalPages, range.end);
    if (start > end) continue;

    const indices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
    const rangeDoc = await PDFDocument.create();
    const copiedPages = await rangeDoc.copyPages(source, indices);
    copiedPages.forEach((page) => rangeDoc.addPage(page));

    const pdfBytes = await rangeDoc.save();
    const label = start === end ? `page_${start}` : `pages_${start}-${end}`;
    results.push({
      blob: new Blob([pdfBytes as BlobPart], { type: "application/pdf" }),
      filename: `${baseName}_${label}.pdf`,
    });
  }

  return results;
}

export async function cropPdf(
  file: File,
  cropArea: CropArea,
  pageIndices?: number[]
): Promise<ConversionResult> {
  const bytes = await file.arrayBuffer();
  const source = await PDFDocument.load(bytes);
  const totalPages = source.getPageCount();

  const indices = pageIndices || Array.from({ length: totalPages }, (_, i) => i);

  for (const index of indices) {
    if (index < 0 || index >= totalPages) continue;

    const page = source.getPage(index);
    const { width, height } = page.getSize();

    const pdfX = (cropArea.x / 100) * width;
    const pdfY = height - ((cropArea.y + cropArea.height) / 100) * height;
    const pdfWidth = (cropArea.width / 100) * width;
    const pdfHeight = (cropArea.height / 100) * height;

    page.setCropBox(pdfX, pdfY, pdfWidth, pdfHeight);
  }

  const pdfBytes = await source.save();
  const baseName = file.name.replace(/\.pdf$/i, "");
  return {
    blob: new Blob([pdfBytes as BlobPart], { type: "application/pdf" }),
    filename: `${baseName}_cropped.pdf`,
  };
}

export async function getPdfPageCount(file: File): Promise<number> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}
