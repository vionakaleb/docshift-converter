import type { Metadata } from "next";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocShift - Free Document Converter",
  description:
    "Convert Markdown MD, PDF, DOCX, PPTX and images. Split, merge, and crop PDFs. Build PPTX. Free, secured and privacy-first.",
  keywords: [
    "document converter",
    "markdown to pdf",
    "markdown to docx",
    "markdown to pptx",
    "pdf to markdown",
    "docx to markdown",
    "pptx to markdown",
    "md to pdf",
    "md to docx",
    "md to pptx",
    "pdf to md",
    "docx to md",
    "pptx to md",
    "docx converter",
    "pdf merge",
    "pdf split",
    "pdf crop",
    "image to pdf",
    "free converter",
    "open source",
  ],
  openGraph: {
    title: "DocShift - Free Document Converter",
    description:
      "Convert Markdown MD, PDF, DOCX, PPTX and images. Split, merge, and crop PDFs. Build PPTX. Free, secured and privacy-first.",
    type: "website",
    locale: "en_US",
    siteName: "DocShift",
  },
  twitter: {
    card: "summary_large_image",
    title: "DocShift - Free Document Converter",
    description:
      "Convert Markdown MD, PDF, DOCX, PPTX and images. Split, merge, and crop PDFs. Build PPTX. Free, secured and privacy-first.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
