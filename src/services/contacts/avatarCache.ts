import { getDb } from "@/services/db/connection";

/**
 * Stored contact photos, held in memory for the thread list.
 *
 * A row renders synchronously and there can be hundreds on screen, so the list
 * cannot afford a query per sender. The whole set of contacts that actually
 * have a picture is small — hundreds of rows at most — so it is loaded once
 * and refreshed when the photo sync reports new ones.
 */
let cache = new Map<string, string>();
let loaded = false;

export async function loadAvatarCache(): Promise<void> {
  try {
    const db = await getDb();
    const rows = await db.select<{ email: string; avatar_url: string }[]>(
      "SELECT email, avatar_url FROM contacts WHERE avatar_url IS NOT NULL",
    );
    cache = new Map(rows.map((r) => [r.email.toLowerCase(), r.avatar_url]));
    loaded = true;
  } catch (err) {
    console.warn("[avatarCache] failed to load:", err);
  }
}

/** Photo for an address, or null. Synchronous by design — see above. */
export function getCachedAvatar(address: string | null): string | null {
  if (!address || !loaded) return null;
  return cache.get(address.trim().toLowerCase()) ?? null;
}

/** Test seam and manual refresh. */
export function primeAvatarCache(entries: Iterable<[string, string]>): void {
  cache = new Map([...entries].map(([email, url]) => [email.toLowerCase(), url]));
  loaded = true;
}

export function clearAvatarCache(): void {
  cache = new Map();
  loaded = false;
}
