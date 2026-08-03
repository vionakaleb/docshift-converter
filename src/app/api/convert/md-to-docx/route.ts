import { NextRequest, NextResponse } from "next/server";
import { marked } from "marked";
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from "docx";

interface ParsedBlock {
  type: "heading" | "paragraph" | "code" | "table" | "hr";
  level?: number;
  runs?: InlineRun[];
  text?: string;
  rows?: string[][];
  alignments?: string[];
}

interface InlineRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

function parseInlineFormatting(html: string): InlineRun[] {
  const runs: InlineRun[] = [];
  const stripped = html.replace(/<\/?p>/g, "").replace(/<br\s*\/?>/g, "\n");

  const regex = /(<strong>|<\/strong>|<em>|<\/em>|<code>|<\/code>|<a[^>]*>|<\/a>)/g;
  let lastIndex = 0;
  let isBold = false;
  let isItalic = false;
  let isCode = false;

  let match;
  while ((match = regex.exec(stripped)) !== null) {
    const before = stripped.slice(lastIndex, match.index);
    if (before) {
      const decoded = decodeHtmlEntities(before);
      runs.push({ text: decoded, bold: isBold, italic: isItalic, code: isCode });
    }

    const tag = match[1];
    if (tag === "<strong>") isBold = true;
    else if (tag === "</strong>") isBold = false;
    else if (tag === "<em>") isItalic = true;
    else if (tag === "</em>") isItalic = false;
    else if (tag === "<code>") isCode = true;
    else if (tag === "</code>") isCode = false;

    lastIndex = regex.lastIndex;
  }

  const remaining = stripped.slice(lastIndex);
  if (remaining) {
    const decoded = decodeHtmlEntities(remaining.replace(/<[^>]*>/g, ""));
    if (decoded) {
      runs.push({ text: decoded, bold: isBold, italic: isItalic, code: isCode });
    }
  }

  return runs.length > 0 ? runs : [{ text: "" }];
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function htmlToBlocks(html: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const blockRegex =
    /<(h[1-6]|p|pre|table|hr)[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>/g;

  let match;
  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1];
    const content = match[2] || "";

    if (!tag || match[0] === "<hr>" || match[0] === "<hr/>") {
      blocks.push({ type: "hr" });
      continue;
    }

    if (tag.startsWith("h")) {
      const level = parseInt(tag[1]);
      const plainText = content.replace(/<[^>]*>/g, "");
      blocks.push({
        type: "heading",
        level,
        runs: [{ text: decodeHtmlEntities(plainText) }],
      });
    } else if (tag === "pre") {
      const codeContent = content
        .replace(/<code[^>]*>/g, "")
        .replace(/<\/code>/g, "");
      blocks.push({
        type: "code",
        text: decodeHtmlEntities(codeContent),
      });
    } else if (tag === "table") {
      const rows: string[][] = [];
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
      let rowMatch;
      while ((rowMatch = rowRegex.exec(content)) !== null) {
        const cells: string[] = [];
        const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/g;
        let cellMatch;
        while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
          cells.push(decodeHtmlEntities(cellMatch[1].replace(/<[^>]*>/g, "")));
        }
        if (cells.length > 0) rows.push(cells);
      }
      if (rows.length > 0) {
        blocks.push({ type: "table", rows });
      }
    } else {
      blocks.push({ type: "paragraph", runs: parseInlineFormatting(content) });
    }
  }

  return blocks;
}

function getHeadingLevel(level: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  const map: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6,
  };
  return map[level] || HeadingLevel.HEADING_1;
}

function buildDocxElements(blocks: ParsedBlock[]): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  for (const block of blocks) {
    if (block.type === "heading" && block.runs) {
      elements.push(
        new Paragraph({
          heading: getHeadingLevel(block.level || 1),
          children: block.runs.map(
            (r) =>
              new TextRun({
                text: r.text,
                bold: r.bold || block.level === 1 || block.level === 2,
              })
          ),
        })
      );
    } else if (block.type === "paragraph" && block.runs) {
      elements.push(
        new Paragraph({
          children: block.runs.map(
            (r) =>
              new TextRun({
                text: r.text,
                bold: r.bold,
                italics: r.italic,
                font: r.code ? "Courier New" : undefined,
                size: r.code ? 20 : undefined,
              })
          ),
          spacing: { after: 120 },
        })
      );
    } else if (block.type === "code") {
      const lines = (block.text || "").split("\n");
      for (const line of lines) {
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line || " ",
                font: "Courier New",
                size: 20,
              }),
            ],
            spacing: { after: 0 },
          })
        );
      }
    } else if (block.type === "table" && block.rows) {
      const borderStyle = {
        style: BorderStyle.SINGLE,
        size: 1,
        color: "CCCCCC",
      };
      const borders = {
        top: borderStyle,
        bottom: borderStyle,
        left: borderStyle,
        right: borderStyle,
      };

      const tableRows = block.rows.map(
        (row, rowIndex) =>
          new TableRow({
            children: row.map(
              (cellText) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cellText,
                          bold: rowIndex === 0,
                          size: 22,
                        }),
                      ],
                      alignment: AlignmentType.LEFT,
                    }),
                  ],
                  width: { size: Math.floor(9000 / row.length), type: WidthType.DXA },
                  borders,
                })
            ),
          })
      );

      elements.push(
        new Table({
          rows: tableRows,
          width: { size: 9000, type: WidthType.DXA },
        })
      );
    } else if (block.type === "hr") {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: "" })],
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
          spacing: { before: 200, after: 200 },
        })
      );
    }
  }

  return elements;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: { code: "NO_FILE", message: "No file provided" } }, { status: 400 });
    }

    const markdown = await file.text();
    const htmlContent = await marked(markdown, { gfm: true, breaks: true });
    const blocks = htmlToBlocks(htmlContent);
    const elements = buildDocxElements(blocks);

    const doc = new Document({
      sections: [{ children: elements }],
    });

    const buffer = await Packer.toBuffer(doc);
    const uint8 = new Uint8Array(buffer);

    return new NextResponse(uint8, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${file.name.replace(/\.(md|markdown|txt)$/i, "")}.docx"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Conversion failed";
    return NextResponse.json({ error: { code: "CONVERSION_ERROR", message } }, { status: 500 });
  }
}
