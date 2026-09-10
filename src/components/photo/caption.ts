const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: "\u00a0",
  quot: '"',
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#(?:x[\da-f]+|\d+)|[a-z][\da-z]+);/gi, (entity, name: string) => {
    if (name.startsWith("#x") || name.startsWith("#X")) {
      const codePoint = Number.parseInt(name.slice(2), 16);
      return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    }
    if (name.startsWith("#")) {
      const codePoint = Number.parseInt(name.slice(1), 10);
      return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    }
    return NAMED_ENTITIES[name.toLowerCase()] ?? entity;
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function captionAttribute(tag: string, name: "href" | "title"): string | null {
  const expression = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\\x60]+))`,
    "i",
  );
  const match = expression.exec(tag);
  if (!match) return null;
  return decodeHtmlEntities(match[1] ?? match[2] ?? match[3] ?? "");
}

function captionHref(tag: string): string | null {
  const href = (captionAttribute(tag, "href") ?? "").trim();
  if (href === "" || href.startsWith("//")) return null;

  // Historical captions contain http(s), fragment, root-relative and file-relative links.
  // Reject any other URI scheme while retaining those legacy cases.
  const normalized = href.replace(/[\u0000-\u0020]/g, "");
  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(normalized)?.[1]?.toLowerCase();
  if (scheme !== undefined && scheme !== "http" && scheme !== "https") return null;
  return href;
}

/**
 * Preserve the legacy caption links and entity decoding without trusting the
 * historical CSV as arbitrary HTML. All elements except anchors are reduced to
 * text, and anchors receive a validated href plus safe new-window attributes.
 */
export function sanitizePhotoCaption(caption: string): string {
  let output = "";
  let offset = 0;
  let anchorOpen = false;
  const tags = /<[^>]*>/g;

  for (const match of caption.matchAll(tags)) {
    const index = match.index;
    output += escapeHtml(decodeHtmlEntities(caption.slice(offset, index)));
    const tag = match[0];

    if (/^<a\b/i.test(tag)) {
      if (anchorOpen) output += "</a>";
      const href = captionHref(tag);
      anchorOpen = href !== null;
      if (href !== null) {
        const title = captionAttribute(tag, "title");
        const titleAttribute = title === null ? "" : ` title="${escapeHtml(title)}"`;
        output += `<a href="${escapeHtml(href)}"${titleAttribute} target="_blank" rel="noopener noreferrer">`;
      }
    } else if (/^<\/a\s*>/i.test(tag) && anchorOpen) {
      output += "</a>";
      anchorOpen = false;
    }

    offset = index + tag.length;
  }

  output += escapeHtml(decodeHtmlEntities(caption.slice(offset)));
  if (anchorOpen) output += "</a>";
  return output;
}
