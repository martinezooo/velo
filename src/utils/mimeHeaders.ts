/**
 * Header encoding for outgoing mail.
 *
 * RFC 5322 headers are ASCII. A Polish subject or an accented filename written
 * straight into a header is malformed, and what a receiving server does with it
 * is anybody's guess — Gmail is forgiving, strict relays are not. Non-ASCII is
 * therefore encoded, and anything already ASCII is left exactly as it was.
 */

/**
 * Remove anything that could end the current header and begin another.
 *
 * A CR or LF in a header value is a header-injection primitive: a subject of
 * "Hi\r\nBcc: attacker@example.com" adds a real Bcc, silently copying the
 * message. Values reach here from mail the user did not write — a reply takes
 * its subject from the incoming message — so this cannot be left to callers.
 */
export function stripHeaderBreaks(value: string): string {
  // Fold whitespace is legal *inside* a header, but only the encoder may add
  // it; incoming values are flattened to spaces.
  return value.replace(/[\r\n\u2028\u2029\u0000]+/g, " ").trim();
}

/** True when the value can go into a header untouched. */
function isAscii(value: string): boolean {
  // eslint-disable-next-line no-control-regex
  return !/[^\x00-\x7F]/.test(value);
}

function base64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/**
 * RFC 2047 encoded-word. An encoded word may not exceed 75 characters, so long
 * values are split — on character boundaries, since a word cut mid-sequence
 * decodes to mojibake.
 */
export function encodeHeaderValue(value: string): string {
  const safe = stripHeaderBreaks(value ?? "");
  if (!safe) return "";
  if (isAscii(safe)) return safe;

  const prefix = "=?UTF-8?B?";
  const suffix = "?=";
  // Budget for the base64 payload, converted back to the bytes it can hold
  const maxPayload = 75 - prefix.length - suffix.length;
  const maxBytes = Math.floor(maxPayload / 4) * 3;

  const words: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of safe) {
    const size = new TextEncoder().encode(char).length;
    if (currentBytes + size > maxBytes) {
      words.push(`${prefix}${base64Utf8(current)}${suffix}`);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += size;
  }
  if (current) words.push(`${prefix}${base64Utf8(current)}${suffix}`);

  // Folded with CRLF + space, which is how a decoder knows to join them
  return words.join("\r\n ");
}

/**
 * Encode the display name of an address, leaving the address itself alone —
 * `<user@host>` must stay literal for the message to be deliverable.
 */
export function encodeAddressHeader(rawValue: string): string {
  const value = stripHeaderBreaks(rawValue ?? "");
  const match = value.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (!match) return value;

  const rawName = match[1]!.trim().replace(/^"(.*)"$/, "$1");
  const address = match[2]!.trim();
  if (!rawName) return `<${address}>`;
  if (isAscii(rawName)) {
    // Quote names carrying characters that would otherwise end the phrase
    return /[",:;<>@\\[\]]/.test(rawName)
      ? `"${rawName.replace(/(["\\])/g, "\\$1")}" <${address}>`
      : `${rawName} <${address}>`;
  }
  return `${encodeHeaderValue(rawName)} <${address}>`;
}

/** Encode a whole recipient list, entry by entry. */
export function encodeAddressList(values: string[]): string {
  return values.map(encodeAddressHeader).join(", ");
}

/**
 * Parameters naming an attachment.
 *
 * `name=` takes an encoded word, which every mail client in practice
 * understands; `filename*=` uses RFC 2231, which is the standards-track way
 * and what modern clients prefer. Emitting both covers old and new.
 */
export function encodeFilenameParams(filename: string): {
  nameParam: string;
  dispositionParam: string;
} {
  const safe = stripHeaderBreaks(filename).replace(/["\\]/g, "_");
  if (isAscii(safe)) {
    return {
      nameParam: `name="${safe}"`,
      dispositionParam: `filename="${safe}"`,
    };
  }
  const encoded = encodeURIComponent(safe).replace(/'/g, "%27");
  return {
    nameParam: `name="${encodeHeaderValue(safe)}"`,
    dispositionParam: `filename*=UTF-8''${encoded}`,
  };
}

/**
 * The bare address from a `Name <addr>` value, for places that need the
 * address alone — a Message-ID domain, for instance, where taking everything
 * after the "@" would otherwise capture the closing bracket.
 */
export function addressOnly(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match ? match[1]! : value).trim();
}
