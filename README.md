# DocShift - Document Utilities, 100% Browser‑Side

Convert Markdown, PDF, DOCX, and images. Split, merge, and crop PDFs. Build PPTX. Free, secured and privacy-first. Your files stay private.

## Features

- 📄 **MD → PDF** – Generate PDFs from Markdown
- 📝 **MD → DOCX** – Create Word documents from Markdown
- 🔍 **PDF → MD** – Extract text, bold, italic, headers, tables
- 🔄 **DOCX → MD** – Convert Word to Markdown (basic formatting)
- 🖼️ **Image → PDF** – Combine images into a single PDF
- 🧩 **PDF → Image** – Extract pages as PNG/JPG
- ✂️ **PDF Crop** – Trim pages to custom bounds
- 📑 **Split PDF** – Extract selected pages
- 🧬 **Merge PDF** – Combine multiple PDFs
- 🎨 **PPTX Builder** – Write a pptxgenjs script and get a .pptx file

## Why this exists

Generating complex formats with AI burns tokens. Markdown is cheap. DocShift converts cheap MD into the formats you actually need. All locally, privately, and for free.

## Privacy

Client-side operations (merge, split, crop, image-to-pdf) never leave your browser. Server-side conversions (markdown, docx) process files in memory and discard them immediately.

## Getting Started

```bash
# Clone
git clone https://github.com/your-username/docshift.git
cd docshift

# Install
npm install

# Dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How To Use

1. Open the app
2. Choose your tool
3. Upload or paste your content
4. Download the result

No sign‑up, no server, no trace.

## Testing

```bash
npm test           # Run all tests
npm run test:watch # Watch mode
```

## Deployment (Railway)

The project includes a Dockerfile for containerized deployment.

```bash
# Build Docker image
docker build -t docshift .
docker run -p 3000:3000 docshift
```

On Railway, connect the repo and it will auto-detect the Dockerfile.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4, shadcn/ui components
- **PDF:** pdf-lib (client), pdfjs-dist (server)
- **Markdown:** marked
- **DOCX:** docx (write), mammoth (read)
- **Testing:** Vitest, React Testing Library
- **Deployment:** Docker / Railway

## Project Structure

```
src/
├── app/
│   ├── api/convert/          # Server-side conversion endpoints
│   ├── tools/                # Individual tool pages
│   ├── layout.tsx
│   ├── page.tsx              # Dashboard
│   └── globals.css
├── components/
│   ├── converter/            # Dropzone, file list, converter page
│   ├── layout/               # Header, footer, theme
│   └── ui/                   # Button, progress bar
├── hooks/
│   └── use-converter.ts      # File conversion orchestration
├── lib/
│   ├── converters/           # Client-side: pdf-lib, image-to-pdf
│   ├── validation/           # File size/type validation
│   ├── i18n/                 # Translation strings
│   ├── tools.ts              # Tool config registry
│   └── utils.ts
└── types/
    └── index.ts
tests/
├── unit/
└── integration/
```

## Limits

- Max file size: 10MB per file
- Max batch: 10 files
- Accepted types vary per tool (see each tool page)

## License

MIT
