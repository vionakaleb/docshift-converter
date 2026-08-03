import { NextRequest, NextResponse } from "next/server";
import pptxgen from "pptxgenjs";

export const runtime = "nodejs";

interface SlideData {
  title: string;
  isH1: boolean;
  bullets: string[];
}

function parseMarkdown(markdown: string): SlideData[] {
  const slides: SlideData[] = [];
  let current: SlideData | null = null;

  function flush() {
    if (current) slides.push(current);
  }

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trimEnd();
    const h2 = line.match(/^##\s+(.+)/);
    const h1 = !h2 && line.match(/^#\s+(.+)/);
    const bullet = line.match(/^[-*]\s+(.+)/);
    const numbered = line.match(/^\d+\.\s+(.+)/);

    if (h1) {
      flush();
      current = { title: h1[1], isH1: true, bullets: [] };
    } else if (h2) {
      flush();
      current = { title: h2[1], isH1: false, bullets: [] };
    } else if (bullet) {
      if (!current) current = { title: "", isH1: true, bullets: [] };
      current.bullets.push(bullet[1]);
    } else if (numbered) {
      if (!current) current = { title: "", isH1: true, bullets: [] };
      current.bullets.push(numbered[1]);
    } else if (line.trim() && current) {
      current.bullets.push(line.trim());
    }
  }

  flush();
  return slides;
}

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

        if (s.title) {
          slide.addText(s.title, {
            x: 0.5, y: 0.3, w: "90%", h: 1.2,
            fontSize: s.isH1 ? 36 : 28,
            bold: true,
            color: "1a1a2e",
          });
        }

        if (s.bullets.length > 0) {
          const textItems = s.bullets.map((b) => ({
            text: b,
            options: { bullet: true, fontSize: 20, color: "363636" } as object,
          }));
          slide.addText(textItems, {
            x: 0.5,
            y: s.title ? 1.8 : 0.5,
            w: "90%",
            h: 4.5,
            valign: "top",
          });
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
