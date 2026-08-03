"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, Trash2, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/converter/dropzone";
import { Progress } from "@/components/ui/progress";

interface RenderedPage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

export default function PdfToImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scale, setScale] = useState(2);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFilesAdded = useCallback((files: File[]) => {
    if (files.length === 0) return;
    setFile(files[0]);
    setPages([]);
    setProgress(0);
  }, []);

  const renderPages = useCallback(async () => {
    if (!file) return;
    setIsConverting(true);
    setPages([]);
    setProgress(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await import("pdfjs-dist");

      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdfDoc = await loadingTask.promise;
      const totalPages = pdfDoc.numPages;
      const rendered: RenderedPage[] = [];

      const canvas = canvasRef.current || document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, canvas, viewport }).promise;

        const dataUrl = canvas.toDataURL("image/png");
        rendered.push({
          pageNumber: pageNum,
          dataUrl,
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
        });

        setProgress(Math.round((pageNum / totalPages) * 100));
      }

      setPages(rendered);
    } catch (error) {
      console.error("PDF rendering failed:", error);
    } finally {
      setIsConverting(false);
    }
  }, [file, scale]);

  const downloadPage = useCallback(
    (page: RenderedPage) => {
      const link = document.createElement("a");
      link.href = page.dataUrl;
      const baseName = file?.name.replace(/\.pdf$/i, "") || "page";
      link.download = `${baseName}_page_${page.pageNumber}.png`;
      link.click();
    },
    [file]
  );

  const downloadAll = useCallback(() => {
    for (const page of pages) {
      downloadPage(page);
    }
  }, [pages, downloadPage]);

  const handleClear = useCallback(() => {
    setFile(null);
    setPages([]);
    setProgress(0);
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All tools
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">PDF → Image</h1>
        <p className="mt-1 text-muted-foreground">
          Render PDF pages as high-quality PNG images
        </p>
      </div>

      <div className="space-y-4">
        {!file && (
          <Dropzone
            acceptedTypes=".pdf"
            maxFiles={1}
            currentFileCount={0}
            onFilesAdded={handleFilesAdded}
          />
        )}

        {file && pages.length === 0 && !isConverting && (
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">{file.name}</p>

            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground">Quality</label>
              <select
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value={1}>1x (72 DPI)</option>
                <option value={2}>2x (144 DPI)</option>
                <option value={3}>3x (216 DPI)</option>
              </select>
            </div>
          </div>
        )}

        {isConverting && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Rendering pages...</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {pages.length > 0 && (
          <div className="space-y-4">
            {pages.map((page) => (
              <div key={page.pageNumber} className="rounded-lg border overflow-hidden">
                <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/50">
                  <span className="text-sm font-medium">
                    Page {page.pageNumber} ({page.width} × {page.height})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadPage(page)}
                    className="gap-1.5 h-7"
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

        {file && (
          <div className="flex flex-wrap gap-2">
            {pages.length === 0 && !isConverting && (
              <Button onClick={renderPages} className="gap-2">
                <Image className="h-4 w-4" />
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
              onClick={handleClear}
              disabled={isConverting}
              className="gap-2 text-muted-foreground"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
