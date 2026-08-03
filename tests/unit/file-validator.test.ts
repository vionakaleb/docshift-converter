import { describe, it, expect } from "vitest";
import { validateFiles, formatFileSize } from "@/lib/validation/file-validator";

function createMockFile(name: string, sizeBytes: number, type: string = ""): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

describe("validateFiles", () => {
  it("accepts valid files within limits", () => {
    const files = [createMockFile("test.pdf", 1024)];
    const errors = validateFiles(files, ".pdf", 10);
    expect(errors).toHaveLength(0);
  });

  it("rejects files exceeding max count", () => {
    const files = Array.from({ length: 5 }, (_, i) => createMockFile(`file${i}.pdf`, 100));
    const errors = validateFiles(files, ".pdf", 3);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Maximum 3 files");
  });

  it("rejects files with wrong extension", () => {
    const files = [createMockFile("test.doc", 1024)];
    const errors = validateFiles(files, ".pdf,.docx", 10);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Invalid file type");
  });

  it("rejects files exceeding 10MB", () => {
    const elevenMB = 11 * 1024 * 1024;
    const files = [createMockFile("huge.pdf", elevenMB)];
    const errors = validateFiles(files, ".pdf", 10);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("too large");
  });

  it("rejects empty files", () => {
    const files = [createMockFile("empty.pdf", 0)];
    const errors = validateFiles(files, ".pdf", 10);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("empty");
  });

  it("accepts multiple valid file types", () => {
    const files = [
      createMockFile("a.md", 500),
      createMockFile("b.txt", 300),
    ];
    const errors = validateFiles(files, ".md,.txt", 10);
    expect(errors).toHaveLength(0);
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(2048)).toBe("2.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
