import { NextRequest, NextResponse } from "next/server";
import { marked } from "marked";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: { code: "NO_FILE", message: "No file provided" } }, { status: 400 });
    }

    const markdown = await file.text();
    const htmlContent = await marked(markdown, { gfm: true, breaks: true });

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      line-height: 1.6;
      color: #1a1a1a;
      font-size: 14px;
    }
    h1 { font-size: 2em; margin-top: 1.5em; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; margin-top: 1.3em; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.2em; }
    h3 { font-size: 1.25em; margin-top: 1.2em; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding: 0 16px; color: #555; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f4f4f4; font-weight: 600; }
    img { max-width: 100%; }
    a { color: #0366d6; }
    hr { border: none; border-top: 1px solid #e5e5e5; margin: 2em 0; }
  </style>
</head>
<body>${htmlContent}</body>
</html>`;

    return new NextResponse(fullHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Output-Type": "html-for-pdf",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Conversion failed";
    return NextResponse.json({ error: { code: "CONVERSION_ERROR", message } }, { status: 500 });
  }
}
