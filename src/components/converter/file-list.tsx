"use client";

import { FileEntry } from "@/types";
import { formatFileSize } from "@/lib/validation/file-validator";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileListProps {
  files: FileEntry[];
  onRemove: (id: string) => void;
  onDownload: (entry: FileEntry) => void;
}

function StatusIcon({ status }: { status: FileEntry["status"] }) {
  switch (status) {
    case "converting":
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case "done":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return null;
  }
}

export function FileList({ files, onRemove, onDownload }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-2">
      {files.map((entry) => (
        <div
          key={entry.id}
          className={cn(
            "flex items-center gap-3 rounded-lg border p-3 transition-colors",
            entry.status === "error" && "border-destructive/50 bg-destructive/5",
            entry.status === "done" && "border-green-500/30 bg-green-500/5"
          )}
        >
          <StatusIcon status={entry.status} />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{entry.resultName || entry.file.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(entry.file.size)}</p>

            {entry.status === "converting" && (
              <Progress value={entry.progress} className="mt-1.5 h-1.5" />
            )}

            {entry.error && (
              <p className="mt-1 text-xs text-destructive">{entry.error}</p>
            )}
          </div>

          <div className="flex items-center gap-1">
            {entry.status === "done" && entry.result && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onDownload(entry)}
                aria-label="Download converted file"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}

            {entry.status !== "converting" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(entry.id)}
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
