export type ToolId =
  | "md-to-pdf"
  | "md-to-docx"
  | "md-to-pptx"
  | "pdf-to-md"
  | "docx-to-md"
  | "image-to-pdf"
  | "pdf-to-image"
  | "pdf-split"
  | "pdf-merge"
  | "pptx-builder";

export type ConversionStatus =
  | "idle"
  | "uploading"
  | "converting"
  | "done"
  | "error";

export interface FileEntry {
  id: string;
  file: File;
  status: ConversionStatus;
  progress: number;
  result?: Blob;
  resultName?: string;
  error?: string;
}

export interface ToolConfig {
  id: ToolId;
  name: string;
  description: string;
  inputLabel: string;
  outputLabel: string;
  acceptedTypes: string;
  maxFiles: number;
  icon: string;
  category: "convert" | "manipulate" | "builder";
  href?: string;
  hidden?: boolean;
}

export interface ConversionResult {
  blob: Blob;
  filename: string;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageRange {
  start: number;
  end: number;
}
