import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getToolConfig } from "@/lib/tools";
import { PdfSigner } from "@/components/converter/pdf-signer";

const toolId = "pdf-sign";

export function generateMetadata(): Metadata {
  const tool = getToolConfig(toolId);
  if (!tool) return {};
  return {
    title: `${tool.name} - DocShift`,
    description: tool.description,
    openGraph: {
      title: `${tool.name} - DocShift`,
      description: tool.description,
    },
  };
}

export default function PdfSignPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All tools
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Sign PDF</h1>
        <p className="mt-1 text-muted-foreground">
          Upload a PDF, add a typed or image signature, drag it into place, then export the
          signed file.
        </p>
      </div>

      <PdfSigner />
    </div>
  );
}
