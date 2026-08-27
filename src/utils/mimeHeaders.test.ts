import { describe, it, expect } from "vitest";
import {
  encodeHeaderValue,
  encodeAddressHeader,
  encodeAddressList,
  encodeFilenameParams,
  addressOnly,
} from "./mimeHeaders";

/** Decode an RFC 2047 encoded-word run back to text. */
function decodeWords(value: string): string {
  return value
    .split(/\r\n /)
    .map((word) => {
      const m = word.match(/^=\?UTF-8\?B\?(.*)\?=$/);
      return m ? Buffer.from(m[1]!, "base64").toString("utf8") : word;
    })
    .join("");
}

describe("encodeHeaderValue", () => {
  it("leaves ASCII untouched", () => {
    expect(encodeHeaderValue("Order confirmation")).toBe("Order confirmation");
    expect(encodeHeaderValue("")).toBe("");
  });

  it("encodes a Polish subject so it survives a strict relay", () => {
    const encoded = encodeHeaderValue("Potwierdzenie zamówienia — ważne");
    expect(encoded).toMatch(/^=\?UTF-8\?B\?/);
    expect(decodeWords(encoded)).toBe("Potwierdzenie zamówienia — ważne");
  });

  it("keeps every encoded word within the 75-character limit", () => {
    const long = "zażółć gęślą jaźń ".repeat(12).trim();
    const encoded = encodeHeaderValue(long);
    for (const word of encoded.split(/\r\n /)) {
      expect(word.length).toBeLessThanOrEqual(75);
    }
    // Surrounding whitespace is not meaningful in a header and is trimmed
    expect(decodeWords(encoded)).toBe(long);
  });

  it("never splits a character across two words", () => {
    // A cut inside a multi-byte sequence decodes to mojibake
    const emoji = "🚀".repeat(40);
    expect(decodeWords(encodeHeaderValue(emoji))).toBe(emoji);
  });
});

describe("encodeAddressHeader", () => {
  it("encodes the display name and leaves the address literal", () => {
    const encoded = encodeAddressHeader("Zażółć Gęślą <a@x.pl>");
    expect(encoded).toContain("<a@x.pl>");
    expect(decodeWords(encoded.replace(" <a@x.pl>", ""))).toBe("Zażółć Gęślą");
  });

  it("passes a plain ASCII name through", () => {
    expect(encodeAddressHeader("Marcin Bortkiewicz <m@x.pl>")).toBe(
      "Marcin Bortkiewicz <m@x.pl>",
    );
  });

  it("quotes a name containing characters that would end the phrase", () => {
    expect(encodeAddressHeader("Smith, John <j@x.pl>")).toBe('"Smith, John" <j@x.pl>');
  });

  it("handles a bare address", () => {
    expect(encodeAddressHeader("m@x.pl")).toBe("m@x.pl");
  });

  it("drops an empty display name rather than emitting a stray quote", () => {
    expect(encodeAddressHeader('"" <m@x.pl>')).toBe("<m@x.pl>");
  });

  it("encodes each entry of a list", () => {
    const encoded = encodeAddressList(["Ann <a@x.pl>", "Zażółć <z@x.pl>"]);
    expect(encoded.startsWith("Ann <a@x.pl>, ")).toBe(true);
    expect(encoded).toContain("<z@x.pl>");
  });
});

describe("encodeFilenameParams", () => {
  it("leaves an ASCII filename alone", () => {
    const { nameParam, dispositionParam } = encodeFilenameParams("contract.pdf");
    expect(nameParam).toBe('name="contract.pdf"');
    expect(dispositionParam).toBe('filename="contract.pdf"');
  });

  it("encodes an accented filename both ways", () => {
    const { nameParam, dispositionParam } = encodeFilenameParams("Umowa ąę.pdf");
    // Old clients read name=, modern ones prefer RFC 2231 filename*
    expect(nameParam).toContain("=?UTF-8?B?");
    expect(dispositionParam).toBe("filename*=UTF-8''Umowa%20%C4%85%C4%99.pdf");
  });

  it("neutralises quotes and newlines that would break the header", () => {
    const { dispositionParam } = encodeFilenameParams('a"b\r\nc.pdf');
    expect(dispositionParam).not.toContain('"b');
    expect(dispositionParam).not.toContain("\n");
  });
});

describe("addressOnly", () => {
  it("takes the address out of a display-name value", () => {
    // Splitting on "@" without this produced a Message-ID ending in ">>"
    expect(addressOnly("Marcin Bortkiewicz <m@x.pl>")).toBe("m@x.pl");
  });

  it("passes a bare address through", () => {
    expect(addressOnly("m@x.pl")).toBe("m@x.pl");
  });
});
