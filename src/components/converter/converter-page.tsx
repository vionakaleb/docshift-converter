"use client";

import { ToolConfig } from "@/types";
import { useConverter } from "@/hooks/use-converter";
import { Dropzone } from "./dropzone";
import { FileList } from "./file-list";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";

interface ConverterPageProps {
  tool: ToolConfig;
}

export function ConverterPage({ tool }: ConverterPageProps) {
  const {
    files,
    isConverting,
    addFiles,
    removeFile,
    clearFiles,
    convertFiles,
    downloadFile,
    downloadAll,
  } = useConverter(tool.id);

  const hasPendingFiles = files.some((f) => f.status === "idle");
  const hasDoneFiles = files.some((f) => f.status === "done");
  const hasFiles = files.length > 0;

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
        <h1 className="text-2xl font-bold tracking-tight">{tool.name}</h1>
        <p className="mt-1 text-muted-foreground">{tool.description}</p>
      </div>

      <div className="space-y-4">
        <Dropzone
          acceptedTypes={tool.acceptedTypes}
          maxFiles={tool.maxFiles}
          currentFileCount={files.length}
          onFilesAdded={addFiles}
          disabled={isConverting}
        />

        <FileList files={files} onRemove={removeFile} onDownload={downloadFile} />

        {hasFiles && (
          <div className="flex flex-wrap gap-2">
            {hasPendingFiles && (
              <Button onClick={convertFiles} disabled={isConverting} className="gap-2">
                {isConverting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Converting...
                  </>
                ) : (
                  `Convert ${files.filter((f) => f.status === "idle").length} file${files.filter((f) => f.status === "idle").length > 1 ? "s" : ""}`
                )}
              </Button>
            )}

            {hasDoneFiles && files.filter((f) => f.status === "done").length > 1 && (
              <Button variant="outline" onClick={downloadAll} className="gap-2">
                <Download className="h-4 w-4" />
                Download All
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={clearFiles}
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
