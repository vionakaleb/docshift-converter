"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type Quill from "quill";
import "quill/dist/quill.snow.css";
import { cn } from "@/lib/utils";

export interface QuillEditorHandle {
  getHTML: () => string;
  clear: () => void;
}

interface Props {
  placeholder?: string;
  onUpdate?: (isEmpty: boolean) => void;
  className?: string;
}

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["blockquote", "code-block", "link"],
  ["clean"],
];

export const QuillEditor = forwardRef<QuillEditorHandle, Props>(function QuillEditor(
  { placeholder, onUpdate, className },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);

  useEffect(() => {
    if (!containerRef.current || quillRef.current) return;
    let cancelled = false;

    import("quill").then(({ default: QuillCtor }) => {
      if (cancelled || !containerRef.current || quillRef.current) return;
      const quill = new QuillCtor(containerRef.current, {
        theme: "snow",
        placeholder,
        modules: { toolbar: TOOLBAR_OPTIONS },
      });
      quillRef.current = quill;
      quill.on("text-change", () => {
        onUpdate?.(quill.getLength() <= 1);
      });
    });

    return () => {
      cancelled = true;
      quillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    getHTML: () => quillRef.current?.root.innerHTML ?? "",
    clear: () => {
      quillRef.current?.setContents([]);
      onUpdate?.(true);
    },
  }));

  return (
    <div className={cn("richtext-quill", className)}>
      <div ref={containerRef} />
    </div>
  );
});
