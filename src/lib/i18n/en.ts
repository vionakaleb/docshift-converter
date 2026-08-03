export const en = {
  app: {
    name: "DocShift",
    tagline: "Convert, split, merge, and crop documents. Free and open source.",
    description:
      "A free, open-source document converter. Transform Markdown, PDF, DOCX, and images with no upload limits and no accounts required.",
  },
  nav: {
    home: "Home",
    tools: "Tools",
    github: "GitHub",
  },
  upload: {
    dropzone: "Drop files here or click to browse",
    dropzoneActive: "Drop files here...",
    hint: "Up to {{maxFiles}} files, 10MB each",
    convert: "Convert",
    converting: "Converting...",
    download: "Download",
    downloadAll: "Download All",
    clear: "Clear All",
    addMore: "Add More Files",
  },
  status: {
    idle: "Ready",
    uploading: "Uploading...",
    converting: "Converting...",
    done: "Done",
    error: "Failed",
  },
  errors: {
    conversionFailed: "Conversion failed. Please try again.",
    invalidFile: "Invalid file type.",
    fileTooLarge: "File exceeds 10MB limit.",
    tooManyFiles: "Too many files. Maximum is {{max}}.",
    networkError: "Network error. Please check your connection.",
  },
  tools: {
    converters: "Converters",
    manipulators: "PDF Tools",
  },
  crop: {
    selectArea: "Click and drag to select crop area",
    apply: "Apply Crop",
    reset: "Reset",
    page: "Page",
  },
  split: {
    pageRange: "Page range",
    allPages: "Split all pages",
    customRange: "Custom range",
    from: "From",
    to: "To",
  },
  merge: {
    reorder: "Drag to reorder files before merging",
  },
} as const;

export type TranslationKeys = typeof en;
