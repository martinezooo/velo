import { describe, it, expect } from "vitest";
import { stripUnresolvableImages, buildQuote, buildForwardQuote } from "./quoteBuilder";

const msg = {
  from_name: "Lia Giarleli",
  from_address: "lia@eurodyn.com",
  date: 1700000000000,
  subject: "Our Offer",
  to_addresses: "marcin@x.pl",
  body_html: null as string | null,
  body_text: null as string | null,
};

describe("stripUnresolvableImages", () => {
  it("drops a cid image, which points at the original message's parts", () => {
    // Quoting it verbatim sends the recipient a broken image
    const out = stripUnresolvableImages('<p>Hi</p><img src="cid:logo">');
    expect(out).not.toContain("cid:logo");
    expect(out).toContain("[image]");
    expect(out).toContain("<p>Hi</p>");
  });

  it("drops a data image rather than re-sending the sender's picture", () => {
    const out = stripUnresolvableImages('<img src="data:image/png;base64,iVBOR">');
    expect(out).not.toContain("data:image");
    expect(out).toContain("[image]");
  });

  it("keeps a remote image, which costs the reply nothing to carry", () => {
    const html = '<img src="https://example.com/logo.png">';
    expect(stripUnresolvableImages(html)).toBe(html);
  });

  it("matches regardless of quoting or attribute order", () => {
    expect(stripUnresolvableImages("<img alt='x' src=cid:logo >")).toContain("[image]");
    expect(stripUnresolvableImages('<IMG SRC="CID:Logo">')).toContain("[image]");
  });

  it("leaves text alone when there are no images", () => {
    expect(stripUnresolvableImages("<p>plain</p>")).toBe("<p>plain</p>");
  });
});

describe("buildQuote", () => {
  it("strips script from the original before it reaches the draft", () => {
    const out = buildQuote({ ...msg, body_html: "<p>hi</p><script>alert(1)</script>" });
    expect(out).not.toContain("<script");
  });

  it("escapes a sender name that contains markup", () => {
    const out = buildQuote({ ...msg, from_name: "<b>Lia</b>", body_html: "<p>hi</p>" });
    expect(out).not.toContain("<b>Lia</b>");
    expect(out).toContain("&lt;b&gt;");
  });

  it("falls back to plain text, escaped, with breaks preserved", () => {
    const out = buildQuote({ ...msg, body_html: null, body_text: "a <b> b\nsecond" });
    expect(out).toContain("&lt;b&gt;");
    expect(out).toContain("<br>");
  });

  it("keeps the quoted body inside the quote block", () => {
    const out = buildQuote({ ...msg, body_html: "<p>original</p>" });
    expect(out).toContain("wrote:");
    expect(out).toContain("original");
  });
});

describe("buildForwardQuote", () => {
  it("carries the original's envelope, escaped", () => {
    const out = buildForwardQuote({ ...msg, subject: "A & B", body_html: "<p>x</p>" });
    expect(out).toContain("Forwarded message");
    expect(out).toContain("A &amp; B");
  });

  it("strips unresolvable images here too", () => {
    const out = buildForwardQuote({ ...msg, body_html: '<img src="cid:logo">' });
    expect(out).not.toContain("cid:logo");
  });
});
