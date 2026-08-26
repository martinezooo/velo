/**
 * Composite thread identity.
 *
 * Thread IDs are only unique *within* an account: the DB primary key is
 * (account_id, id), Gmail has its own ID space per mailbox, and IMAP thread IDs
 * are derived from the root Message-ID — so the very same message delivered to
 * two accounts produces an identical thread ID in both. The unified inbox puts
 * threads from several accounts into one list, so every client-side lookup
 * (store map, multi-select, routing) has to key on account + thread.
 */

/** Separator that cannot appear in an account UUID or a provider thread ID. */
const SEP = "\u0001";

export interface ThreadRef {
  accountId: string;
  threadId: string;
}

/** Build the composite key used wherever a thread is addressed client-side. */
export function makeThreadKey(accountId: string, threadId: string): string {
  return `${accountId}${SEP}${threadId}`;
}

/** Convenience wrapper for anything shaped like a thread. */
export function threadKeyOf(thread: { accountId: string; id: string }): string {
  return makeThreadKey(thread.accountId, thread.id);
}

/**
 * Split a composite key back into its parts. A bare thread ID (no separator)
 * parses to an empty accountId so callers can fall back to the active account.
 */
export function parseThreadKey(key: string): ThreadRef {
  const idx = key.indexOf(SEP);
  if (idx === -1) return { accountId: "", threadId: key };
  return { accountId: key.slice(0, idx), threadId: key.slice(idx + 1) };
}

/** Bare thread ID from a composite key. */
export function threadIdFromKey(key: string): string {
  return parseThreadKey(key).threadId;
}

/** Group composite keys by account, so bulk actions hit the right provider. */
export function groupKeysByAccount(
  keys: Iterable<string>,
  fallbackAccountId?: string | null,
): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const key of keys) {
    const parsed = parseThreadKey(key);
    const accountId = parsed.accountId || fallbackAccountId || "";
    if (!accountId) continue;
    const list = grouped.get(accountId);
    if (list) list.push(parsed.threadId);
    else grouped.set(accountId, [parsed.threadId]);
  }
  return grouped;
}
