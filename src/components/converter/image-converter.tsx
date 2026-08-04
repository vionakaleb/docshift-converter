"use client";

import { useState, useCallback, useRef } from "react";
import { ToolConfig } from "@/types";
import {
  Download,
  FileImage,
  Image as ImageIcon,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/converter/dropzone";
import { Progress } from "@/components/ui/progress";
import { imagesToPdf } from "@/lib/converters";

interface Props {
  forwardTool: ToolConfig;
  reverseTool: ToolConfig;
  isReversed: boolean;
}

interface RenderedPage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

export function ImageConverter({
  forwardTool,
  reverseTool,
  isReversed,
}: Props) {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [fwdLoading, setFwdLoading] = useState(false);
  const [fwdError, setFwdError] = useState<string | null>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [revLoading, setRevLoading] = useState(false);
  const [revProgress, setRevProgress] = useState(0);
  const [revError, setRevError] = useState<string | null>(null);
  const [scale, setScale] = useState(2);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const addImages = useCallback(
    (files: File[]) => {
      setImageFiles((prev) =>
        [...prev, ...files].slice(0, forwardTool.maxFiles),
      );
      setFwdError(null);
    },
    [forwardTool.maxFiles],
  );

  const removeImage = useCallback((index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearImages = useCallback(() => {
    setImageFiles([]);
    setFwdError(null);
  }, []);

  const convertToPdf = useCallback(async () => {
    if (imageFiles.length === 0) return;
    setFwdLoading(true);
    setFwdError(null);
    try {
      const result = await imagesToPdf(imageFiles);
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setFwdError(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setFwdLoading(false);
    }
  }, [imageFiles]);

  const addPdf = useCallback((files: File[]) => {
    if (files.length === 0) return;
    setPdfFile(files[0]);
    setPages([]);
    setRevProgress(0);
    setRevError(null);
  }, []);

  const clearPdf = useCallback(() => {
    setPdfFile(null);
    setPages([]);
    setRevProgress(0);
    setRevError(null);
  }, []);

  const renderPages = useCallback(async () => {
    if (!pdfFile) return;
    setRevLoading(true);
    setPages([]);
    setRevProgress(0);
    setRevError(null);

    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const pdfDoc = await pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
      }).promise;
      const total = pdfDoc.numPages;
      const rendered: RenderedPage[] = [];

      const canvas = canvasRef.current ?? document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      for (let n = 1; n <= total; n++) {
        const page = await pdfDoc.getPage(n);
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, canvas, viewport }).promise;
        rendered.push({
          pageNumber: n,
          dataUrl: canvas.toDataURL("image/png"),
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
        });
        setRevProgress(Math.round((n / total) * 100));
      }

      setPages(rendered);
    } catch (err: unknown) {
      setRevError(err instanceof Error ? err.message : "Rendering failed");
    } finally {
      setRevLoading(false);
    }
  }, [pdfFile, scale]);

  const downloadPage = useCallback(
    (page: RenderedPage) => {
      const base = pdfFile?.name.replace(/\.pdf$/i, "") ?? "page";
      const a = document.createElement("a");
      a.href = page.dataUrl;
      a.download = `${base}_page_${page.pageNumber}.png`;
      a.click();
    },
    [pdfFile],
  );

  const downloadAll = useCallback(() => {
    pages.forEach(downloadPage);
  }, [pages, downloadPage]);

  if (isReversed)
    return (
      <div className="space-y-4">
        {!pdfFile && (
          <Dropzone
            acceptedTypes={reverseTool.acceptedTypes}
            maxFiles={1}
            currentFileCount={0}
            onFilesAdded={addPdf}
          />
        )}

        {pdfFile && pages.length === 0 && !revLoading && (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">{pdfFile.name}</p>
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground">Quality</label>
              <select
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value={1}>1× (72 DPI)</option>
                <option value={2}>2× (144 DPI)</option>
                <option value={3}>3× (216 DPI)</option>
              </select>
            </div>
          </div>
        )}

        {revLoading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Rendering pages…</span>
            </div>
            <Progress value={revProgress} />
          </div>
        )}

        {revError && <p className="text-sm text-destructive">{revError}</p>}

        {pages.length > 0 && (
          <div className="space-y-4">
            {pages.map((page) => (
              <div
                key={page.pageNumber}
                className="overflow-hidden rounded-lg border"
              >
                <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
                  <span className="text-sm font-medium">
                    Page {page.pageNumber} - {page.width} × {page.height} px
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadPage(page)}
                    className="h-7 gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Save
                  </Button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.dataUrl}
                  alt={`Page ${page.pageNumber}`}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {pdfFile && (
          <div className="flex flex-wrap gap-2">
            {pages.length === 0 && !revLoading && (
              <Button onClick={renderPages} className="gap-2">
                <ImageIcon className="h-4 w-4" />
                Render Pages
              </Button>
            )}
            {pages.length > 1 && (
              <Button variant="outline" onClick={downloadAll} className="gap-2">
                <Download className="h-4 w-4" />
                Download All
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={clearPdf}
              disabled={revLoading}
              className="gap-2 text-muted-foreground"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>
        )}
      </div>
    );

  return (
    <div className="space-y-4">
      <Dropzone
        acceptedTypes={forwardTool.acceptedTypes}
        maxFiles={forwardTool.maxFiles}
        currentFileCount={imageFiles.length}
        onFilesAdded={addImages}
        disabled={fwdLoading}
      />

      {imageFiles.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {imageFiles.map((file, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-2">
              <FileImage className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </span>
              <button
                onClick={() => removeImage(i)}
                disabled={fwdLoading}
                className="rounded-full p-1 transition-colors hover:bg-muted disabled:opacity-40"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {imageFiles.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={convertToPdf}
            disabled={fwdLoading}
            className="gap-2"
          >
            {fwdLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Converting…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Convert to PDF
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={clearImages}
            disabled={fwdLoading}
            className="gap-2 text-muted-foreground"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
          {fwdError && (
            <span className="text-sm text-destructive">{fwdError}</span>
          )}
        </div>
      )}
    </div>
  );
}
