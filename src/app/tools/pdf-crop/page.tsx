"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, Trash2, Crop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/converter/dropzone";
import { cropPdf } from "@/lib/converters";
import { CropArea } from "@/types";

export default function PdfCropPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFilesAdded = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const newFile = files[0];
    setFile(newFile);
    setResult(null);
    setCropArea(null);
    const url = URL.createObjectURL(newFile);
    setPdfUrl(url);
  }, []);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const getRelativePosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * 100,
        y: ((clientY - rect.top) / rect.height) * 100,
      };
    },
    []
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      const pos = getRelativePosition(event.clientX, event.clientY);
      setDragStart(pos);
      setIsDragging(true);
      setCropArea(null);
    },
    [getRelativePosition]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!isDragging || !dragStart) return;
      const pos = getRelativePosition(event.clientX, event.clientY);

      const x = Math.max(0, Math.min(dragStart.x, pos.x));
      const y = Math.max(0, Math.min(dragStart.y, pos.y));
      const width = Math.min(100 - x, Math.abs(pos.x - dragStart.x));
      const height = Math.min(100 - y, Math.abs(pos.y - dragStart.y));

      setCropArea({ x, y, width, height });
    },
    [isDragging, dragStart, getRelativePosition]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleCrop = useCallback(async () => {
    if (!file || !cropArea) return;
    setIsConverting(true);
    try {
      const result = await cropPdf(file, cropArea);
      setResult(result.blob);
    } catch {
      setResult(null);
    } finally {
      setIsConverting(false);
    }
  }, [file, cropArea]);

  const handleDownload = useCallback(() => {
    if (!result || !file) return;
    const url = URL.createObjectURL(result);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name.replace(/\.pdf$/i, "") + "_cropped.pdf";
    link.click();
    URL.revokeObjectURL(url);
  }, [result, file]);

  const handleClear = useCallback(() => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setFile(null);
    setPdfUrl(null);
    setCropArea(null);
    setResult(null);
  }, [pdfUrl]);

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
        <h1 className="text-2xl font-bold tracking-tight">PDF Crop</h1>
        <p className="mt-1 text-muted-foreground">
          Visually crop PDF pages with drag selection
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

        {pdfUrl && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Click and drag on the preview to select the crop area.
            </p>

            <div
              ref={containerRef}
              className="relative cursor-crosshair overflow-hidden rounded-lg border bg-white"
              style={{ minHeight: 400 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0`}
                className="pointer-events-none h-full w-full"
                style={{ minHeight: 400 }}
                title="PDF preview"
              />

              {cropArea && cropArea.width > 0 && cropArea.height > 0 && (
                <>
                  <div className="absolute inset-0 bg-black/30 pointer-events-none" />
                  <div
                    className="absolute border-2 border-primary bg-transparent pointer-events-none"
                    style={{
                      left: `${cropArea.x}%`,
                      top: `${cropArea.y}%`,
                      width: `${cropArea.width}%`,
                      height: `${cropArea.height}%`,
                      boxShadow: `
                        -9999px -9999px 0 9999px rgba(0,0,0,0),
                        9999px 9999px 0 9999px rgba(0,0,0,0)
                      `,
                    }}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {file && (
          <div className="flex flex-wrap gap-2">
            {!result && cropArea && cropArea.width > 1 && (
              <Button onClick={handleCrop} disabled={isConverting} className="gap-2">
                {isConverting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cropping...
                  </>
                ) : (
                  <>
                    <Crop className="h-4 w-4" />
                    Apply Crop
                  </>
                )}
              </Button>
            )}

            {result && (
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Download Cropped PDF
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => setCropArea(null)}
              disabled={isConverting || !cropArea}
            >
              Reset Selection
            </Button>

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
