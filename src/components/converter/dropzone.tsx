"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateFiles, ValidationError } from "@/lib/validation/file-validator";
import { Button } from "@/components/ui/button";

interface DropzoneProps {
  acceptedTypes: string;
  maxFiles: number;
  currentFileCount: number;
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

export function Dropzone({
  acceptedTypes,
  maxFiles,
  currentFileCount,
  onFilesAdded,
  disabled = false,
}: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const remainingSlots = maxFiles - currentFileCount;

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      const filesArray = Array.from(fileList).slice(0, remainingSlots);
      const validationErrors = validateFiles(filesArray, acceptedTypes, remainingSlots);

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setTimeout(() => setErrors([]), 5000);
        return;
      }

      setErrors([]);
      onFilesAdded(filesArray);
    },
    [acceptedTypes, remainingSlots, onFilesAdded]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      handleFiles(event.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(event.target.files);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFiles]
  );

  if (currentFileCount > 0 && remainingSlots > 0) {
    return (
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={disabled}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add More Files
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes}
          multiple={maxFiles > 1}
          onChange={handleInputChange}
          className="hidden"
        />
        {errors.length > 0 && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            {errors.map((err, i) => (
              <p key={i} className="text-sm text-destructive">
                {err.file}: {err.message}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (remainingSlots <= 0) return null;

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
        className={cn(
          "flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all",
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <Upload
          className={cn(
            "h-10 w-10 transition-colors",
            isDragOver ? "text-primary" : "text-muted-foreground"
          )}
        />
        <div className="text-center">
          <p className="font-medium">
            {isDragOver ? "Drop files here..." : "Drop files here or click to browse"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Up to {maxFiles} files, 10MB each · {acceptedTypes}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes}
        multiple={maxFiles > 1}
        onChange={handleInputChange}
        className="hidden"
      />

      {errors.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-destructive">
              {err.file}: {err.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
