"use client";

import { useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { ToolConfig } from "@/types";
import { Upload, Copy, Check, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyRichText } from "@/lib/clipboard-rich-text";
import { styleHtmlForClipboard } from "@/lib/converters/md-to-richtext";
import { htmlToMarkdown } from "@/lib/converters/html-to-md";
import { QuillEditor, type QuillEditorHandle } from "@/components/converter/quill-editor";

interface Props {
  forwardTool: ToolConfig;
  reverseTool: ToolConfig;
  isReversed: boolean;
}

const MD_PLACEHOLDER = `# Document Title

Write your content here. You can use **bold**, *italic*, and \`inline code\`.

- First point
- Second point
- Third point

> A short blockquote for emphasis.
`;

export function RichTextConverter({ isReversed }: Props) {
  return isReversed ? <RichTextToMd /> : <MdToRichText />;
}

function MdToRichText() {
  const [markdown, setMarkdown] = useState(MD_PLACEHOLDER);
  const [mdBase, setMdBase] = useState("document");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const mdFileRef = useRef<HTMLInputElement>(null);

  const html = useMemo(() => {
    try {
      return marked.parse(markdown, { gfm: true, breaks: true, async: false });
    } catch {
      return "";
    }
  }, [markdown]);

  const styledHtml = useMemo(() => {
    if (typeof document === "undefined" || !html) return html;
    return styleHtmlForClipboard(html);
  }, [html]);

  const handleMdLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMarkdown(await file.text());
    setMdBase(file.name.replace(/\.[^.]+$/, ""));
    e.target.value = "";
  };

  const handleCopy = async () => {
    setCopyError(null);
    try {
      const plainText = new DOMParser().parseFromString(styledHtml, "text/html").body
        .textContent || markdown;
      await copyRichText(styledHtml, plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("Copy failed. Select the preview and copy manually (Cmd/Ctrl+C).");
    }
  };

  return (
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
          {mdBase !== "document" ? `${mdBase}.md` : "or edit markdown directly below"}
        </span>
        <input
          ref={mdFileRef}
          type="file"
          accept=".md,.markdown,.txt"
          className="hidden"
          onChange={handleMdLoad}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Markdown</p>
          <textarea
            className="w-full resize-y rounded-md border bg-muted/30 p-3 font-mono text-sm"
            style={{ minHeight: "22rem" }}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            spellCheck={false}
            placeholder="Write your markdown here…"
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Preview</p>
          <div
            className="richtext-preview w-full overflow-auto rounded-md border bg-background p-3"
            style={{ minHeight: "22rem" }}
            dangerouslySetInnerHTML={{ __html: html || "" }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={handleCopy} disabled={!markdown.trim()} className="gap-2">
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy rich text
            </>
          )}
        </Button>
        {copyError && <span className="text-sm text-destructive">{copyError}</span>}
      </div>

      <div className="rounded-md border p-4 text-sm text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">How it works</p>
        <p>
          Formatting is baked into the copied content, so pasting into Gmail, Word, Google
          Docs, Notion, or Slack keeps your headings, bold/italic text, lists, and code
          blocks styled.
        </p>
      </div>
    </div>
  );
}

function RichTextToMd() {
  const editorRef = useRef<QuillEditorHandle>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [markdownResult, setMarkdownResult] = useState("");
  const [copied, setCopied] = useState(false);

  const handleConvert = () => {
    const html = editorRef.current?.getHTML() || "";
    setMarkdownResult(htmlToMarkdown(html));
  };

  const handleClear = () => {
    editorRef.current?.clear();
    setIsEmpty(true);
    setMarkdownResult("");
  };

  const handleCopyMd = async () => {
    if (!markdownResult) return;
    await navigator.clipboard.writeText(markdownResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!markdownResult) return;
    const blob = new Blob([markdownResult], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Type, format, or paste rich text here (Cmd/Ctrl+V)
          </p>
          {!isEmpty && (
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
        <QuillEditor
          ref={editorRef}
          placeholder="Paste content copied from Word, Google Docs, Notion, or a web page, or write your own…"
          onUpdate={setIsEmpty}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={handleConvert} disabled={isEmpty} className="gap-2">
          Convert to Markdown
        </Button>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Markdown</p>
        <textarea
          className="w-full resize-y rounded-md border bg-muted/30 p-3 font-mono text-sm"
          style={{ minHeight: "12rem" }}
          value={markdownResult}
          onChange={(e) => setMarkdownResult(e.target.value)}
          spellCheck={false}
          placeholder="Converted markdown will appear here…"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="outline"
          onClick={handleCopyMd}
          disabled={!markdownResult}
          className="gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy markdown
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleDownload}
          disabled={!markdownResult}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Download .md
        </Button>
      </div>
    </div>
  );
}
