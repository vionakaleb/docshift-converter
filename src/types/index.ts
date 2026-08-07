export type ToolId =
  | "md-to-pdf"
  | "md-to-docx"
  | "md-to-pptx"
  | "pdf-to-md"
  | "docx-to-md"
  | "md-to-richtext"
  | "richtext-to-md"
  | "image-to-pdf"
  | "pdf-to-image"
  | "pdf-split"
  | "pdf-merge"
  | "pdf-sign"
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

export type SignatureFontKey = "times-italic" | "helvetica" | "helvetica-bold" | "courier";

interface SignatureBase {
  id: string;
  /** 1-indexed PDF page this signature is placed on. */
  page: number;
  /** Top-left position, as a % of the page's rendered width/height. */
  xPct: number;
  yPct: number;
}

export interface TextSignature extends SignatureBase {
  type: "text";
  text: string;
  fontKey: SignatureFontKey;
  color: string;
  /** Font size in PDF points (the page's own coordinate space). */
  fontSizePt: number;
}

export interface ImageSignature extends SignatureBase {
  type: "image";
  dataUrl: string;
  widthPct: number;
  heightPct: number;
  naturalAspect: number;
}

export type SignatureElement = TextSignature | ImageSignature;
