# DocShift

Free, open-source document converter. Convert Markdown, PDF, DOCX, and images. Split, merge, and crop PDFs. Your files stay private.

## Features

- **MD → PDF** — Markdown to styled PDF via print dialog
- **MD → DOCX** — Markdown to Word with headings, bold, italic, tables, code
- **PDF → MD** — Extract text from PDFs as Markdown with formatting detection
- **DOCX → MD** — Word to clean Markdown
- **Image → PDF** — Combine PNG, JPG, WebP, GIF, BMP into a PDF
- **PDF → Image** — Render PDF pages as high-quality PNGs
- **PDF Crop** — Visual drag-to-crop selection
- **PDF Split** — Split pages into individual files
- **PDF Merge** — Combine multiple PDFs into one

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
