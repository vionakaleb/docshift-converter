"use client";

import { useState, useCallback } from "react";
import { FileEntry, ToolId, ConversionStatus } from "@/types";
import { mergePdfs, splitPdf, imagesToPdf } from "@/lib/converters";

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

async function convertViaApi(
  endpoint: string,
  file: File
): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(endpoint, { method: "POST", body: formData });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error?.message || `Conversion failed (${response.status})`);
  }

  return response.blob();
}

function getOutputFilename(inputName: string, toolId: ToolId): string {
  const base = inputName.replace(/\.[^.]+$/, "");
  const extensionMap: Partial<Record<ToolId, string>> = {
    "md-to-pdf": ".pdf",
    "md-to-docx": ".docx",
    "pdf-to-md": ".md",
    "docx-to-md": ".md",
    "pdf-to-image": ".png",
  };
  return base + (extensionMap[toolId] || ".pdf");
}

export function useConverter(toolId: ToolId) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isConverting, setIsConverting] = useState(false);

  const addFiles = useCallback((newFiles: File[]) => {
    const entries: FileEntry[] = newFiles.map((file) => ({
      id: generateId(),
      file,
      status: "idle" as ConversionStatus,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const updateFile = useCallback((id: string, updates: Partial<FileEntry>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  }, []);

  const convertFiles = useCallback(async () => {
    setIsConverting(true);

    const apiTools: ToolId[] = ["md-to-pdf", "md-to-docx", "pdf-to-md", "docx-to-md", "pdf-to-image"];
    const clientBatchTools: ToolId[] = ["image-to-pdf", "pdf-merge"];
    const clientSplitTools: ToolId[] = ["pdf-split"];

    try {
      if (clientBatchTools.includes(toolId)) {
        const allFileEntries = files.filter((f) => f.status !== "done");
        for (const entry of allFileEntries) {
          updateFile(entry.id, { status: "converting", progress: 50 });
        }

        let result;
        if (toolId === "image-to-pdf") {
          result = await imagesToPdf(allFileEntries.map((f) => f.file));
        } else {
          result = await mergePdfs(allFileEntries.map((f) => f.file));
        }

        for (const entry of allFileEntries) {
          updateFile(entry.id, {
            status: "done",
            progress: 100,
            result: result.blob,
            resultName: result.filename,
          });
        }
      } else if (clientSplitTools.includes(toolId)) {
        const entry = files[0];
        if (!entry) return;

        updateFile(entry.id, { status: "converting", progress: 30 });
        const results = await splitPdf(entry.file);
        updateFile(entry.id, {
          status: "done",
          progress: 100,
          result: results[0]?.blob,
          resultName: "split_pages.zip",
        });

        for (let i = 1; i < results.length; i++) {
          const newId = generateId();
          setFiles((prev) => [
            ...prev,
            {
              id: newId,
              file: entry.file,
              status: "done" as ConversionStatus,
              progress: 100,
              result: results[i].blob,
              resultName: results[i].filename,
            },
          ]);
        }
      } else if (apiTools.includes(toolId)) {
        const pendingFiles = files.filter((f) => f.status !== "done");

        for (const entry of pendingFiles) {
          updateFile(entry.id, { status: "converting", progress: 20 });

          try {
            const endpoint = `/api/convert/${toolId}`;
            let blob: Blob;

            if (toolId === "md-to-pdf") {
              const htmlBlob = await convertViaApi(endpoint, entry.file);
              const htmlText = await htmlBlob.text();

              const printWindow = window.open("", "_blank");
              if (printWindow) {
                printWindow.document.write(htmlText);
                printWindow.document.close();
                printWindow.print();
                printWindow.close();
              }

              blob = htmlBlob;
            } else {
              blob = await convertViaApi(endpoint, entry.file);
            }

            updateFile(entry.id, {
              status: "done",
              progress: 100,
              result: blob,
              resultName: getOutputFilename(entry.file.name, toolId),
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Conversion failed";
            updateFile(entry.id, { status: "error", progress: 0, error: message });
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Conversion failed";
      for (const entry of files) {
        if (entry.status === "converting") {
          updateFile(entry.id, { status: "error", progress: 0, error: message });
        }
      }
    } finally {
      setIsConverting(false);
    }
  }, [files, toolId, updateFile]);

  const downloadFile = useCallback((entry: FileEntry) => {
    if (!entry.result || !entry.resultName) return;
    const url = URL.createObjectURL(entry.result);
    const link = document.createElement("a");
    link.href = url;
    link.download = entry.resultName;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadAll = useCallback(() => {
    const doneFiles = files.filter((f) => f.status === "done" && f.result);
    for (const entry of doneFiles) {
      downloadFile(entry);
    }
  }, [files, downloadFile]);

  return {
    files,
    isConverting,
    addFiles,
    removeFile,
    clearFiles,
    convertFiles,
    downloadFile,
    downloadAll,
  };
}
