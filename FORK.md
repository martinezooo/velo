# Revelo — what this fork changes

Revelo is a fork of [avihaymenahem/velo](https://github.com/avihaymenahem/velo),
an Apache-2.0 desktop email client. This file is the record of modifications
required by the licence, and the short answer to "why not just run Velo?".

Upstream at the time of forking: `ec47a7a`, version 0.4.21.
This fork: version 0.5.0, 16 commits, 189 files, +4370 / −1023.

---

## The headline: one list for every mailbox

Velo shows one account at a time. Revelo adds **All inboxes**: every account's
mail merged into a single list, newest first, with the owning mailbox shown on
each row.

The picker sits on the Inbox row and says how many mailboxes are in scope
(`4/4`). Picking a single account narrows the list; picking All inboxes widens
it. The choice survives restarts.

**Why this needed more than a query change.** Thread IDs are only unique *within*
an account — the database primary key is `(account_id, id)`, and IMAP thread IDs
are a hash of the root `Message-ID`, so one message delivered to two accounts
produces the *identical* thread ID in both. Every client-side lookup therefore
had to move to a composite account+thread key: the store map, multi-select, drag
payloads, context-menu targets, and routing (`?acct=`). Without that, selecting
one thread could act on another account's.

Every action resolves the account from the thread, not from the sidebar
selection, so a selection spanning mailboxes archives, labels and moves through
the right provider client.

---

## Settings now say which mailbox they belong to

Signatures, templates, filters, labels, smart labels, smart folders, quick steps
and subscriptions are all stored per account. Upstream every editor read the
active account silently, so with several accounts there was no way to tell which
address a signature was being written for. Each of those sections now carries a
mailbox picker; nothing else in Settings does, because nothing else is
account-scoped.

The picker uses its own selection rather than the active account, so choosing a
mailbox to configure does not move the inbox you were reading.

---

## Bugs fixed

**Network calls could hang forever.** No outbound request had a deadline, and
`navigator.onLine` cannot see a captive portal or a network with no route out,
so `fetch` opened a socket that never settled and the sync bar sat at
"Syncing…" indefinitely. All Gmail API and OAuth calls now go through a bounded
`fetchWithTimeout`.

**Withdrawn AI models reported as "Connection error".** The shipped Gemini model
IDs were dated preview aliases, which Google retires once a model goes stable;
requests 404'd. Three layers hid it: `testConnection()` was `catch { return
false }`, anything not 401/429 became a generic network error, and the SDK's own
wording for the failure was "Connection error." Only stable IDs ship now, a
stored withdrawn ID is rewritten at startup, and failures are described as what
they are — withdrawn model, rejected key, missing permission, quota, timeout.

**HTML entities showed raw in previews.** Gmail returns `snippet` HTML-escaped
and it is stored that way, so lists read `it&#39;s` and `&lt;address&gt;`.
Decoded at the point a database row becomes a thread, which fixes existing rows
without a migration.

**The contact sidebar overlapped the thread.** Below its container breakpoint it
becomes an absolute overlay, but its background token is translucent — designed
to sit over the window backdrop, not over content — so thread text showed
through. The overlay now paints an opaque surface.

**The message-brightness setting did nothing.** The iframe effect's dependencies
omitted it, so the choice was stored and the document was never rewritten.

---

## Reading and identity

- **Message brightness**, in the title bar: bright, dimmed (sender's colours,
  glare removed) or dark (inverted, with photos re-inverted). HTML mail is
  authored on white; upstream had no way to soften it.
- **Sender avatars.** Gravatar alone was near-useless — 0 of the 20 most recent
  senders here had one, because this mail comes from organisations. Order is now
  Google contact photo → Gravatar → organisation icon → initials, with consumer
  mail domains excluded so a `gmail.com` icon does not label every individual
  identically. Google photos need the `contacts.readonly` scopes, and Settings
  asks for re-authorisation rather than failing silently.
- **A real contact book.** Contacts previously existed only for addresses
  written to from the app. A watermarked harvest reads them out of synced mail
  instead — 678 on first run here — recording *which mailbox* each was seen in.
- **Cross-mailbox recipient warning.** Suggestions rank addresses known in the
  sending account first; the rest are marked "other mailbox" and ask before
  being added, because writing to a client from a personal account is exactly
  the mistake a suggestion list invites.

## Visible state

- Title bar carries the brand, a clickable **last-sync** line that triggers a
  manual sync, an **AI status light** (off / ready / working / failed), the
  brightness switch, and the **version**, which checks for updates on click.
- AI work is visible: a floating indicator reports in-flight and failed states
  with a reason and a Reconfigure link. Upstream, a failed summary left an empty
  card — and because the auto-load guard was "result is still null", a failure
  re-triggered it on every render.
- Splash screen shows the tagline and version.
- **Mailbox usage** — size, message and conversation counts per account — can be
  turned on in Settings › Accounts.
- The reading pane is not rendered at all when no thread is open, so the list
  takes the full width instead of showing a placeholder.

## Identity

Renamed to Revelo throughout, with a new icon (rounded envelope on a green
gradient, `assets/icon.svg` as the source for every platform size) and a new
default "Sage" colour theme. The bundle identifier deliberately stays
`com.velomail.app`, so an existing Velo installation's mailbox database and
settings carry over untouched.

---

## Build

```bash
npm install
npm run tauri build -- --bundles app
```

Tests: `npx vitest run` — 1636 passing.

## Licence and attribution

Apache-2.0, inherited from upstream. `LICENSE` is unchanged; this file records
the modifications, as §4(b) requires. Original work by
[Avihay Menahem](https://github.com/avihaymenahem).
