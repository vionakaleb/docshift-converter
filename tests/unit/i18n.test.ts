import { describe, it, expect } from "vitest";
import { t } from "@/lib/i18n";

describe("t (translation function)", () => {
  it("returns a simple translation", () => {
    expect(t("app.name")).toBe("DocShift");
  });

  it("returns nested translation", () => {
    expect(t("upload.convert")).toBe("Convert");
  });

  it("interpolates variables", () => {
    const result = t("upload.hint", { maxFiles: 10 });
    expect(result).toBe("Up to 10 files, 10MB each");
  });

  it("returns path when key not found", () => {
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });
});
