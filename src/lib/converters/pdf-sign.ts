import { PDFDocument, PDFFont, PDFImage, StandardFonts, rgb } from "pdf-lib";
import { ConversionResult, SignatureElement, SignatureFontKey } from "@/types";

const FONT_MAP: Record<SignatureFontKey, StandardFonts> = {
  "times-italic": StandardFonts.TimesRomanItalic,
  helvetica: StandardFonts.Helvetica,
  "helvetica-bold": StandardFonts.HelveticaBold,
  courier: StandardFonts.Courier,
};

function hexToRgb01(hex: string) {
  const int = parseInt(hex.replace("#", ""), 16);
  return { r: ((int >> 16) & 255) / 255, g: ((int >> 8) & 255) / 255, b: (int & 255) / 255 };
}

export async function signPdf(
  file: File,
  signatures: SignatureElement[],
): Promise<ConversionResult> {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes);
  const totalPages = pdfDoc.getPageCount();

  const fontCache = new Map<SignatureFontKey, PDFFont>();
  const imageCache = new Map<string, PDFImage>();

  for (const sig of signatures) {
    const pageIndex = sig.page - 1;
    if (pageIndex < 0 || pageIndex >= totalPages) continue;
    const page = pdfDoc.getPage(pageIndex);
    const { width: pageWidthPt, height: pageHeightPt } = page.getSize();
    const topPt = (sig.yPct / 100) * pageHeightPt;
    const xPt = (sig.xPct / 100) * pageWidthPt;

    if (sig.type === "text") {
      if (!sig.text.trim()) continue;
      let font = fontCache.get(sig.fontKey);
      if (!font) {
        font = await pdfDoc.embedFont(FONT_MAP[sig.fontKey]);
        fontCache.set(sig.fontKey, font);
      }
      const { r, g, b } = hexToRgb01(sig.color);
      page.drawText(sig.text, {
        x: xPt,
        y: pageHeightPt - topPt - sig.fontSizePt,
        size: sig.fontSizePt,
        font,
        color: rgb(r, g, b),
      });
    } else {
      let image = imageCache.get(sig.dataUrl);
      if (!image) {
        const imgBytes = await (await fetch(sig.dataUrl)).arrayBuffer();
        image = sig.dataUrl.startsWith("data:image/png")
          ? await pdfDoc.embedPng(imgBytes)
          : await pdfDoc.embedJpg(imgBytes);
        imageCache.set(sig.dataUrl, image);
      }
      const widthPt = (sig.widthPct / 100) * pageWidthPt;
      const heightPt = (sig.heightPct / 100) * pageHeightPt;
      page.drawImage(image, {
        x: xPt,
        y: pageHeightPt - topPt - heightPt,
        width: widthPt,
        height: heightPt,
      });
    }
  }

  const outBytes = await pdfDoc.save();
  const baseName = file.name.replace(/\.pdf$/i, "");
  return {
    blob: new Blob([outBytes as BlobPart], { type: "application/pdf" }),
    filename: `${baseName}_signed.pdf`,
  };
}
