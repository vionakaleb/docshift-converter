import { PDFDocument } from "pdf-lib";
import { ConversionResult } from "@/types";

async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = URL.createObjectURL(file);
  });
}

export async function imagesToPdf(files: File[]): Promise<ConversionResult> {
  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const { width, height } = await getImageDimensions(file);

    let image;
    const type = file.type.toLowerCase();

    if (type === "image/png") {
      image = await pdfDoc.embedPng(bytes);
    } else if (type === "image/jpeg" || type === "image/jpg") {
      image = await pdfDoc.embedJpg(bytes);
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;

      const img = new window.Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load: ${file.name}`));
        img.src = URL.createObjectURL(file);
      });

      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);

      const pngDataUrl = canvas.toDataURL("image/png");
      const pngBase64 = pngDataUrl.split(",")[1];
      const pngBytes = Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0));
      image = await pdfDoc.embedPng(pngBytes);
    }

    const page = pdfDoc.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
  }

  const pdfBytes = await pdfDoc.save();
  return {
    blob: new Blob([pdfBytes as BlobPart], { type: "application/pdf" }),
    filename: "images.pdf",
  };
}
