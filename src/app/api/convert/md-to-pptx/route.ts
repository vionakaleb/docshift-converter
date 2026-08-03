import { NextRequest, NextResponse } from "next/server";
import pptxgen from "pptxgenjs";

export const runtime = "nodejs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Run { text: string; bold?: boolean; italic?: boolean; }
type Cell   = Run[];
type PRow   = Cell[];
type PTable = PRow[];

interface BulletsBlock { kind: "bullets"; lines: Run[][]; }
interface TableBlock   { kind: "table";   header: PTable; body: PTable; }
type ContentBlock = BulletsBlock | TableBlock;
interface SlideData { title: Run[]; isH1: boolean; blocks: ContentBlock[]; }

// ─── Inline markdown parser ───────────────────────────────────────────────────

function parseInline(raw: string): Run[] {
  const runs: Run[] = [];
  const RE =
    /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[([^\]]+)\]\([^)]*\)|~~(.+?)~~/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = RE.exec(raw)) !== null) {
    if (m.index > last) runs.push({ text: raw.slice(last, m.index) });
    if      (m[1] !== undefined) runs.push({ text: m[1], bold: true, italic: true });
    else if (m[2] !== undefined) runs.push({ text: m[2], bold: true });
    else if (m[3] !== undefined) runs.push({ text: m[3], italic: true });
    else if (m[4] !== undefined) runs.push({ text: m[4] });
    else if (m[5] !== undefined) runs.push({ text: m[5] });
    else if (m[6] !== undefined) runs.push({ text: m[6] });
    last = RE.lastIndex;
  }

  if (last < raw.length) runs.push({ text: raw.slice(last) });
  return runs.length > 0 ? runs : [{ text: raw }];
}

// ─── Table helpers ────────────────────────────────────────────────────────────

function isTableLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|") && t.length > 2;
}

function splitCells(line: string): string[] {
  return line.trim().slice(1, -1).split("|").map((c) => c.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

function buildTableBlock(rawLines: string[]): TableBlock {
  const parsed = rawLines.map(splitCells);
  const sepIdx = parsed.findIndex(isSeparatorRow);
  const headerRaws = sepIdx > 0  ? parsed.slice(0, sepIdx)  : [];
  const bodyRaws   = sepIdx >= 0 ? parsed.slice(sepIdx + 1) : parsed;
  const toTable = (raws: string[][]): PTable =>
    raws.map((row) => row.map((cell) => parseInline(cell)));
  return { kind: "table", header: toTable(headerRaws), body: toTable(bodyRaws) };
}

// ─── Markdown → slide model ───────────────────────────────────────────────────

function parseMarkdown(markdown: string): SlideData[] {
  const slides: SlideData[] = [];
  let current: SlideData | null = null;
  let inCodeBlock = false;
  let pendingBullets: Run[][] = [];
  let pendingTableLines: string[] = [];

  const flushBullets = () => {
    if (pendingBullets.length > 0 && current) {
      current.blocks.push({ kind: "bullets", lines: pendingBullets });
      pendingBullets = [];
    }
  };
  const flushTable = () => {
    if (pendingTableLines.length > 0 && current) {
      current.blocks.push(buildTableBlock(pendingTableLines));
      pendingTableLines = [];
    }
  };
  const flushSlide = () => {
    flushBullets(); flushTable();
    if (current) slides.push(current);
    current = null;
  };

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trimEnd();

    if (line.startsWith("```")) { inCodeBlock = !inCodeBlock; continue; }
    if (inCodeBlock) continue;
    if (/^(-{3,}|\*{3,})$/.test(line)) { flushSlide(); continue; }

    if (isTableLine(line)) {
      flushBullets();
      pendingTableLines.push(line);
      continue;
    }
    flushTable();

    const hN     = line.match(/^(#{1,6})\s+(.+)/);
    const bullet = line.match(/^[-*]\s+(.+)/);
    const num    = line.match(/^\d+\.\s+(.+)/);
    const bq     = line.match(/^>\s*(.*)/);

    if (hN) {
      const level = hN[1].length;
      const text  = hN[2];
      if (level <= 2) {
        flushSlide();
        current = { title: parseInline(text), isH1: level === 1, blocks: [] };
      } else {
        if (!current) current = { title: [], isH1: true, blocks: [] };
        pendingBullets.push(parseInline(text).map((r) => ({ ...r, bold: true as const })));
      }
    } else if (bullet) {
      if (!current) current = { title: [], isH1: true, blocks: [] };
      pendingBullets.push(parseInline(bullet[1]));
    } else if (num) {
      if (!current) current = { title: [], isH1: true, blocks: [] };
      pendingBullets.push(parseInline(num[1]));
    } else if (bq && bq[1].trim()) {
      if (!current) current = { title: [], isH1: true, blocks: [] };
      pendingBullets.push(parseInline(bq[1].trim()));
    } else if (line.trim() && current) {
      pendingBullets.push(parseInline(line.trim()));
    }
  }

  flushSlide();
  return slides;
}

// ─── Slide splitter ───────────────────────────────────────────────────────────
//
// If a slide has more content than fits, break it into multiple slides.
// "Units" = lines for bullet blocks, rows for table blocks.

// Conservative estimates based on LAYOUT_16x9 (10 × 5.625 in) and 16pt font:
//   ~0.35 in per bullet line → (5.475 − 1.07) / 0.35 ≈ 12 with title
//   ~0.35 in per bullet line →  5.325          / 0.35 ≈ 15 without title
const MAX_UNITS_TITLED = 12;
const MAX_UNITS_BARE   = 15;

function getBlockUnits(block: ContentBlock): number {
  return block.kind === "bullets"
    ? block.lines.length
    : block.header.length + block.body.length;
}

function splitBlock(
  block: ContentBlock,
  maxUnits: number,
): [ContentBlock | null, ContentBlock | null] {
  if (block.kind === "bullets") {
    const n = Math.max(1, maxUnits);
    const first = block.lines.slice(0, n);
    const rest  = block.lines.slice(n);
    return [
      first.length > 0 ? { kind: "bullets", lines: first } : null,
      rest.length  > 0 ? { kind: "bullets", lines: rest  } : null,
    ];
  } else {
    // Keep the header on every chunk so each split table is self-contained
    const n         = Math.max(1, maxUnits - block.header.length);
    const bodyFirst = block.body.slice(0, n);
    const bodyRest  = block.body.slice(n);
    return [
      bodyFirst.length > 0
        ? { kind: "table", header: block.header, body: bodyFirst }
        : null,
      bodyRest.length > 0
        ? { kind: "table", header: block.header, body: bodyRest }
        : null,
    ];
  }
}

function splitIntoSlides(slides: SlideData[]): SlideData[] {
  const result: SlideData[] = [];

  for (const slide of slides) {
    const hasTitle  = slide.title.length > 0;
    const remaining = [...slide.blocks];
    let isFirst     = true;

    do {
      const cap = hasTitle && isFirst ? MAX_UNITS_TITLED : MAX_UNITS_BARE;
      const sub: SlideData = {
        title: isFirst ? slide.title : [],
        isH1:  slide.isH1,
        blocks: [],
      };
      let used = 0;

      while (remaining.length > 0) {
        const block = remaining[0];
        const units = getBlockUnits(block);
        const avail = cap - used;

        if (units <= avail) {
          sub.blocks.push(block);
          remaining.shift();
          used += units;
        } else if (avail > 0) {
          const [part, rest] = splitBlock(block, avail);
          if (part) { sub.blocks.push(part); used += getBlockUnits(part); }
          if (rest) remaining[0] = rest;
          else remaining.shift();
          break;
        } else {
          break; // slide full
        }
      }

      result.push(sub);
      isFirst = false;
    } while (remaining.length > 0);
  }

  return result;
}

// ─── pptxgenjs rendering helpers ─────────────────────────────────────────────

function cellToText(cell: Cell): string | object[] {
  if (cell.length === 0) return "";
  if (cell.length === 1 && !cell[0].bold && !cell[0].italic) return cell[0].text;
  return cell.map((r) => ({
    text: r.text,
    options: { bold: r.bold ?? false, italic: r.italic ?? false },
  }));
}

function titleToItems(runs: Run[], fontSize: number): object[] {
  return runs.map((r) => ({
    text: r.text,
    options: { fontSize, color: "1a1a2e", bold: true, italic: r.italic ?? false },
  }));
}

function bulletsToItems(lines: Run[][], fontSize: number): object[] {
  const items: object[] = [];
  for (const runs of lines) {
    runs.forEach((run, i) => {
      items.push({
        text: run.text,
        options: {
          ...(i === 0 ? { bullet: true } : {}),
          fontSize, color: "363636",
          bold:   run.bold   ?? false,
          italic: run.italic ?? false,
        },
      });
    });
  }
  return items;
}

function buildPptxRows(block: TableBlock, fontSize: number): object[][] {
  const rows: object[][] = [];

  for (const pRow of block.header) {
    rows.push(pRow.map((cell) => ({
      text: cellToText(cell),
      options: {
        bold: true, fill: { color: "4472C4" }, color: "FFFFFF",
        fontSize: fontSize + 1, align: "center", valign: "middle",
      },
    })));
  }

  block.body.forEach((pRow, i) => {
    rows.push(pRow.map((cell) => ({
      text: cellToText(cell),
      options: {
        fill: { color: i % 2 === 0 ? "FFFFFF" : "EEF2FA" },
        color: "363636", fontSize, align: "left", valign: "middle",
      },
    })));
  });

  return rows;
}

// ─── Layout constants (LAYOUT_16x9 = 10 × 5.625 in) ─────────────────────────

const MARGIN_X    = 0.5;
const MARGIN_Y    = 0.15;
const W_STR       = "90%";
const W_NUM       = 9.0;

const TITLE_Y     = MARGIN_Y;
const TITLE_H     = 0.82;
const CTOP_TITLED = TITLE_Y + TITLE_H + 0.1;   // ≈ 1.07
const CTOP_BARE   = MARGIN_Y;
const CBOT        = 5.625 - MARGIN_Y;            // ≈ 5.475

const BLOCK_GAP   = 0.08;
const BULLET_FONT = 16;
const TBL_FONT    = 11;
const ROW_H_MAX   = 0.38;
const ROW_H_MIN   = 0.20;

// ─── Block layout ─────────────────────────────────────────────────────────────

function allocateHeights(blocks: ContentBlock[], totalH: number): number[] {
  if (blocks.length === 0) return [];
  const totalGap = BLOCK_GAP * (blocks.length - 1);
  const usable   = Math.max(0, totalH - totalGap);
  const weights  = blocks.map((b) =>
    b.kind === "bullets"
      ? Math.max(1, b.lines.length)
      : Math.max(1, b.header.length + b.body.length),
  );
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map((w) => (w / sum) * usable);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderContent(slide: any, blocks: ContentBlock[], startY: number) {
  const availH  = CBOT - startY;
  const heights = allocateHeights(blocks, availH);
  let y = startY;

  blocks.forEach((block, i) => {
    const h = Math.max(0.15, heights[i]);

    if (block.kind === "bullets") {
      slide.addText(bulletsToItems(block.lines, BULLET_FONT), {
        x: MARGIN_X, y, w: W_STR, h,
        valign: "top",
        shrinkText: true,
      });
    } else {
      const totalRows = block.header.length + block.body.length;
      if (totalRows > 0) {
        const rowH     = Math.min(ROW_H_MAX, Math.max(ROW_H_MIN, h / totalRows));
        const fontSize = rowH < 0.26 ? 9 : rowH < 0.30 ? 10 : TBL_FONT;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        slide.addTable(buildPptxRows(block, fontSize) as any, {
          x: MARGIN_X, y, w: W_NUM,
          rowH,
          border: { pt: 1, color: "D1D5DB" },
        });
      }
    }

    y += h + BLOCK_GAP;
  });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { markdown } = await request.json();

    if (!markdown || typeof markdown !== "string") {
      return NextResponse.json(
        { error: { code: "NO_CONTENT", message: "No markdown content provided" } },
        { status: 400 },
      );
    }

    const prs = new pptxgen();
    prs.layout = "LAYOUT_16x9";

    const parsed = parseMarkdown(markdown);
    const slides = splitIntoSlides(parsed);

    if (slides.length === 0) {
      const slide = prs.addSlide();
      slide.addText(markdown.trim() || "Empty Presentation", {
        x: MARGIN_X, y: 2, w: W_STR, h: 1.5,
        fontSize: 20, align: "center", color: "363636", shrinkText: true,
      });
    } else {
      for (const s of slides) {
        const slide = prs.addSlide();
        let contentStartY: number;

        if (s.title.length > 0) {
          slide.addText(
            titleToItems(s.title, s.isH1 ? 30 : 22),
            { x: MARGIN_X, y: TITLE_Y, w: W_STR, h: TITLE_H, valign: "middle", shrinkText: true },
          );
          contentStartY = CTOP_TITLED;
        } else {
          contentStartY = CTOP_BARE;
        }

        renderContent(slide, s.blocks, contentStartY);
      }
    }

    const buffer = await prs.write({ outputType: "nodebuffer" });

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": 'attachment; filename="presentation.pptx"',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Conversion failed";
    return NextResponse.json(
      { error: { code: "CONVERSION_ERROR", message } },
      { status: 500 },
    );
  }
}
