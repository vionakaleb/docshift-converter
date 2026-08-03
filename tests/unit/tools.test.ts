import { describe, it, expect } from "vitest";
import { TOOLS, getToolConfig } from "@/lib/tools";

describe("TOOLS config", () => {
  it("has 9 tools", () => {
    expect(TOOLS).toHaveLength(9);
  });

  it("each tool has required fields", () => {
    for (const tool of TOOLS) {
      expect(tool.id).toBeTruthy();
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.acceptedTypes).toBeTruthy();
      expect(tool.maxFiles).toBeGreaterThan(0);
      expect(["convert", "manipulate"]).toContain(tool.category);
    }
  });

  it("has unique ids", () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getToolConfig", () => {
  it("finds a tool by id", () => {
    const tool = getToolConfig("md-to-pdf");
    expect(tool).toBeDefined();
    expect(tool?.name).toBe("MD → PDF");
  });

  it("returns undefined for unknown id", () => {
    expect(getToolConfig("unknown-tool")).toBeUndefined();
  });
});
