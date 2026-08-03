const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_BATCH_SIZE = 10;

export interface ValidationError {
  file: string;
  message: string;
}

export function validateFiles(
  files: File[],
  acceptedTypes: string,
  maxFiles: number = MAX_BATCH_SIZE
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (files.length > maxFiles) {
    errors.push({
      file: "batch",
      message: `Maximum ${maxFiles} files allowed. You selected ${files.length}.`,
    });
    return errors;
  }

  const allowedExtensions = acceptedTypes
    .split(",")
    .map((ext) => ext.trim().toLowerCase());

  for (const file of files) {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      errors.push({
        file: file.name,
        message: `Invalid file type. Accepted: ${acceptedTypes}`,
      });
      continue;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      errors.push({
        file: file.name,
        message: `File too large (${sizeMB}MB). Maximum is 10MB.`,
      });
    }

    if (file.size === 0) {
      errors.push({
        file: file.name,
        message: "File is empty.",
      });
    }
  }

  return errors;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
