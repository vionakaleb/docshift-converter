"use client";

import { useState, useRef } from "react";
import { ToolConfig } from "@/types";
import {
  ArrowLeft,
  ArrowLeftRight,
  Upload,
  Loader2,
  FileText,
  X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  /** MD → other format (md-to-pdf, md-to-docx) */
  forwardTool: ToolConfig;
  /** other format → MD (pdf-to-md, docx-to-md) */
  reverseTool: ToolConfig;
}

const MD_PLACEHOLDER = `# Document Title

## Introduction

Write your content here. You can use **bold** and *italic* text.

## Main Points

- First important point
- Second important point
- Third important point

## Conclusion

Summary and final thoughts.
`;

const FORWARD_BUTTON_LABEL: Partial<Record<string, string>> = {
  "md-to-pdf": "Print / Save as PDF",
  "md-to-docx": "Convert to DOCX",
};

const FORWARD_OUTPUT_EXT: Partial<Record<string, string>> = {
  "md-to-docx": ".docx",
};

export function BidirectionalMdConverter({ forwardTool, reverseTool }: Props) {
  const [isReversed, setIsReversed] = useState(false);

  // ── Forward state (MD → X) ──────────────────────────────────────────────
  const [markdown, setMarkdown] = useState(MD_PLACEHOLDER);
  const [mdBase, setMdBase] = useState("document");
  const [fwdLoading, setFwdLoading] = useState(false);
  const [fwdError, setFwdError] = useState<string | null>(null);
  const mdFileRef = useRef<HTMLInputElement>(null);

  // ── Reverse state (X → MD) ──────────────────────────────────────────────
  const [revFile, setRevFile] = useState<File | null>(null);
  const [revLoading, setRevLoading] = useState(false);
  const [revError, setRevError] = useState<string | null>(null);
  const revFileRef = useRef<HTMLInputElement>(null);

  // Labels for the current direction
  const inputLabel = isReversed
    ? reverseTool.inputLabel
    : forwardTool.inputLabel;
  const outputLabel = isReversed
    ? reverseTool.outputLabel
    : forwardTool.outputLabel;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleMdLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMarkdown(await file.text());
    setMdBase(file.name.replace(/\.[^.]+$/, ""));
    setFwdError(null);
    e.target.value = "";
  };

  const selectRevFile = (file: File) => {
    setRevFile(file);
    setRevError(null);
  };

  const convertForward = async () => {
    setFwdLoading(true);
    setFwdError(null);
    try {
      const blob = new Blob([markdown], { type: "text/markdown" });
      const formData = new FormData();
      formData.append(
        "file",
        new File([blob], `${mdBase}.md`, { type: "text/markdown" }),
      );

      const res = await fetch(`/api/convert/${forwardTool.id}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Conversion failed");
      }

      if (forwardTool.id === "md-to-pdf") {
        const html = await res.text();
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(html);
          win.document.close();
          win.print();
          win.close();
        }
      } else {
        const ext = FORWARD_OUTPUT_EXT[forwardTool.id] ?? ".bin";
        const outBlob = await res.blob();
        triggerDownload(outBlob, mdBase + ext);
      }
    } catch (err: unknown) {
      setFwdError(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setFwdLoading(false);
    }
  };

  const convertReverse = async () => {
    if (!revFile) return;
    setRevLoading(true);
    setRevError(null);
    try {
      const formData = new FormData();
      formData.append("file", revFile);
      const res = await fetch(`/api/convert/${reverseTool.id}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Conversion failed");
      }
      const blob = await res.blob();
      triggerDownload(blob, revFile.name.replace(/\.[^.]+$/, "") + ".md");
    } catch (err: unknown) {
      setRevError(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setRevLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All tools
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setIsReversed((r) => !r)}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {/* {outputLabel} → {inputLabel} */}
          </Button>

          <h1 className="text-2xl font-bold tracking-tight">
            {inputLabel} → {outputLabel}
          </h1>
        </div>

        <p className="mt-1 text-muted-foreground">
          {isReversed ? reverseTool.description : forwardTool.description}
        </p>
      </div>

      {/* ── Forward: Markdown editor ─────────────────────────────────────── */}
      {!isReversed && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => mdFileRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Load .md file
            </Button>
            <span className="text-xs text-muted-foreground">
              {mdBase !== "document"
                ? `${mdBase}.md`
                : "or edit markdown directly below"}
            </span>
            <input
              ref={mdFileRef}
              type="file"
              accept=".md,.markdown,.txt"
              className="hidden"
              onChange={handleMdLoad}
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

          <div className="flex flex-wrap items-center gap-4">
            <Button
              onClick={convertForward}
              disabled={fwdLoading || !markdown.trim()}
              className="gap-2"
            >
              {fwdLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Converting…
                </>
              ) : (
                (FORWARD_BUTTON_LABEL[forwardTool.id] ??
                `Convert to ${outputLabel}`)
              )}
            </Button>
            {fwdError && (
              <span className="text-sm text-destructive">{fwdError}</span>
            )}
          </div>

          <div className="rounded-md border p-4 text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">
              Markdown formatting
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  # H1
                </code>
                {", "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  ## H2
                </code>{" "}
                — headings
              </li>
              <li>
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  **bold**
                </code>
                {", "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  *italic*
                </code>{" "}
                — inline styles
              </li>
              <li>
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  - item
                </code>{" "}
                — bullet list
                {"  ·  "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  | col |
                </code>{" "}
                — tables
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Reverse: file drop zone ──────────────────────────────────────── */}
      {isReversed && (
        <div className="space-y-4">
          <div
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) selectRevFile(f);
            }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => revFileRef.current?.click()}
            className={cn(
              "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all",
              revFile
                ? "border-primary/50 bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50",
            )}
          >
            {revFile ? (
              <>
                <FileText className="h-10 w-10 text-primary" />
                <div className="text-center">
                  <p className="font-medium">{revFile.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {(revFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  className="absolute right-3 top-3 rounded-full p-1 transition-colors hover:bg-muted"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRevFile(null);
                  }}
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">
                    Drop file here or click to browse
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {reverseTool.acceptedTypes}
                  </p>
                </div>
              </>
            )}
          </div>

          <input
            ref={revFileRef}
            type="file"
            accept={reverseTool.acceptedTypes}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) selectRevFile(f);
              e.target.value = "";
            }}
          />

          <div className="flex flex-wrap items-center gap-4">
            <Button
              onClick={convertReverse}
              disabled={revLoading || !revFile}
              className="gap-2"
            >
              {revLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Converting…
                </>
              ) : (
                "Convert to Markdown"
              )}
            </Button>
            {revError && (
              <span className="text-sm text-destructive">{revError}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
