import { getDb } from "@/services/db/connection";
import { getGmailClient } from "./tokenManager";

/**
 * Fill in threading headers for mail synced before they were captured.
 *
 * `Message-ID` and `References` are what let a reply thread in any client that
 * is not Gmail, and the sync used to drop them. Rather than re-fetching every
 * message, this runs on the thread you are actually looking at: a reply needs
 * the header of the message it answers, and nothing else.
 */

interface MissingRow {
  id: string;
}

/** Ask Gmail for headers only — far cheaper than a full message fetch. */
interface MetadataResponse {
  payload?: { headers?: { name: string; value: string }[] };
}

function header(res: MetadataResponse, name: string): string | null {
  const found = res.payload?.headers?.find(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  );
  return found?.value ?? null;
}

/**
 * Backfill the messages of one thread. Returns how many rows were updated.
 * Silent on failure: this improves a reply that is about to be written, and
 * must never block reading the thread.
 */
export async function backfillThreadHeaders(
  accountId: string,
  threadId: string,
): Promise<number> {
  try {
    const db = await getDb();
    const missing = await db.select<MissingRow[]>(
      `SELECT id FROM messages
       WHERE account_id = $1 AND thread_id = $2
         AND (message_id_header IS NULL OR message_id_header = '')`,
      [accountId, threadId],
    );
    if (missing.length === 0) return 0;

    const client = await getGmailClient(accountId);
    let updated = 0;

    for (const row of missing) {
      try {
        const res = await client.request<MetadataResponse>(
          `/messages/${row.id}?format=metadata`
          + "&metadataHeaders=Message-ID&metadataHeaders=References&metadataHeaders=In-Reply-To",
        );
        const messageId = header(res, "Message-ID");
        if (!messageId) continue;

        await db.execute(
          `UPDATE messages
           SET message_id_header = $1, references_header = $2, in_reply_to_header = $3
           WHERE account_id = $4 AND id = $5`,
          [
            messageId,
            header(res, "References"),
            header(res, "In-Reply-To"),
            accountId,
            row.id,
          ],
        );
        updated++;
      } catch {
        // One unreachable message must not abort the rest
      }
    }
    return updated;
  } catch {
    return 0;
  }
}
