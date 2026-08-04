import { getToolConfig } from "@/lib/tools";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BidirectionalWrapper } from "@/components/converter/bidirectional-wrapper";

const toolId = "image-to-pdf";

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

export default function ToolPage() {
  const forwardTool = getToolConfig("image-to-pdf");
  const reverseTool = getToolConfig("pdf-to-image");

  if (!forwardTool || !reverseTool) notFound();

  return (
    <BidirectionalWrapper
      forwardTool={forwardTool}
      reverseTool={reverseTool}
      convertType="image"
    ></BidirectionalWrapper>
  );
}
