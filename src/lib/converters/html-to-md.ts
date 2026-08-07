// Converts pasted rich text (HTML) into Markdown. Runs client-side only,
// since it relies on DOMParser to walk the pasted clipboard fragment.

const SKIP_TAGS = new Set(["script", "style", "meta", "link", "head", "title"]);

function isBold(el: HTMLElement): boolean {
  const weight = el.style.fontWeight;
  return (
    el.tagName === "STRONG" ||
    el.tagName === "B" ||
    weight === "bold" ||
    weight === "700" ||
    weight === "800" ||
    weight === "900" ||
    Number(weight) >= 600
  );
}

function isItalic(el: HTMLElement): boolean {
  return el.tagName === "EM" || el.tagName === "I" || el.style.fontStyle === "italic";
}

function isStrike(el: HTMLElement): boolean {
  return (
    el.tagName === "S" ||
    el.tagName === "STRIKE" ||
    el.tagName === "DEL" ||
    el.style.textDecoration.includes("line-through")
  );
}

function isCode(el: HTMLElement): boolean {
  return (
    el.tagName === "CODE" ||
    el.tagName === "KBD" ||
    (el.style.fontFamily || "").toLowerCase().includes("mono")
  );
}

function collapseSpace(text: string): string {
  return text.replace(/[ \t\n]+/g, " ");
}

function convertInline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return collapseSpace(node.textContent || "");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return "";
  if (tag === "br") return "\\\n";

  const inner = Array.from(el.childNodes).map(convertInline).join("");
  const trimmed = inner.trim();
  if (!trimmed) return inner;
  const lead = inner.match(/^\s*/)?.[0] ?? "";
  const trail = inner.match(/\s*$/)?.[0] ?? "";

  if (tag === "a") {
    const href = el.getAttribute("href");
    return href ? `${lead}[${trimmed}](${href})${trail}` : inner;
  }
  if (tag === "img") {
    const alt = el.getAttribute("alt") || "";
    const src = el.getAttribute("src") || "";
    return `![${alt}](${src})`;
  }
  if (isCode(el)) return `${lead}\`${trimmed}\`${trail}`;
  if (isBold(el) && isItalic(el)) return `${lead}***${trimmed}***${trail}`;
  if (isBold(el)) return `${lead}**${trimmed}**${trail}`;
  if (isItalic(el)) return `${lead}*${trimmed}*${trail}`;
  if (isStrike(el)) return `${lead}~~${trimmed}~~${trail}`;

  return inner;
}

function convertBlock(node: Node, listDepth = 0): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = collapseSpace(node.textContent || "").trim();
    return text ? text + "\n\n" : "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return "";

  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag[1]);
    const text = convertInline(el).trim();
    return text ? `${"#".repeat(level)} ${text}\n\n` : "";
  }

  if (tag === "hr") return "---\n\n";

  if (tag === "pre") {
    const codeEl = el.querySelector("code");
    const lang = codeEl?.className.match(/language-(\S+)/)?.[1] || "";
    const code = (codeEl ?? el).textContent?.replace(/\n+$/, "") || "";
    return "```" + lang + "\n" + code + "\n```\n\n";
  }

  if (tag === "blockquote") {
    const inner = Array.from(el.childNodes)
      .map((child) => convertBlock(child, listDepth))
      .join("")
      .trim();
    const quoted = inner
      .split("\n")
      .map((line) => (line ? `> ${line}` : ">"))
      .join("\n");
    return quoted ? `${quoted}\n\n` : "";
  }

  if (tag === "ul" || tag === "ol") {
    // Quill (and some other editors) render nested lists as flat sibling <li>
    // elements tagged with a `ql-indent-N` class and a `data-list` marker type,
    // rather than genuine nested <ul>/<ol>. Support both shapes.
    const items = Array.from(el.children).filter((c) => c.tagName === "LI");
    const counters: number[] = [];
    let out = "";
    for (const li of items) {
      const quillIndent = Number(li.className.match(/ql-indent-(\d+)/)?.[1] || 0);
      const depth = listDepth + quillIndent;
      const listType = li.getAttribute("data-list");
      const isOrdered = listType ? listType === "ordered" : tag === "ol";

      let marker: string;
      if (listType === "checked") marker = "- [x] ";
      else if (listType === "unchecked") marker = "- [ ] ";
      else if (isOrdered) {
        counters.length = depth + 1;
        counters[depth] = (counters[depth] || 0) + 1;
        marker = `${counters[depth]}. `;
      } else marker = "- ";

      const nestedLists = Array.from(li.children).filter((c) =>
        ["UL", "OL"].includes(c.tagName),
      );
      const inlineChildren = Array.from(li.childNodes).filter(
        (c) => !(c.nodeType === Node.ELEMENT_NODE && ["UL", "OL"].includes((c as Element).tagName)),
      );
      const text = inlineChildren.map(convertInline).join("").trim();
      out += `${"  ".repeat(depth)}${marker}${text}\n`;
      for (const nested of nestedLists) {
        out += convertBlock(nested, depth + 1);
      }
    }
    return out + (listDepth === 0 ? "\n" : "");
  }

  if (tag === "table") {
    const rows = Array.from(el.querySelectorAll("tr"));
    if (rows.length === 0) return "";
    const rowCells = rows.map((row) =>
      Array.from(row.children).map((cell) => convertInline(cell).trim() || " "),
    );
    const colCount = Math.max(...rowCells.map((r) => r.length));
    const pad = (cells: string[]) => {
      while (cells.length < colCount) cells.push(" ");
      return cells;
    };
    let out = `| ${pad(rowCells[0]).join(" | ")} |\n`;
    out += `| ${Array(colCount).fill("---").join(" | ")} |\n`;
    for (const row of rowCells.slice(1)) {
      out += `| ${pad(row).join(" | ")} |\n`;
    }
    return out + "\n";
  }

  if (tag === "li") {
    // Loose <li> encountered outside ul/ol context (rare), treat as bullet.
    return `- ${convertInline(el).trim()}\n`;
  }

  if (["p", "div", "section", "article"].includes(tag)) {
    const text = convertInline(el).trim();
    return text ? `${text}\n\n` : "";
  }

  // Unknown container: recurse into children as block content.
  const childBlocks = Array.from(el.childNodes)
    .map((child) => convertBlock(child, listDepth))
    .join("");
  if (childBlocks) return childBlocks;

  const text = convertInline(el).trim();
  return text ? `${text}\n\n` : "";
}

export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;

  const out = Array.from(body.childNodes)
    .map((node) => convertBlock(node))
    .join("");

  return out
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";
}
