/** Copies HTML to the clipboard as rich text, with a plain-text fallback for targets that need it. */
export async function copyRichText(html: string, plainText: string): Promise<void> {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    const item = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([plainText], { type: "text/plain" }),
    });
    await navigator.clipboard.write([item]);
    return;
  }

  // Fallback for browsers without the Clipboard API's write(): render the HTML
  // off-screen, select it, and let the browser's own copy command serialize it.
  const container = document.createElement("div");
  container.setAttribute("contenteditable", "true");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.innerHTML = html;
  document.body.appendChild(container);

  const range = document.createRange();
  range.selectNodeContents(container);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  try {
    const ok = document.execCommand("copy");
    if (!ok) throw new Error("Copy command was rejected");
  } finally {
    selection?.removeAllRanges();
    document.body.removeChild(container);
  }
}
