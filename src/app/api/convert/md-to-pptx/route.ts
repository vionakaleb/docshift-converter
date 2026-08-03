import { NextRequest, NextResponse } from "next/server";
import pptxgen from "pptxgenjs";

export const runtime = "nodejs";

// ── Inline formatting ─────────────────────────────────────────────────────

interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

/**
 * Parse inline markdown into styled text runs.
 * Handles ***bold-italic***, **bold**, *italic*, `code`, [link](url), ~~strikethrough~~.
 * Code and strikethrough map to plain text (no PPTX equivalent worth adding).
 */
function parseInline(raw: string): Run[] {
  const runs: Run[] = [];
  const RE = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[([^\]]+)\]\([^)]*\)|~~(.+?)~~/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = RE.exec(raw)) !== null) {
    if (m.index > last) runs.push({ text: raw.slice(last, m.index) });

    if (m[1] !== undefined)      runs.push({ text: m[1], bold: true, italic: true });
    else if (m[2] !== undefined) runs.push({ text: m[2], bold: true });
    else if (m[3] !== undefined) runs.push({ text: m[3], italic: true });
    else if (m[4] !== undefined) runs.push({ text: m[4] });  // inline code
    else if (m[5] !== undefined) runs.push({ text: m[5] });  // link text
    else if (m[6] !== undefined) runs.push({ text: m[6] });  // strikethrough

    last = RE.lastIndex;
  }

  if (last < raw.length) runs.push({ text: raw.slice(last) });
  return runs.length > 0 ? runs : [{ text: raw }];
}

// ── Slide model ───────────────────────────────────────────────────────────

interface SlideData {
  title: Run[];
  isH1: boolean;
  /** Each entry is one line (bullet/paragraph) expressed as styled runs. */
  bullets: Run[][];
}

function parseMarkdown(markdown: string): SlideData[] {
  const slides: SlideData[] = [];
  let current: SlideData | null = null;
  let inCodeBlock = false;

  const flush = () => { if (current) slides.push(current); };

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trimEnd();

    // Toggle code block — skip content inside
    if (line.startsWith("```")) { inCodeBlock = !inCodeBlock; continue; }
    if (inCodeBlock) continue;

    // Horizontal rules become slide breaks (new blank slide start)
    if (/^(-{3,}|\*{3,})$/.test(line)) { flush(); current = null; continue; }

    const hN       = line.match(/^(#{1,6})\s+(.+)/);
    const bullet   = line.match(/^[-*]\s+(.+)/);
    const numbered = line.match(/^\d+\.\s+(.+)/);
    const bq       = line.match(/^>\s*(.*)/);

    if (hN) {
      const level = hN[1].length;
      const text  = hN[2];
      if (level <= 2) {
        flush();
        current = { title: parseInline(text), isH1: level === 1, bullets: [] };
      } else {
        // h3–h6 → bold bullet on current slide
        if (!current) current = { title: [], isH1: true, bullets: [] };
        current.bullets.push(parseInline(text).map((r) => ({ ...r, bold: true })));
      }
    } else if (bullet) {
      if (!current) current = { title: [], isH1: true, bullets: [] };
      current.bullets.push(parseInline(bullet[1]));
    } else if (numbered) {
      if (!current) current = { title: [], isH1: true, bullets: [] };
      current.bullets.push(parseInline(numbered[1]));
    } else if (bq && bq[1].trim()) {
      if (!current) current = { title: [], isH1: true, bullets: [] };
      current.bullets.push(parseInline(bq[1].trim()));
    } else if (line.trim() && current) {
      current.bullets.push(parseInline(line.trim()));
    }
  }

  flush();
  return slides;
}

// ── pptxgenjs helpers ─────────────────────────────────────────────────────

/**
 * Convert slide bullets (array of lines, each a Run[]) to pptxgenjs text items.
 * The first run of each line gets `bullet: true`; the rest continue the paragraph.
 */
function bulletsToItems(lines: Run[][], fontSize: number, color: string): object[] {
  const items: object[] = [];
  for (const runs of lines) {
    runs.forEach((run, i) => {
      items.push({
        text: run.text,
        options: {
          ...(i === 0 ? { bullet: true } : {}),
          fontSize,
          color,
          bold:   run.bold   ?? false,
          italic: run.italic ?? false,
        },
      });
    });
  }
  return items;
}

/** Title is always bold; italic flag can still override per-run. */
function titleToItems(runs: Run[], fontSize: number, color: string): object[] {
  return runs.map((r) => ({
    text: r.text,
    options: { fontSize, color, bold: true, italic: r.italic ?? false },
  }));
}

// ── Route handler ─────────────────────────────────────────────────────────

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
        x: 0.5, y: 2.5, w: "85%", h: 1,
        fontSize: 24, align: "center", color: "363636",
      });
    } else {
      for (const s of slides) {
        const slide = prs.addSlide();

        if (s.title.length > 0) {
          slide.addText(
            titleToItems(s.title, s.isH1 ? 36 : 28, "1a1a2e"),
            { x: 0.5, y: 0.3, w: "90%", h: 1.2, valign: "middle" },
          );
        }

        if (s.bullets.length > 0) {
          slide.addText(
            bulletsToItems(s.bullets, 20, "363636"),
            { x: 0.5, y: s.title.length > 0 ? 1.8 : 0.5, w: "90%", h: 4.5, valign: "top" },
          );
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
