# Changelog

All notable changes to Revelo are documented here. This project follows
[Semantic Versioning](https://semver.org/).

Revelo is a fork of [Velo](https://github.com/avihaymenahem/velo) 0.4.21
(`ec47a7a`). Everything below is what this fork changed.

## [Unreleased]

### Added
- Summary language, in Settings › AI. Summaries are read by one person and can
  sit in their own language whatever the mail is written in; replies always
  follow the language of the message being answered.

### Changed
- Thread summaries are built from the newest message backwards and updated
  incrementally as mail arrives, instead of being rewritten from the whole
  thread each time.

### Fixed
- Reply All addressed the reply back to you. The code tried to drop your own
  address, but compared `you@host` against the header's `You <you@host>`, so the
  exact match never fired and you stayed on the To line.
- Replies carried `In-Reply-To: <Gmail's internal id>` and no `References` at
  all. Neither means anything outside Gmail, so replies did not thread in
  Outlook, Thunderbird or Apple Mail. The Gmail sync now stores the real
  `Message-ID` and `References` headers — it had columns for them and never
  filled them in — and replies use those, omitting the header entirely when the
  parent has none rather than inventing one.
- Every reply path had the same two defects, not just the inline one: the
  composer used by the context menu, smart replies and the pop-out window also
  sent the provider's internal id as `In-Reply-To` and no display name.
- Replying to a reply produced "Re: Re: …". Ten call sites prefixed the subject
  without checking for one, and none recognised localised prefixes such as
  `Odp:` or `AW:`.
- Sent mail had no display name in `From`, and its text parts declared no
  `Content-Transfer-Encoding`, so a body with accented characters was labelled
  7-bit.
- "Generating draft…" could spin forever. Nothing bounded a model call, and the
  auto-draft check sent a real completion to the provider every time a reply
  box opened, just to ask whether AI was configured.
- Long threads were summarised from their oldest messages: the thread text was
  truncated front-to-back, so the end — where a thread actually stands — was
  the first thing dropped.

## [0.5.0] - 2026-08-27

### Added
- **All inboxes.** Mail from every account in one list, newest first, with the
  owning mailbox shown on each row. The picker sits on the Inbox row and says
  how many mailboxes are in scope. The choice survives restarts, and search
  covers every account while it is active.
- **Message brightness**, in the title bar: bright, dimmed (the sender's own
  colours with the glare taken out) or dark (inverted, with photos and logos
  inverted back). HTML mail is authored on white, which is what makes it glare.
- **Sender avatars.** A Gravatar where the sender has one, otherwise their
  organisation's icon, otherwise initials on a colour derived from the address.
  Consumer mail domains are skipped, since a gmail.com icon would label every
  individual identically. Can be turned off in Settings, which then draws
  initials only and sends no request.
- **A contact book built from real mail.** Addresses are read out of synced
  messages rather than only recorded when you write to someone, skipping
  noreply-style senders. Each is stored with the mailbox it was seen in.
- **Cross-mailbox recipient warning.** Recipient suggestions rank addresses
  known in the sending account first. The rest are marked as coming from
  another mailbox and ask before being added.
- **Mailbox usage** — size, message and conversation counts per account, plus
  cached attachment size — behind a toggle in Settings › Accounts.
- Title bar carries the brand, a last-sync line that runs a manual sync when
  clicked, an AI status light, the brightness switch, and the version, which
  checks for updates on click.
- Splash screen shows the tagline and the version.

### Changed
- Renamed to Revelo, with a new icon and a green "Sage" default theme. The
  bundle identifier stays `com.velomail.app`, so an existing Velo install's
  database and settings carry over untouched.
- Signatures, templates, filters, labels, smart labels, smart folders, quick
  steps and subscriptions all name the mailbox they belong to, and can be
  retargeted without changing the mail you are reading.
- The reading pane is not rendered at all when nothing is open, so the list
  takes the full width instead of showing a placeholder.
- AI work is visible: a floating indicator reports what is running and what
  failed, with the reason and a link to Settings.

### Fixed
- Network calls could hang forever. Nothing had a deadline, and
  `navigator.onLine` cannot see a captive portal or a network with no route
  out, so a request opened a socket that never settled and the sync bar sat at
  "Syncing…" indefinitely. Every Gmail API and OAuth call is now bounded.
- The Gemini model IDs shipped upstream were dated preview aliases, which
  Google retires once a model goes stable, so requests returned 404. Three
  layers turned that into a bare "Connection error": `testConnection()`
  swallowed the reason, anything that was not 401 or 429 became a generic
  network error, and the SDK's own wording for the failure was "Connection
  error." Only stable IDs ship now, a stored withdrawn ID is rewritten at
  startup, and failures say which they are.
- Message previews showed raw HTML entities (`it&#39;s`, `&lt;address&gt;`).
  Gmail returns `snippet` escaped and it is stored that way; it is decoded when
  a database row becomes a thread, which fixes existing rows without a
  migration.
- The contact sidebar overlapped the thread below its breakpoint. It becomes an
  absolute overlay there, but its background is translucent — meant to sit over
  the window backdrop, not over content — so thread text showed through.
- A failed thread summary left an empty card, and because the auto-load guard
  was "result is still null", the failure re-triggered on every render.
- Selecting a thread could act on a different account's. Thread IDs are unique
  only within an account: the primary key is `(account_id, id)`, and IMAP
  thread IDs hash the root `Message-ID`, so one message delivered to two
  accounts produces the same ID in both. Every client-side lookup now keys on
  account and thread together.
