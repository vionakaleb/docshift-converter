"use client";

import { useState } from "react";
import { ToolConfig } from "@/types";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ImageConverter } from "./image-converter";
import { MdConverter } from "./md-converter";
import { RichTextConverter } from "./richtext-converter";

interface Props {
  forwardTool: ToolConfig;
  reverseTool: ToolConfig;
  convertType: "image" | "md" | "richtext";
}

export function BidirectionalWrapper({
  forwardTool,
  reverseTool,
  convertType,
}: Props) {
  const [isReversed, setIsReversed] = useState(false);

  // Labels for the current direction
  const inputLabel = isReversed
    ? reverseTool.inputLabel
    : forwardTool.inputLabel;
  const outputLabel = isReversed
    ? reverseTool.outputLabel
    : forwardTool.outputLabel;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All tools
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setIsReversed((r) => !r)}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {/* {outputLabel} → {inputLabel} */}
          </Button>

          <h1 className="text-2xl font-bold tracking-tight">
            {inputLabel} → {outputLabel}
          </h1>
        </div>

        <p className="mt-1 text-muted-foreground">
          {isReversed ? reverseTool.description : forwardTool.description}
        </p>
      </div>

      {convertType === "image" ? (
        <ImageConverter
          forwardTool={forwardTool}
          reverseTool={reverseTool}
          isReversed={isReversed}
        />
      ) : convertType === "md" ? (
        <MdConverter
          forwardTool={forwardTool}
          reverseTool={reverseTool}
          outputLabel={outputLabel}
          isReversed={isReversed}
        />
      ) : convertType === "richtext" ? (
        <RichTextConverter
          forwardTool={forwardTool}
          reverseTool={reverseTool}
          isReversed={isReversed}
        />
      ) : (
        ""
      )}
    </div>
  );
}
