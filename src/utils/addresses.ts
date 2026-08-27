/**
 * Address-header helpers.
 *
 * Recipient headers arrive as `Name <addr@host>`, sometimes with the display
 * name quoted, sometimes bare. Comparing those strings directly is how a
 * reply-all ends up addressed back to the sender: the account knows its own
 * address as `me@host`, the header says `Me <me@host>`, and an exact match
 * never fires.
 */

/** The bare address inside a header value, lowercased. */
export function extractAddress(value: string): string {
  const angled = value.match(/<([^>]+)>/);
  return (angled ? angled[1]! : value).trim().toLowerCase();
}

/** Split a recipient header into its entries, preserving display names. */
export function splitAddressList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * Drop the reader's own addresses from a recipient list, comparing on the
 * address only so display names cannot defeat the match.
 */
export function withoutOwnAddresses(
  entries: string[],
  ownAddresses: (string | null | undefined)[],
): string[] {
  const own = new Set(
    ownAddresses
      .filter((a): a is string => !!a)
      .map((a) => extractAddress(a)),
  );
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const address = extractAddress(entry);
    if (!address || own.has(address) || seen.has(address)) return false;
    seen.add(address);
    return true;
  });
}

/**
 * `References` for a reply: the parent's chain plus the parent itself, which
 * is what lets a standards-compliant client thread the conversation.
 * Returns null when the parent carried no Message-ID, since a fabricated one
 * threads worse than none.
 */
export function buildReferences(
  parentMessageId: string | null | undefined,
  parentReferences: string | null | undefined,
): string | null {
  if (!parentMessageId) return null;
  const chain = (parentReferences ?? "").trim();
  return chain ? `${chain} ${parentMessageId}` : parentMessageId;
}
