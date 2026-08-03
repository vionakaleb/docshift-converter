import { NextRequest, NextResponse } from "next/server";

interface TextItem {
  str: string;
  dir: string;
  transform: number[];
  fontName: string;
  height: number;
  width: number;
  hasEOL: boolean;
}

interface TextBlock {
  text: string;
  fontSize: number;
  fontName: string;
  isBold: boolean;
  isItalic: boolean;
  x: number;
  y: number;
}

interface TableCell {
  text: string;
  x: number;
  width: number;
}

interface TableRow {
  y: number;
  cells: TableCell[];
}

function detectBold(fontName: string): boolean {
  const lower = fontName.toLowerCase();
  return lower.includes("bold") || lower.includes("black") || lower.includes("heavy");
}

function detectItalic(fontName: string): boolean {
  const lower = fontName.toLowerCase();
  return lower.includes("italic") || lower.includes("oblique");
}

function detectHeadingLevel(fontSize: number, avgFontSize: number): number {
  const ratio = fontSize / avgFontSize;
  if (ratio >= 2.0) return 1;
  if (ratio >= 1.6) return 2;
  if (ratio >= 1.3) return 3;
  if (ratio >= 1.15) return 4;
  return 0;
}

function groupIntoLines(items: TextItem[]): TextBlock[][] {
  if (items.length === 0) return [];

  const blocks: TextBlock[] = items
    .filter((item) => item.str.trim().length > 0)
    .map((item) => ({
      text: item.str,
      fontSize: Math.round(item.height),
      fontName: item.fontName,
      isBold: detectBold(item.fontName),
      isItalic: detectItalic(item.fontName),
      x: Math.round(item.transform[4]),
      y: Math.round(item.transform[5]),
    }));

  blocks.sort((a, b) => b.y - a.y || a.x - b.x);

  const lines: TextBlock[][] = [];
  let currentLine: TextBlock[] = [];
  let currentY = blocks[0]?.y;
  const yTolerance = 3;

  for (const block of blocks) {
    if (currentLine.length === 0 || Math.abs(block.y - currentY) <= yTolerance) {
      currentLine.push(block);
      currentY = block.y;
    } else {
      lines.push(currentLine);
      currentLine = [block];
      currentY = block.y;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

function detectTableRows(lines: TextBlock[][]): { tableLines: TableRow[]; textLines: TextBlock[][] } {
  const tableLines: TableRow[] = [];
  const textLines: TextBlock[][] = [];

  for (const line of lines) {
    if (line.length < 2) {
      textLines.push(line);
      continue;
    }

    const xPositions = line.map((b) => b.x).sort((a, b) => a - b);
    const gaps: number[] = [];
    for (let i = 1; i < xPositions.length; i++) {
      gaps.push(xPositions[i] - xPositions[i - 1]);
    }

    const hasConsistentGaps = gaps.length >= 1 && gaps.some((g) => g > 50);

    if (hasConsistentGaps) {
      tableLines.push({
        y: line[0].y,
        cells: line.map((b) => ({ text: b.text, x: b.x, width: 0 })),
      });
    } else {
      textLines.push(line);
    }
  }

  return { tableLines, textLines };
}

function tableRowsToMarkdown(rows: TableRow[]): string {
  if (rows.length === 0) return "";

  const maxCols = Math.max(...rows.map((r) => r.cells.length));
  const mdRows = rows.map((row) => {
    const cells = row.cells.map((c) => c.text.trim());
    while (cells.length < maxCols) cells.push("");
    return `| ${cells.join(" | ")} |`;
  });

  const separator = `| ${Array(maxCols).fill("---").join(" | ")} |`;
  return [mdRows[0], separator, ...mdRows.slice(1)].join("\n");
}

function lineToMarkdown(line: TextBlock[], avgFontSize: number): string {
  if (line.length === 0) return "";

  const headingLevel = detectHeadingLevel(line[0].fontSize, avgFontSize);

  const parts = line.map((block) => {
    let text = block.text;
    if (headingLevel > 0) return text;
    if (block.isBold && block.isItalic) text = `***${text}***`;
    else if (block.isBold) text = `**${text}**`;
    else if (block.isItalic) text = `*${text}*`;
    return text;
  });

  const joined = parts.join("");

  if (headingLevel > 0) {
    return `${"#".repeat(headingLevel)} ${joined}`;
  }

  return joined;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: { code: "NO_FILE", message: "No file provided" } }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjsLib.getDocument({ data: uint8, useSystemFonts: true });
    const pdfDoc = await loadingTask.promise;

    const allFontSizes: number[] = [];
    const pagesContent: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const content = await page.getTextContent();

      const items = content.items.filter(
        (item): item is TextItem => "str" in item && item.str.trim().length > 0
      );

      for (const item of items) {
        allFontSizes.push(Math.round(item.height));
      }

      const lines = groupIntoLines(items as TextItem[]);
      const { tableLines, textLines } = detectTableRows(lines);

      const avgFontSize =
        allFontSizes.length > 0
          ? allFontSizes.reduce((a, b) => a + b, 0) / allFontSizes.length
          : 12;

      const markdownLines = textLines.map((line) =>
        lineToMarkdown(line, avgFontSize)
      );

      if (tableLines.length > 0) {
        markdownLines.push("");
        markdownLines.push(tableRowsToMarkdown(tableLines));
        markdownLines.push("");
      }

      const pageContent = markdownLines.join("\n\n");
      pagesContent.push(pageContent);
    }

    const markdown = pagesContent.join("\n\n---\n\n");

    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${file.name.replace(/\.pdf$/i, "")}.md"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Conversion failed";
    return NextResponse.json({ error: { code: "CONVERSION_ERROR", message } }, { status: 500 });
  }
}
