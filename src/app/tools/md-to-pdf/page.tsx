import { getToolConfig } from "@/lib/tools";
import { MdEditorConverter } from "@/components/converter/md-editor-converter";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const toolId = "md-to-pdf";

export function generateMetadata(): Metadata {
  const tool = getToolConfig(toolId);
  if (!tool) return {};
  return {
    title: `${tool.name} - DocShift`,
    description: tool.description,
    openGraph: { title: `${tool.name} - DocShift`, description: tool.description },
  };
}

export default function ToolPage() {
  const tool = getToolConfig(toolId);
  if (!tool) notFound();
  return <MdEditorConverter tool={tool} />;
}
