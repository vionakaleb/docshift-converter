import { TOOLS } from "@/lib/tools";
import { ToolCard } from "@/components/converter/tool-card";
import { ArrowLeftRight } from "lucide-react";

export default function HomePage() {
  const converters = TOOLS.filter((t) => t.category === "convert");
  const manipulators = TOOLS.filter((t) => t.category === "manipulate");

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <section className="mb-12 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <ArrowLeftRight className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">DocShift</h1>
        <p className="mx-auto mt-3 max-w-lg text-lg text-muted-foreground">
          Convert, split, merge, and crop documents. Free and open source. Your files stay private.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Converters</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {converters.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">PDF Tools</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {manipulators.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>
    </div>
  );
}
