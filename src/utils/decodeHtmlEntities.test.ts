import { describe, it, expect } from "vitest";
import { decodeHtmlEntities } from "./sanitize";

describe("decodeHtmlEntities", () => {
  it("decodes the entities Gmail puts in snippets", () => {
    expect(decodeHtmlEntities("it&#39;s here")).toBe("it's here");
    expect(decodeHtmlEntities("&lt;wijdane@example.com&gt;")).toBe(
      "<wijdane@example.com>",
    );
    expect(decodeHtmlEntities("Tom &amp; Jerry")).toBe("Tom & Jerry");
    expect(decodeHtmlEntities("say &quot;hi&quot;")).toBe('say "hi"');
  });

  it("decodes hex and decimal numeric references", () => {
    expect(decodeHtmlEntities("&#x2014;")).toBe("—");
    expect(decodeHtmlEntities("&#8212;")).toBe("—");
  });

  it("handles non-BMP code points", () => {
    expect(decodeHtmlEntities("&#128512;")).toBe("😀");
  });

  it("leaves text without entities untouched, including bare ampersands", () => {
    expect(decodeHtmlEntities("R&D budget")).toBe("R&D budget");
    expect(decodeHtmlEntities("plain text")).toBe("plain text");
  });

  it("leaves unknown or malformed entities as they are", () => {
    expect(decodeHtmlEntities("&nosuchentity;")).toBe("&nosuchentity;");
    expect(decodeHtmlEntities("&#x110000;")).toBe("&#x110000;");
  });

  it("passes null and empty input through", () => {
    expect(decodeHtmlEntities(null)).toBeNull();
    expect(decodeHtmlEntities("")).toBe("");
  });

  it("decodes Polish text mangled by escaping", () => {
    expect(decodeHtmlEntities("u&#380;ytkownik napisa&#322;")).toBe(
      "użytkownik napisał",
    );
  });
});
