import DOMPurify from "dompurify";

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "width", "height", "class", "style",
      "target", "rel", "colspan", "rowspan", "cellpadding", "cellspacing",
      "border", "align", "valign", "bgcolor", "color", "dir", "lang",
      "data-blocked-src",
    ],
  });
}

/** The entities that actually appear in provider-supplied snippets. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
};

/**
 * Decode HTML entities in text that will be rendered as plain text.
 *
 * Gmail returns `snippet` HTML-escaped, and it is stored that way, so previews
 * show `it&#39;s` and `&lt;address&gt;` verbatim. Decoding happens at render
 * time rather than on write so existing rows are fixed without a migration.
 *
 * Text only — never run this on markup that will be inserted as HTML, since it
 * would undo the escaping that makes it safe.
 */
export function decodeHtmlEntities(input: string | null): string | null {
  if (!input || input.indexOf("&") === -1) return input;

  return input.replace(
    /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g,
    (match, entity: string) => {
      if (entity.startsWith("#x") || entity.startsWith("#X")) {
        const code = parseInt(entity.slice(2), 16);
        return Number.isFinite(code) ? safeFromCodePoint(code, match) : match;
      }
      if (entity.startsWith("#")) {
        const code = parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? safeFromCodePoint(code, match) : match;
      }
      return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
    },
  );
}

function safeFromCodePoint(code: number, fallback: string): string {
  if (code < 0 || code > 0x10ffff) return fallback;
  try {
    return String.fromCodePoint(code);
  } catch {
    return fallback;
  }
}
