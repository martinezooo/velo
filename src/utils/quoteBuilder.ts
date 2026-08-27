import { sanitizeHtml } from "./sanitize";

/**
 * The quoted copy of a message, for a reply or a forward.
 *
 * Two things have to be removed before the original's HTML goes into a draft.
 *
 * `cid:` references point at parts of the *incoming* message, which are not
 * carried into the outgoing one — quoting them verbatim sends the recipient a
 * block of broken images.
 *
 * `data:` images are worse: they survive, so the sender's pictures get
 * re-encoded into every reply, and a thread that goes back and forth a few
 * times drags the same images along each time.
 *
 * Both are replaced by a short marker, which says an image was there without
 * pretending to still have it. Remote images are left alone: they cost nothing
 * to carry and the reader's client decides whether to load them.
 */

/** Stand-in for an image the reply cannot carry. */
const IMAGE_MARKER =
  '<span style="color:#888;font-style:italic">[image]</span>';

export function stripUnresolvableImages(html: string): string {
  return html.replace(
    /<img\b[^>]*>/gi,
    (tag) => (/\ssrc\s*=\s*["']?\s*(cid:|data:)/i.test(tag) ? IMAGE_MARKER : tag),
  );
}

interface QuotableMessage {
  from_name: string | null;
  from_address: string | null;
  date: string | number;
  subject?: string | null;
  to_addresses?: string | null;
  body_html: string | null;
  body_text: string | null;
}

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function quotedBody(msg: QuotableMessage): string {
  if (msg.body_html) {
    // Sanitised as well as stripped: this HTML came from someone else and is
    // about to be placed in an editable draft.
    return stripUnresolvableImages(sanitizeHtml(msg.body_html));
  }
  return escape(msg.body_text ?? "").replace(/\n/g, "<br>");
}

function sender(msg: QuotableMessage): string {
  return msg.from_name
    ? `${escape(msg.from_name)} &lt;${escape(msg.from_address ?? "")}&gt;`
    : escape(msg.from_address ?? "Unknown");
}

export function buildQuote(msg: QuotableMessage): string {
  const date = new Date(msg.date).toLocaleString();
  return `<br><br><div style="border-left:2px solid #ccc;padding-left:12px;margin-left:0;color:#666">`
    + `On ${escape(date)}, ${sender(msg)} wrote:<br>${quotedBody(msg)}</div>`;
}

export function buildForwardQuote(msg: QuotableMessage): string {
  const date = new Date(msg.date).toLocaleString();
  return `<br><br>---------- Forwarded message ---------`
    + `<br>From: ${sender(msg)}`
    + `<br>Date: ${escape(date)}`
    + `<br>Subject: ${escape(msg.subject ?? "")}`
    + `<br>To: ${escape(msg.to_addresses ?? "")}`
    + `<br><br>${quotedBody(msg)}`;
}
