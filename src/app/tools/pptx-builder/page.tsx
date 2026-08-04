import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getToolConfig } from "@/lib/tools";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import PptxBuilder from "@/components/converter/pptx-builder";

const toolId = "pptx-builder";

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

export default function PptxBuilderPage() {
  const tool = getToolConfig(toolId);
  if (!tool) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All tools
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{tool.name}</h1>
        <p className="mt-1 text-muted-foreground">{tool.description}</p>
      </div>

      <PptxBuilder />
    </div>
  );
}
