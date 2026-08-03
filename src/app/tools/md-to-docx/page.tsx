import { getToolConfig } from "@/lib/tools";
import { BidirectionalMdConverter } from "@/components/converter/bidirectional-md-converter";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const toolId = "md-to-docx";

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
  const forwardTool = getToolConfig("md-to-docx");
  const reverseTool = getToolConfig("docx-to-md");
  if (!forwardTool || !reverseTool) notFound();
  return <BidirectionalMdConverter forwardTool={forwardTool} reverseTool={reverseTool} />;
}
