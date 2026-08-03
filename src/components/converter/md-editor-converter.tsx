"use client";

import { useState, useRef } from "react";
import { ToolConfig } from "@/types";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface MdEditorConverterProps {
  tool: ToolConfig;
}

const PLACEHOLDER = `# Document Title

## Introduction

Write your content here. You can use **bold** and *italic* text.

## Main Points

- First important point
- Second important point
- Third important point

## Conclusion

Summary and final thoughts.
`;

const CONVERT_LABEL: Partial<Record<string, string>> = {
  "md-to-pdf": "Print / Save as PDF",
  "md-to-docx": "Convert to DOCX",
  "md-to-pptx": "Convert to PPTX",
};

const OUTPUT_EXT: Partial<Record<string, string>> = {
  "md-to-docx": ".docx",
  "md-to-pptx": ".pptx",
};

export function MdEditorConverter({ tool }: MdEditorConverterProps) {
  const [markdown, setMarkdown] = useState(PLACEHOLDER);
  const [baseName, setBaseName] = useState("document");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMarkdown(await file.text());
    setBaseName(file.name.replace(/\.[^.]+$/, ""));
    setError(null);
    e.target.value = "";
  };

  const convert = async () => {
    setLoading(true);
    setError(null);

    try {
      let response: Response;

      if (tool.id === "md-to-pptx") {
        response = await fetch(`/api/convert/${tool.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown }),
        });
      } else {
        const blob = new Blob([markdown], { type: "text/markdown" });
        const formData = new FormData();
        formData.append("file", new File([blob], `${baseName}.md`, { type: "text/markdown" }));
        response = await fetch(`/api/convert/${tool.id}`, {
          method: "POST",
          body: formData,
        });
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error?.message || data.error || "Conversion failed");
      }

      if (tool.id === "md-to-pdf") {
        const html = await response.text();
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(html);
          win.document.close();
          win.print();
          win.close();
        }
      } else {
        const ext = OUTPUT_EXT[tool.id] ?? ".bin";
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = baseName + ext;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  const isPptx = tool.id === "md-to-pptx";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All tools
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{tool.name}</h1>
        <p className="mt-1 text-muted-foreground">{tool.description}</p>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          Load .md file
        </Button>
        <span className="text-xs text-muted-foreground">
          {baseName !== "document"
            ? `${baseName}.md`
            : "or edit markdown directly below"}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,.txt"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      <textarea
        className="w-full resize-y rounded-md border bg-muted/30 p-3 font-mono text-sm"
        style={{ minHeight: "24rem" }}
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        spellCheck={false}
        placeholder="Write your markdown here…"
      />

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Button
          onClick={convert}
          disabled={loading || !markdown.trim()}
          className="gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Converting…
            </>
          ) : (
            CONVERT_LABEL[tool.id] ?? `Convert to ${tool.outputLabel}`
          )}
        </Button>

        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>

      <div className="mt-6 rounded-md border p-4 text-sm text-muted-foreground">
        {isPptx ? (
          <>
            <p className="mb-2 font-medium text-foreground">Slide structure</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <code className="rounded bg-muted px-1 py-0.5 text-xs"># Title</code>
                {" "}— new slide with large title
              </li>
              <li>
                <code className="rounded bg-muted px-1 py-0.5 text-xs">## Section</code>
                {" "}— new slide with smaller title
              </li>
              <li>
                <code className="rounded bg-muted px-1 py-0.5 text-xs">- item</code>
                {" "}— bullet point on current slide
              </li>
              <li>Plain text lines become content on the current slide</li>
            </ul>
          </>
        ) : (
          <>
            <p className="mb-2 font-medium text-foreground">Markdown formatting</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <code className="rounded bg-muted px-1 py-0.5 text-xs"># H1</code>
                {", "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">## H2</code>
                {" "}— headings
              </li>
              <li>
                <code className="rounded bg-muted px-1 py-0.5 text-xs">**bold**</code>
                {", "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">*italic*</code>
                {" "}— inline styles
              </li>
              <li>
                <code className="rounded bg-muted px-1 py-0.5 text-xs">- item</code>
                {" "}— bullet list
              </li>
              <li>
                <code className="rounded bg-muted px-1 py-0.5 text-xs">| col |</code>
                {" "}— tables
              </li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
