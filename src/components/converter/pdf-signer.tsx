"use client";

import { useCallback, useRef, useState } from "react";
import {
  Download,
  Image as ImageIcon,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dropzone } from "@/components/converter/dropzone";
import { signPdf } from "@/lib/converters";
import type {
  ImageSignature,
  SignatureElement,
  SignatureFontKey,
  TextSignature,
} from "@/types";

const RENDER_SCALE = 1.5;

interface RenderedPage {
  pageNumber: number;
  dataUrl: string;
  pdfWidthPt: number;
  pdfHeightPt: number;
}

const FONT_OPTIONS: { value: SignatureFontKey; label: string }[] = [
  { value: "times-italic", label: "Elegant Italic" },
  { value: "helvetica", label: "Classic" },
  { value: "helvetica-bold", label: "Bold" },
  { value: "courier", label: "Monospace" },
];

const FONT_CSS: Record<SignatureFontKey, { family: string; style: string; weight: string }> = {
  "times-italic": { family: "'Times New Roman', Times, serif", style: "italic", weight: "400" },
  helvetica: { family: "Helvetica, Arial, sans-serif", style: "normal", weight: "400" },
  "helvetica-bold": { family: "Helvetica, Arial, sans-serif", style: "normal", weight: "700" },
  courier: { family: "'Courier New', Courier, monospace", style: "normal", weight: "400" },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = dataUrl;
  });
}

export function PdfSigner() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderError, setRenderError] = useState<string | null>(null);

  const [signatures, setSignatures] = useState<SignatureElement[]>([]);
  const [activeTab, setActiveTab] = useState<"text" | "image">("text");
  const [textValue, setTextValue] = useState("Your Name");
  const [fontKey, setFontKey] = useState<SignatureFontKey>("times-italic");
  const [color, setColor] = useState("#1a3fa8");
  const [targetPage, setTargetPage] = useState(1);
  const [panelError, setPanelError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const renderPages = useCallback(async (file: File) => {
    setIsRendering(true);
    setRenderProgress(0);
    setRenderError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const total = pdfDoc.numPages;
      const rendered: RenderedPage[] = [];
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      for (let n = 1; n <= total; n++) {
        const page = await pdfDoc.getPage(n);
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const baseViewport = page.getViewport({ scale: 1 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, canvas, viewport }).promise;
        rendered.push({
          pageNumber: n,
          dataUrl: canvas.toDataURL("image/png"),
          pdfWidthPt: baseViewport.width,
          pdfHeightPt: baseViewport.height,
        });
        setRenderProgress(Math.round((n / total) * 100));
      }

      setPages(rendered);
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : "Failed to render PDF");
    } finally {
      setIsRendering(false);
    }
  }, []);

  const handlePdfAdded = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setPdfFile(file);
      setPages([]);
      setSignatures([]);
      setExportError(null);
      renderPages(file);
    },
    [renderPages],
  );

  const handleRetryRender = useCallback(() => {
    if (pdfFile) renderPages(pdfFile);
  }, [pdfFile, renderPages]);

  const handleClearAll = useCallback(() => {
    setPdfFile(null);
    setPages([]);
    setSignatures([]);
    setRenderError(null);
    setExportError(null);
    setPanelError(null);
    setTargetPage(1);
  }, []);

  const addTextSignature = useCallback(() => {
    if (!textValue.trim()) return;
    const sig: TextSignature = {
      id: crypto.randomUUID(),
      type: "text",
      page: targetPage,
      xPct: 32,
      yPct: 42,
      text: textValue.trim(),
      fontKey,
      color,
      fontSizePt: 28,
    };
    setSignatures((prev) => [...prev, sig]);
  }, [textValue, fontKey, color, targetPage]);

  const handleImageInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setPanelError(null);
      if (!/^image\/(png|jpe?g)$/.test(file.type)) {
        setPanelError("Please choose a PNG or JPG image.");
        return;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const { width, height } = await loadImageSize(dataUrl);
        const naturalAspect = width / height;
        const page = pages.find((p) => p.pageNumber === targetPage) ?? pages[0];
        const pageAspect = page.pdfWidthPt / page.pdfHeightPt;

        let widthPct = 22;
        let heightPct = (widthPct * pageAspect) / naturalAspect;
        if (heightPct > 40) {
          widthPct *= 40 / heightPct;
          heightPct = 40;
        }

        const sig: ImageSignature = {
          id: crypto.randomUUID(),
          type: "image",
          page: targetPage,
          xPct: 32,
          yPct: 42,
          dataUrl,
          widthPct,
          heightPct,
          naturalAspect,
        };
        setSignatures((prev) => [...prev, sig]);
      } catch (err) {
        setPanelError(err instanceof Error ? err.message : "Could not read that image.");
      }
    },
    [pages, targetPage],
  );

  const removeSignature = useCallback((id: string) => {
    setSignatures((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const adjustFontSize = useCallback((id: string, delta: number) => {
    setSignatures((prev) =>
      prev.map((s) =>
        s.id === id && s.type === "text"
          ? { ...s, fontSizePt: clamp(s.fontSizePt + delta, 8, 96) }
          : s,
      ),
    );
  }, []);

  const updateColor = useCallback((id: string, next: string) => {
    setSignatures((prev) =>
      prev.map((s) => (s.id === id && s.type === "text" ? { ...s, color: next } : s)),
    );
  }, []);

  const updatePage = useCallback((id: string, next: number) => {
    setSignatures((prev) => prev.map((s) => (s.id === id ? { ...s, page: next } : s)));
  }, []);

  // Each drag/resize session keeps its own state in a closure rather than a
  // shared ref, so the move/end listeners never need to reference each other
  // before they're declared.
  const handleMoveStart = useCallback(
    (e: React.PointerEvent, sig: SignatureElement, containerEl: HTMLDivElement, elEl: HTMLDivElement) => {
      e.preventDefault();
      e.stopPropagation();
      const containerRect = containerEl.getBoundingClientRect();
      const elRect = elEl.getBoundingClientRect();
      const elWidthPct = (elRect.width / containerRect.width) * 100;
      const elHeightPct = (elRect.height / containerRect.height) * 100;
      const startX = e.clientX;
      const startY = e.clientY;
      const startXPct = sig.xPct;
      const startYPct = sig.yPct;
      const id = sig.id;

      const onMove = (ev: PointerEvent) => {
        const dxPct = ((ev.clientX - startX) / containerRect.width) * 100;
        const dyPct = ((ev.clientY - startY) / containerRect.height) * 100;
        const newX = clamp(startXPct + dxPct, 0, Math.max(0, 100 - elWidthPct));
        const newY = clamp(startYPct + dyPct, 0, Math.max(0, 100 - elHeightPct));
        setSignatures((prev) =>
          prev.map((s) => (s.id === id ? { ...s, xPct: newX, yPct: newY } : s)),
        );
      };
      const onEnd = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
    },
    [],
  );

  const handleResizeStart = useCallback(
    (e: React.PointerEvent, sig: ImageSignature, containerEl: HTMLDivElement, pageAspect: number) => {
      e.preventDefault();
      e.stopPropagation();
      const containerWidth = containerEl.getBoundingClientRect().width;
      const startX = e.clientX;
      const startWidthPct = sig.widthPct;
      const naturalAspect = sig.naturalAspect;
      const id = sig.id;

      const onMove = (ev: PointerEvent) => {
        const dxPct = ((ev.clientX - startX) / containerWidth) * 100;
        const newWidthPct = clamp(startWidthPct + dxPct, 4, 100);
        const newHeightPct = (newWidthPct * pageAspect) / naturalAspect;
        setSignatures((prev) =>
          prev.map((s) =>
            s.id === id && s.type === "image"
              ? { ...s, widthPct: newWidthPct, heightPct: newHeightPct }
              : s,
          ),
        );
      };
      const onEnd = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
    },
    [],
  );

  const handleExport = useCallback(async () => {
    if (!pdfFile) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const result = await signPdf(pdfFile, signatures);
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Failed to sign PDF");
    } finally {
      setIsExporting(false);
    }
  }, [pdfFile, signatures]);

  return (
    <div className="space-y-4">
      {!pdfFile && (
        <Dropzone
          acceptedTypes=".pdf"
          maxFiles={1}
          currentFileCount={0}
          onFilesAdded={handlePdfAdded}
        />
      )}

      {isRendering && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Rendering pages…</span>
          </div>
          <Progress value={renderProgress} />
        </div>
      )}

      {renderError && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <p className="flex-1 text-sm text-destructive">{renderError}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRetryRender}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="gap-1.5 text-muted-foreground"
          >
            Choose a different file
          </Button>
        </div>
      )}

      {pages.length > 0 && (
        <>
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={activeTab === "text" ? "default" : "outline"}
                  className="gap-1.5"
                  onClick={() => setActiveTab("text")}
                >
                  <Type className="h-3.5 w-3.5" />
                  Type signature
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={activeTab === "image" ? "default" : "outline"}
                  className="gap-1.5"
                  onClick={() => setActiveTab("image")}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Upload image
                </Button>
              </div>

              {pages.length > 1 && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Add to page
                  <select
                    value={targetPage}
                    onChange={(e) => setTargetPage(Number(e.target.value))}
                    className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
                  >
                    {pages.map((p) => (
                      <option key={p.pageNumber} value={p.pageNumber}>
                        {p.pageNumber}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {activeTab === "text" ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[180px] flex-1">
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Signature text
                  </label>
                  <input
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    placeholder="Your Name"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Style</label>
                  <select
                    value={fontKey}
                    onChange={(e) => setFontKey(e.target.value as SignatureFontKey)}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    {FONT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Color</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-md border bg-background p-1"
                  />
                </div>
                <Button
                  type="button"
                  onClick={addTextSignature}
                  disabled={!textValue.trim()}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add to PDF
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Choose signature image
                </Button>
                <span className="text-xs text-muted-foreground">
                  PNG with a transparent background works best
                </span>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={handleImageInputChange}
                />
              </div>
            )}

            {panelError && <p className="text-sm text-destructive">{panelError}</p>}
          </div>

          {signatures.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Drag a signature to reposition it, or use its corner handle / size buttons to
              resize it. {signatures.length} signature
              {signatures.length > 1 ? "s" : ""} placed.
            </p>
          )}

          <div className="space-y-4">
            {pages.map((page) => (
              <div key={page.pageNumber} className="overflow-hidden rounded-lg border">
                <div className="border-b bg-muted/50 px-3 py-2 text-sm font-medium">
                  Page {page.pageNumber}
                </div>
                <div
                  ref={(el) => {
                    pageRefs.current[page.pageNumber] = el;
                  }}
                  className="relative [container-type:inline-size]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={page.dataUrl}
                    alt={`Page ${page.pageNumber}`}
                    className="block w-full select-none"
                    draggable={false}
                  />
                  {signatures
                    .filter((s) => s.page === page.pageNumber)
                    .map((sig) => (
                      <SignatureOverlay
                        key={sig.id}
                        sig={sig}
                        totalPages={pages.length}
                        pageWidthPt={page.pdfWidthPt}
                        onMoveStart={(e, elEl) => {
                          const containerEl = pageRefs.current[page.pageNumber];
                          if (containerEl) handleMoveStart(e, sig, containerEl, elEl);
                        }}
                        onResizeStart={(e) => {
                          const containerEl = pageRefs.current[page.pageNumber];
                          if (containerEl && sig.type === "image") {
                            handleResizeStart(
                              e,
                              sig,
                              containerEl,
                              page.pdfWidthPt / page.pdfHeightPt,
                            );
                          }
                        }}
                        onDelete={() => removeSignature(sig.id)}
                        onFontSizeChange={(delta) => adjustFontSize(sig.id, delta)}
                        onColorChange={(c) => updateColor(sig.id, c)}
                        onPageChange={(next) => updatePage(sig.id, next)}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleExport}
              disabled={isExporting || signatures.length === 0}
              className="gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export Signed PDF
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={handleClearAll}
              disabled={isExporting}
              className="gap-2 text-muted-foreground"
            >
              <Trash2 className="h-4 w-4" />
              Start Over
            </Button>
            {exportError && <span className="text-sm text-destructive">{exportError}</span>}
          </div>
        </>
      )}
    </div>
  );
}

interface SignatureOverlayProps {
  sig: SignatureElement;
  totalPages: number;
  pageWidthPt: number;
  onMoveStart: (e: React.PointerEvent, elEl: HTMLDivElement) => void;
  onResizeStart: (e: React.PointerEvent) => void;
  onDelete: () => void;
  onFontSizeChange: (delta: number) => void;
  onColorChange: (color: string) => void;
  onPageChange: (page: number) => void;
}

function SignatureOverlay({
  sig,
  totalPages,
  pageWidthPt,
  onMoveStart,
  onResizeStart,
  onDelete,
  onFontSizeChange,
  onColorChange,
  onPageChange,
}: SignatureOverlayProps) {
  const elRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={elRef}
      className="group absolute cursor-move touch-none select-none"
      style={{
        left: `${sig.xPct}%`,
        top: `${sig.yPct}%`,
        ...(sig.type === "image"
          ? { width: `${sig.widthPct}%`, height: `${sig.heightPct}%` }
          : {}),
      }}
      onPointerDown={(e) => {
        if (elRef.current) onMoveStart(e, elRef.current);
      }}
    >
      <div className="pointer-events-none absolute -top-8 left-0 z-10 flex items-center gap-1 whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <div className="pointer-events-auto flex items-center gap-1 rounded-md border bg-background px-1.5 py-1 shadow-sm">
          {sig.type === "text" && (
            <>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onFontSizeChange(-2)}
                className="rounded px-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Decrease size"
              >
                A−
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onFontSizeChange(2)}
                className="rounded px-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Increase size"
              >
                A+
              </button>
              <input
                type="color"
                value={sig.color}
                onPointerDown={(e) => e.stopPropagation()}
                onChange={(e) => onColorChange(e.target.value)}
                className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                aria-label="Signature color"
              />
            </>
          )}
          {totalPages > 1 && (
            <select
              value={sig.page}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => onPageChange(Number(e.target.value))}
              className="h-5 rounded border-0 bg-transparent text-xs text-muted-foreground"
              aria-label="Move to page"
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  p.{n}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onDelete}
            className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove signature"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {sig.type === "text" ? (
        <div
          style={{
            fontFamily: FONT_CSS[sig.fontKey].family,
            fontStyle: FONT_CSS[sig.fontKey].style,
            fontWeight: FONT_CSS[sig.fontKey].weight,
            color: sig.color,
            fontSize: `${(sig.fontSizePt / pageWidthPt) * 100}cqw`,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {sig.text}
        </div>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sig.dataUrl}
            alt="Signature"
            draggable={false}
            className="h-full w-full select-none object-contain"
          />
          <div
            onPointerDown={(e) => {
              e.stopPropagation();
              onResizeStart(e);
            }}
            className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-primary bg-background opacity-0 group-hover:opacity-100"
          />
        </>
      )}
    </div>
  );
}
