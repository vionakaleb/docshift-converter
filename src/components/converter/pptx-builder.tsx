"use client";

import { useState } from "react";
import { defaultScript } from "@/app/tools/pptx-builder/defaultScript";
import { Button } from "../ui/button";

export default function PptxBuilder() {
  const [script, setScript] = useState(defaultScript);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Transformation helper ---
  function transformToBuildFunction(original: string): string {
    // If it already looks like a buildPresentation function, return as is
    if (original.includes("function buildPresentation")) {
      return original;
    }

    let transformed = original;

    // 1. Remove the `require("pptxgenjs")` line
    transformed = transformed.replace(
      /^\s*const\s+pptxgen\s*=\s*require\s*\(["']pptxgenjs["']\)\s*;?\s*$/m,
      "",
    );

    // 2. Remove the `pres.writeFile(...)` call and everything after it
    const writeFileIndex = transformed.indexOf("pres.writeFile");
    if (writeFileIndex !== -1) {
      transformed = transformed.substring(0, writeFileIndex);
    }

    // 3. Trim extra whitespace
    transformed = transformed.trim();

    // 4. Wrap in the buildPresentation function
    return `function buildPresentation(pptxgen) {\n${transformed}\n\n  // Return the presentation object – the API will convert it to a downloadable file\n  return pres;\n}`;
  }

  // --- Generate PPTX ---
  const generate = async (scriptToUse: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/pptx-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: scriptToUse }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "presentation.pptx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        className="w-full h-96 p-3 border rounded-md font-mono text-sm bg-gray-50 dark:bg-gray-800"
        value={script}
        onChange={(e) => setScript(e.target.value)}
        spellCheck={false}
      />

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Button
          onClick={() => {
            const transformed = transformToBuildFunction(script);
            setScript(transformed);
            generate(transformed);
          }}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate PPTX"}
        </Button>

        {error && <span className="text-red-500">{error}</span>}
      </div>
    </div>
  );
}
