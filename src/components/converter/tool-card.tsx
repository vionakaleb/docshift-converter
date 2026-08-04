import Link from "next/link";
import {
  FileText,
  FileSearch,
  Image,
  Crop,
  Scissors,
  Merge,
  Presentation,
  FileCode,
  ArrowRight,
} from "lucide-react";
import { ToolConfig } from "@/types";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  FileSearch,
  Image,
  Crop,
  Scissors,
  Merge,
  Presentation,
  FileCode,
};

interface ToolCardProps {
  tool: ToolConfig;
}

export function ToolCard({ tool }: ToolCardProps) {
  const IconComponent = iconMap[tool.icon] || FileText;

  return (
    <Link
      href={`/tools/${tool.id}`}
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border border-border/60 p-5 transition-all",
        "hover:border-primary/40 hover:bg-accent/20 hover:shadow-sm"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <IconComponent className="h-5 w-5" />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
      </div>

      <div>
        <h3 className="font-semibold tracking-tight">{tool.name}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{tool.description}</p>
      </div>

      <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-md bg-secondary/40 px-2 py-0.5">{tool.inputLabel}</span>
        <ArrowRight className="h-3 w-3" />
        <span className="rounded-md bg-secondary/40 px-2 py-0.5">{tool.outputLabel}</span>
      </div>
    </Link>
  );
}
