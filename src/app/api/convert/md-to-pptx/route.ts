import { NextRequest, NextResponse } from "next/server";
import pptxgen from "pptxgenjs";

export const runtime = "nodejs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Run   { text: string; bold?: boolean; italic?: boolean; }
type Cell       = Run[];        // one table cell = styled text runs
type PRow       = Cell[];       // one table row  = array of cells
type PTable     = PRow[];       // many rows

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
    else if (m[4] !== undefined) runs.push({ text: m[4] });   // `code`  → plain
    else if (m[5] !== undefined) runs.push({ text: m[5] });   // [link]  → text
    else if (m[6] !== undefined) runs.push({ text: m[6] });   // ~~str~~ → plain
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

/** Split `| a | b | c |` into trimmed cell strings. */
function splitCells(line: string): string[] {
  return line.trim().slice(1, -1).split("|").map((c) => c.trim());
}

/** Separator rows look like `|---|:---:|---:|`. */
function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

/**
 * Turn buffered raw table lines into a TableBlock.
 * Rows before the `---|---` separator → header; rows after → body.
 */
function buildTableBlock(rawLines: string[]): TableBlock {
  const parsed = rawLines.map(splitCells);
  const sepIdx = parsed.findIndex(isSeparatorRow);

  // header rows: everything before the separator (usually one row)
  const headerRaws = sepIdx > 0  ? parsed.slice(0, sepIdx)  : [];
  // body rows:   everything after the separator (or all rows if no separator)
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
    flushBullets();
    flushTable();
    if (current) slides.push(current);
    current = null;
  };

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trimEnd();

    // Code fence — skip interior content
    if (line.startsWith("```")) { inCodeBlock = !inCodeBlock; continue; }
    if (inCodeBlock) continue;

    // Horizontal rule → slide break
    if (/^(-{3,}|\*{3,})$/.test(line)) { flushSlide(); continue; }

    // Table row — accumulate
    if (isTableLine(line)) {
      flushBullets();           // close any open bullet block before the table
      pendingTableLines.push(line);
      continue;
    }

    // Non-table line → flush any buffered table rows
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
        // h3–h6 → bold bullet on the current slide (no new slide)
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

// ─── pptxgenjs rendering helpers ─────────────────────────────────────────────

/**
 * Convert a Cell (Run[]) into pptxgenjs cell text.
 * Returns a plain string for simple cells, IText[] for formatted ones.
 */
function cellToText(cell: Cell): string | object[] {
  if (cell.length === 0) return "";
  if (cell.length === 1 && !cell[0].bold && !cell[0].italic) return cell[0].text;
  return cell.map((r) => ({
    text: r.text,
    options: { bold: r.bold ?? false, italic: r.italic ?? false },
  }));
}

function titleToItems(runs: Run[], fontSize: number, color: string): object[] {
  return runs.map((r) => ({
    text: r.text,
    options: { fontSize, color, bold: true, italic: r.italic ?? false },
  }));
}

/**
 * Build a flat text-item array for addText (bullets / paragraphs).
 * First run in each line gets `bullet: true` to open a new paragraph.
 */
function bulletsToItems(lines: Run[][], fontSize: number, color: string): object[] {
  const items: object[] = [];
  for (const runs of lines) {
    runs.forEach((run, i) => {
      items.push({
        text: run.text,
        options: {
          ...(i === 0 ? { bullet: true } : {}),
          fontSize, color,
          bold:   run.bold   ?? false,
          italic: run.italic ?? false,
        },
      });
    });
  }
  return items;
}

/** Build pptxgenjs rows for addTable — header rows with accent fill, body with zebra stripes. */
function buildPptxRows(block: TableBlock): object[][] {
  const rows: object[][] = [];

  for (const pRow of block.header) {
    rows.push(
      pRow.map((cell) => ({
        text: cellToText(cell),
        options: {
          bold: true,
          fill:   { color: "4472C4" },
          color:  "FFFFFF",
          fontSize: 14,
          align:  "center",
          valign: "middle",
        },
      })),
    );
  }

  block.body.forEach((pRow, i) => {
    rows.push(
      pRow.map((cell) => ({
        text: cellToText(cell),
        options: {
          fill:   { color: i % 2 === 0 ? "FFFFFF" : "EEF2FA" },
          color:  "363636",
          fontSize: 13,
          align:  "left",
          valign: "middle",
        },
      })),
    );
  });

  return rows;
}

// ─── Layout constants (LAYOUT_16x9 = 10 × 7.5 in) ────────────────────────────

const MARGIN_X    = 0.5;
const W_STR       = "90%";  // percentage for addText
const W_NUM       = 9.0;    // inches for addTable
const ROW_H       = 0.42;   // table row height (in)
const BULLET_H    = 0.45;   // estimated height per bullet line (in)
const TITLE_END_Y = 1.8;
const MAX_Y       = 7.0;

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

    const slides = parseMarkdown(markdown);

    if (slides.length === 0) {
      const slide = prs.addSlide();
      slide.addText(markdown.trim() || "Empty Presentation", {
        x: MARGIN_X, y: 2.5, w: W_STR, h: 1,
        fontSize: 24, align: "center", color: "363636",
      });
    } else {
      for (const s of slides) {
        const slide = prs.addSlide();

        if (s.title.length > 0) {
          slide.addText(
            titleToItems(s.title, s.isH1 ? 36 : 28, "1a1a2e"),
            { x: MARGIN_X, y: 0.3, w: W_STR, h: 1.2, valign: "middle" },
          );
        }

        let y = s.title.length > 0 ? TITLE_END_Y : 0.5;

        for (const block of s.blocks) {
          if (y >= MAX_Y) break;

          if (block.kind === "bullets") {
            const h = Math.min(block.lines.length * BULLET_H, MAX_Y - y);
            slide.addText(bulletsToItems(block.lines, 18, "363636"), {
              x: MARGIN_X, y, w: W_STR, h, valign: "top",
            });
            y += h + 0.15;
          } else {
            const totalRows = block.header.length + block.body.length;
            const pptxRows  = buildPptxRows(block);
            if (pptxRows.length > 0) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              slide.addTable(pptxRows as any, {
                x: MARGIN_X, y, w: W_NUM,
                rowH: ROW_H,
                border: { pt: 1, color: "D1D5DB" },
              });
              y += totalRows * ROW_H + 0.3;
            }
          }
        }
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
