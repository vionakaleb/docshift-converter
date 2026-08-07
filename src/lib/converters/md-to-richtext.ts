// Turns Markdown into HTML with inline styles baked onto every element, so the
// formatting survives being copied into apps that ignore external stylesheets
// (Gmail, Word, Docs, Notion, Slack, ...).

const BASE_STYLE =
  "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a;";

const STYLE_MAP: Record<string, string> = {
  h1: "font-size:1.6em;font-weight:700;margin:0.7em 0 0.35em;border-bottom:1px solid #e5e5e5;padding-bottom:0.2em;",
  h2: "font-size:1.35em;font-weight:700;margin:0.65em 0 0.3em;border-bottom:1px solid #e5e5e5;padding-bottom:0.15em;",
  h3: "font-size:1.15em;font-weight:700;margin:0.6em 0 0.25em;",
  h4: "font-size:1.05em;font-weight:700;margin:0.5em 0 0.2em;",
  h5: "font-size:1em;font-weight:700;margin:0.5em 0 0.2em;",
  h6: "font-size:0.95em;font-weight:700;margin:0.5em 0 0.2em;color:#555;",
  p: "margin:0 0 0.8em;",
  strong: "font-weight:700;",
  b: "font-weight:700;",
  em: "font-style:italic;",
  i: "font-style:italic;",
  del: "text-decoration:line-through;",
  s: "text-decoration:line-through;",
  code: "background:#f4f4f4;padding:2px 6px;border-radius:3px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.9em;",
  precode:
    "background:none;padding:0;border-radius:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.9em;",
  pre: "background:#f4f4f4;padding:12px 16px;border-radius:6px;overflow-x:auto;margin:0 0 0.8em;white-space:pre;",
  blockquote: "border-left:4px solid #ddd;margin:0 0 0.8em;padding:0.1em 16px;color:#555;",
  ul: "margin:0 0 0.8em;padding-left:1.5em;",
  ol: "margin:0 0 0.8em;padding-left:1.5em;",
  li: "margin:0.2em 0;",
  a: "color:#0366d6;text-decoration:underline;",
  hr: "border:none;border-top:1px solid #e5e5e5;margin:1.5em 0;",
  table: "border-collapse:collapse;width:100%;margin:0 0 0.8em;",
  th: "border:1px solid #ddd;padding:6px 10px;text-align:left;background:#f4f4f4;font-weight:600;",
  td: "border:1px solid #ddd;padding:6px 10px;text-align:left;",
  img: "max-width:100%;",
};

function styleElement(el: Element) {
  const tag = el.tagName.toLowerCase();
  const isPreCode = tag === "code" && el.parentElement?.tagName.toLowerCase() === "pre";
  const style = isPreCode ? STYLE_MAP.precode : STYLE_MAP[tag];
  if (style) {
    const existing = el.getAttribute("style");
    el.setAttribute("style", existing ? `${style}${existing}` : style);
  }
  Array.from(el.children).forEach(styleElement);
}

/** Adds inline styles to raw HTML (as produced by `marked`) for clipboard portability. */
export function styleHtmlForClipboard(html: string): string {
  const container = document.createElement("div");
  container.innerHTML = html;
  Array.from(container.children).forEach(styleElement);
  return `<div style="${BASE_STYLE}">${container.innerHTML}</div>`;
}
