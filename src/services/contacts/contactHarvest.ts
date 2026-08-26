import { getDb } from "@/services/db/connection";
import { getSetting, setSetting } from "@/services/db/settings";

/**
 * Build the contact book from mail that has already been synced.
 *
 * Contacts were only ever recorded when the user sent something from Revelo,
 * so the recipient autocomplete knew almost nobody. Every synced message
 * already carries the addresses; this reads them out and, crucially, records
 * *which mailbox* each address was seen in, so suggestions can prefer the
 * account you are writing from.
 */

const HARVEST_WATERMARK = "contact_harvest_watermark";
/** Separator that cannot occur in an email address or an account UUID. */
const SEP = "\u0001";

/** Rows per pass — large enough to be quick, small enough not to block sync. */
const BATCH_SIZE = 2000;

interface HarvestRow {
  account_id: string;
  from_address: string | null;
  from_name: string | null;
  to_addresses: string | null;
  cc_addresses: string | null;
  date: number;
  rowid: number;
}

/** Addresses that are noise in a contact book. */
function isUsableAddress(address: string): boolean {
  if (!address.includes("@")) return false;
  if (address.length > 254) return false;
  const local = address.slice(0, address.indexOf("@")).toLowerCase();
  return !local.startsWith("noreply")
    && !local.startsWith("no-reply")
    && !local.startsWith("donotreply")
    && !local.startsWith("do-not-reply")
    && !local.startsWith("bounce")
    && !local.startsWith("mailer-daemon");
}

/** Pull bare addresses out of a header value like `A <a@x>, b@y`. */
export function parseAddressList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => {
      const angled = part.match(/<([^>]+)>/);
      return (angled ? angled[1]! : part).trim().toLowerCase();
    })
    .filter((address) => address.length > 0 && isUsableAddress(address));
}

interface Seen {
  count: number;
  sent: number;
  lastSeen: number;
  name: string | null;
}

/**
 * Harvest a batch of messages. Returns true when there may be more to do, so
 * the caller can keep going without holding the DB for one enormous statement.
 */
export async function harvestContactBatch(accountEmails: Set<string>): Promise<boolean> {
  const db = await getDb();
  const watermarkRaw = await getSetting(HARVEST_WATERMARK);
  const watermark = Number(watermarkRaw ?? 0) || 0;

  const rows = await db.select<HarvestRow[]>(
    `SELECT rowid, account_id, from_address, from_name, to_addresses, cc_addresses, date
     FROM messages
     WHERE rowid > $1
     ORDER BY rowid
     LIMIT $2`,
    [watermark, BATCH_SIZE],
  );
  if (rows.length === 0) return false;

  // (email, account) -> counters, merged in memory so each address costs one
  // upsert per batch rather than one per message
  const byPair = new Map<string, Seen>();
  const namesByEmail = new Map<string, string>();

  for (const row of rows) {
    const incoming = parseAddressList(row.from_address);
    // A display name is only trustworthy for the sender of that message
    if (incoming[0] && row.from_name && !namesByEmail.has(incoming[0])) {
      namesByEmail.set(incoming[0], row.from_name);
    }
    const outgoing = [
      ...parseAddressList(row.to_addresses),
      ...parseAddressList(row.cc_addresses),
    ];
    // A message the user sent tells us far more about who they write to than
    // one they received, so those are counted separately.
    const fromSelf = incoming.length > 0 && accountEmails.has(incoming[0]!);

    for (const address of [...incoming, ...outgoing]) {
      if (accountEmails.has(address)) continue; // the user is not their own contact
      const key = `${address}${SEP}${row.account_id}`;
      const entry = byPair.get(key) ?? { count: 0, sent: 0, lastSeen: 0, name: null };
      entry.count += 1;
      if (fromSelf && outgoing.includes(address)) entry.sent += 1;
      entry.lastSeen = Math.max(entry.lastSeen, row.date);
      byPair.set(key, entry);
    }
  }

  for (const [key, entry] of byPair) {
    const sep = key.indexOf(SEP);
    const email = key.slice(0, sep);
    const accountId = key.slice(sep + 1);
    try {
      await db.execute(
        `INSERT INTO contacts (id, email, display_name, frequency, last_contacted_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT(email) DO UPDATE SET
           frequency = frequency + $4,
           last_contacted_at = MAX(COALESCE(last_contacted_at, 0), $5),
           display_name = COALESCE(display_name, $3)`,
        [email, email, namesByEmail.get(email) ?? null, entry.count, entry.lastSeen],
      );
      await db.execute(
        `INSERT INTO contact_accounts (email, account_id, message_count, sent_count, last_seen_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT(email, account_id) DO UPDATE SET
           message_count = message_count + $3,
           sent_count = sent_count + $4,
           last_seen_at = MAX(COALESCE(last_seen_at, 0), $5)`,
        [email, accountId, entry.count, entry.sent, entry.lastSeen],
      );
    } catch (err) {
      console.warn("[contactHarvest] failed to record", email, err);
    }
  }

  const lastRowId = rows[rows.length - 1]!.rowid;
  await setSetting(HARVEST_WATERMARK, String(lastRowId));
  return rows.length === BATCH_SIZE;
}

/**
 * Work through everything not yet harvested. Safe to call repeatedly — the
 * watermark makes it resume rather than restart.
 */
export async function harvestContacts(accountEmails: string[]): Promise<void> {
  const emails = new Set(accountEmails.map((e) => e.toLowerCase()));
  try {
    let more = true;
    let passes = 0;
    // Bound the work per invocation so a first run on a large mailbox does not
    // monopolise the DB; the next call picks up where this one stopped.
    while (more && passes < 25) {
      more = await harvestContactBatch(emails);
      passes++;
    }
  } catch (err) {
    console.warn("[contactHarvest] harvest failed:", err);
  }
}
