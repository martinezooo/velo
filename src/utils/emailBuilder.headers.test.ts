import { describe, it, expect } from "vitest";
import { buildRawEmail } from "./emailBuilder";

function decode(b64url: string): string {
  return Buffer.from(b64url.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

const base = {
  from: "Marcin Bortkiewicz <m@x.pl>",
  to: ["a@x.pl"],
  subject: "Hello",
  htmlBody: "<p>Hi</p>",
};

describe("buildRawEmail headers", () => {
  it("produces a well-formed Message-ID when From carries a display name", () => {
    // Splitting "Name <m@x.pl>" on "@" used to yield "x.pl>", giving "<...@x.pl>>"
    const raw = decode(buildRawEmail(base));
    const line = raw.split("\n").find((l) => l.startsWith("Message-ID:"))!.trim();
    expect(line).toMatch(/^Message-ID: <[^<>]+@x\.pl>$/);
  });

  it("threads a reply with the parent's Message-ID and chain", () => {
    const raw = decode(buildRawEmail({
      ...base,
      inReplyTo: "<parent@eurodyn.com>",
      references: "<a@x> <parent@eurodyn.com>",
    }));
    expect(raw).toContain("In-Reply-To: <parent@eurodyn.com>");
    expect(raw).toContain("References: <a@x> <parent@eurodyn.com>");
  });

  it("omits threading headers entirely for a new message", () => {
    const raw = decode(buildRawEmail(base));
    expect(raw).not.toContain("In-Reply-To:");
    expect(raw).not.toContain("References:");
  });

  it("declares an encoding for text parts carrying UTF-8", () => {
    const raw = decode(buildRawEmail({ ...base, htmlBody: "<p>Cześć — ważne</p>" }));
    expect(raw).toContain("Content-Transfer-Encoding: 8bit");
    expect(raw).toContain("charset=UTF-8");
  });

  it("keeps an inline image as a related part the HTML can reference", () => {
    const raw = decode(buildRawEmail({
      ...base,
      htmlBody: '<img src="data:image/png;base64,iVBORw0KGgo=">',
    }));
    const cid = raw.match(/Content-ID: <([^>]+)>/)?.[1];
    expect(cid).toBeTruthy();
    expect(raw).toContain(`src="cid:${cid}"`);
    expect(raw).toContain("multipart/related");
  });

  it("nests attachments and inline images correctly together", () => {
    const raw = decode(buildRawEmail({
      ...base,
      htmlBody: '<img src="data:image/png;base64,iVBORw0KGgo=">',
      attachments: [{ filename: "c.pdf", mimeType: "application/pdf", content: "QUJD" }],
    }));
    // mixed wraps related wraps alternative
    expect(raw.indexOf("multipart/mixed")).toBeLessThan(raw.indexOf("multipart/related"));
    expect(raw.indexOf("multipart/related")).toBeLessThan(raw.indexOf("multipart/alternative"));
    expect(raw).toContain('Content-Disposition: attachment; filename="c.pdf"');
  });
});
