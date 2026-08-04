"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, Trash2, Scissors, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/converter/dropzone";
import { FileList } from "@/components/converter/file-list";
import { useConverter } from "@/hooks/use-converter";
import { splitPdf, splitPdfByRanges, getPdfPageCount } from "@/lib/converters";
import { FileEntry, ConversionStatus, PageRange } from "@/types";

export default function PdfSplitPage() {
  const { files, addFiles, removeFile, clearFiles, downloadFile, downloadAll } =
    useConverter("pdf-split");

  const [pageCount, setPageCount] = useState(0);
  const [splitMode, setSplitMode] = useState<"all" | "range">("all");
  const [ranges, setRanges] = useState<PageRange[]>([{ start: 1, end: 1 }]);
  const [isConverting, setIsConverting] = useState(false);
  const [results, setResults] = useState<FileEntry[]>([]);

  const handleFilesAdded = useCallback(
    async (newFiles: File[]) => {
      addFiles(newFiles);
      if (newFiles.length > 0) {
        const count = await getPdfPageCount(newFiles[0]);
        setPageCount(count);
        setRanges([{ start: 1, end: count }]);
      }
    },
    [addFiles]
  );

  const addRange = useCallback(() => {
    setRanges((prev) => [...prev, { start: 1, end: pageCount }]);
  }, [pageCount]);

  const removeRange = useCallback((index: number) => {
    setRanges((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateRange = useCallback(
    (index: number, field: "start" | "end", value: number) => {
      setRanges((prev) =>
        prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
      );
    },
    []
  );

  const handleSplit = useCallback(async () => {
    const file = files[0]?.file;
    if (!file) return;

    setIsConverting(true);
    try {
      const splitResults =
        splitMode === "range" ? await splitPdfByRanges(file, ranges) : await splitPdf(file);
      const entries: FileEntry[] = splitResults.map((r, i) => ({
        id: `split-${i}`,
        file,
        status: "done" as ConversionStatus,
        progress: 100,
        result: r.blob,
        resultName: r.filename,
      }));
      setResults(entries);
    } catch {
      setResults([]);
    } finally {
      setIsConverting(false);
    }
  }, [files, splitMode, ranges]);

  const handleClear = useCallback(() => {
    clearFiles();
    setResults([]);
    setPageCount(0);
  }, [clearFiles]);

  const allEntries = results.length > 0 ? results : files;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All tools
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">PDF Split</h1>
        <p className="mt-1 text-muted-foreground">Split a PDF into separate page files</p>
      </div>

      <div className="space-y-4">
        <Dropzone
          acceptedTypes=".pdf"
          maxFiles={1}
          currentFileCount={files.length}
          onFilesAdded={handleFilesAdded}
          disabled={isConverting}
        />

        {pageCount > 0 && results.length === 0 && (
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">
              {pageCount} page{pageCount > 1 ? "s" : ""} detected
            </p>

            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="splitMode"
                  checked={splitMode === "all"}
                  onChange={() => setSplitMode("all")}
                  className="accent-primary"
                />
                Split all pages
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="splitMode"
                  checked={splitMode === "range"}
                  onChange={() => setSplitMode("range")}
                  className="accent-primary"
                />
                Custom range
              </label>
            </div>

            {splitMode === "range" && (
              <div className="space-y-2">
                {ranges.map((range, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">From</label>
                    <input
                      type="number"
                      min={1}
                      max={pageCount}
                      value={range.start}
                      onChange={(e) =>
                        updateRange(index, "start", Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="h-9 w-20 rounded-md border bg-background px-3 text-sm"
                    />
                    <label className="text-sm text-muted-foreground">to</label>
                    <input
                      type="number"
                      min={range.start}
                      max={pageCount}
                      value={range.end}
                      onChange={(e) =>
                        updateRange(
                          index,
                          "end",
                          Math.min(pageCount, parseInt(e.target.value) || pageCount)
                        )
                      }
                      className="h-9 w-20 rounded-md border bg-background px-3 text-sm"
                    />
                    {ranges.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRange(index)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Remove range"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRange}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add range
                </Button>
              </div>
            )}
          </div>
        )}

        <FileList files={allEntries} onRemove={removeFile} onDownload={downloadFile} />

        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {results.length === 0 && (
              <Button onClick={handleSplit} disabled={isConverting} className="gap-2">
                {isConverting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Splitting...
                  </>
                ) : (
                  <>
                    <Scissors className="h-4 w-4" />
                    Split PDF
                  </>
                )}
              </Button>
            )}

            {results.length > 1 && (
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
