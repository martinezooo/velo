import { getGmailClient } from "@/services/gmail/tokenManager";
import { updateContactAvatar, getContactByEmail } from "@/services/db/contacts";
import { getSetting, setSetting } from "@/services/db/settings";

/**
 * Pull contact photos from Google.
 *
 * These are the pictures Gmail itself shows, and the only source that has a
 * real face for the people in the user's address book — Gravatar covers almost
 * none of them, and a domain icon identifies an organisation, not a person.
 *
 * Two collections matter:
 * - `people/me/connections` — saved contacts
 * - `otherContacts` — addresses Google collected from mail, which is where
 *   most correspondents actually live
 *
 * Only people with a real photo are recorded. Google returns a generic
 * silhouette flagged `default: true` for everyone else; storing those would
 * give every contact the same picture, which reads as information but is not.
 */

interface GooglePhoto {
  url?: string;
  default?: boolean;
}

interface GooglePerson {
  emailAddresses?: { value?: string }[];
  photos?: GooglePhoto[];
  names?: { displayName?: string }[];
}

interface PeopleResponse {
  connections?: GooglePerson[];
  otherContacts?: GooglePerson[];
  nextPageToken?: string;
}

const LAST_RUN_SETTING = "google_contacts_synced_at";
/** Photos change rarely; a day between passes is plenty. */
const MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 200;
/** Bound on pages per collection, so a huge address book cannot spin. */
const MAX_PAGES = 10;

/** A usable photo URL, or null when Google only offered its placeholder. */
export function realPhotoUrl(person: GooglePerson): string | null {
  const photo = person.photos?.find((p) => p.url && p.default !== true);
  return photo?.url ?? null;
}

/** Lowercased addresses attached to a person. */
export function personEmails(person: GooglePerson): string[] {
  return (person.emailAddresses ?? [])
    .map((e) => e.value?.trim().toLowerCase())
    .filter((v): v is string => !!v && v.includes("@"));
}

async function storePeople(people: GooglePerson[]): Promise<number> {
  let stored = 0;
  for (const person of people) {
    const url = realPhotoUrl(person);
    if (!url) continue;
    for (const email of personEmails(person)) {
      try {
        // Only annotate contacts already known locally; the harvest decides
        // who belongs in the book, this only supplies pictures.
        const existing = await getContactByEmail(email);
        if (!existing) continue;
        if (existing.avatar_url === url) continue;
        await updateContactAvatar(email, url);
        stored++;
      } catch {
        // One bad row must not abort the pass
      }
    }
  }
  return stored;
}

async function fetchCollection(
  accountId: string,
  build: (pageToken: string | null) => string,
  pick: (res: PeopleResponse) => GooglePerson[] | undefined,
): Promise<number> {
  const client = await getGmailClient(accountId);
  let pageToken: string | null = null;
  let pages = 0;
  let stored = 0;

  do {
    const res: PeopleResponse = await client.request<PeopleResponse>(build(pageToken));
    stored += await storePeople(pick(res) ?? []);
    pageToken = res.nextPageToken ?? null;
    pages++;
  } while (pageToken && pages < MAX_PAGES);

  return stored;
}

/**
 * Refresh photos for one Google account. Skipped unless the interval has
 * elapsed, or `force` is set (used right after re-authorising).
 */
export async function syncGoogleContactPhotos(
  accountId: string,
  force = false,
): Promise<number> {
  if (!force) {
    const last = Number((await getSetting(LAST_RUN_SETTING)) ?? 0) || 0;
    if (Date.now() - last < MIN_INTERVAL_MS) return 0;
  }

  let stored = 0;
  try {
    stored += await fetchCollection(
      accountId,
      (token) =>
        `https://people.googleapis.com/v1/people/me/connections`
        + `?personFields=names,emailAddresses,photos&pageSize=${PAGE_SIZE}`
        + (token ? `&pageToken=${encodeURIComponent(token)}` : ""),
      (res) => res.connections,
    );
  } catch (err) {
    console.warn("[googleContacts] connections unavailable:", err);
  }

  try {
    stored += await fetchCollection(
      accountId,
      (token) =>
        `https://people.googleapis.com/v1/otherContacts`
        + `?readMask=names,emailAddresses,photos&pageSize=${PAGE_SIZE}`
        + (token ? `&pageToken=${encodeURIComponent(token)}` : ""),
      (res) => res.otherContacts,
    );
  } catch (err) {
    console.warn("[googleContacts] otherContacts unavailable:", err);
  }

  await setSetting(LAST_RUN_SETTING, String(Date.now()));
  if (stored > 0) {
    console.info(`[googleContacts] stored ${stored} contact photos`);
    window.dispatchEvent(new Event("velo-contact-photos-updated"));
  }
  return stored;
}
