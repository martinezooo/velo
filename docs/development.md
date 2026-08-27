# Development

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- Tauri v2 system dependencies ([see Tauri docs](https://v2.tauri.app/start/prerequisites/))

## Commands

```bash
# Start Tauri dev (frontend + backend)
npm run tauri dev

# Vite dev server only (no Tauri)
npm run dev

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run a specific test file
npx vitest run src/stores/uiStore.test.ts

# Type-check
npx tsc --noEmit

# Build for production
npm run tauri build

# Rust only (from src-tauri/)
cd src-tauri && cargo build
```

## Testing

- **Framework:** Vitest + jsdom
- **Setup:** `src/test/setup.ts` (imports `@testing-library/jest-dom/vitest`)
- **Config:** `globals: true` -- no imports needed for `describe`, `it`, `expect`
- **Location:** Tests are colocated with source files (e.g., `uiStore.test.ts` next to `uiStore.ts`)
- **Count:** 134 test files across stores (8), services (72), utils (15), components (32), constants (3), router (1), hooks (2), and config (1)

### Zustand test pattern

```ts
beforeEach(() => {
  useStore.setState(initialState);
});

it('does something', () => {
  useStore.getState().someAction();
  expect(useStore.getState().value).toBe(expected);
});
```

## Building

```bash
# Build for your current platform
npm run tauri build
```

Produces native installers:
- **Windows** -- `.msi` / `.exe`
- **macOS** -- `.dmg` / `.app`
- **Linux** -- `.deb` / `.AppImage`

## Email Account Setup

### Gmail (OAuth)

Revelo connects directly to Gmail via OAuth. You need your own Google Cloud credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Gmail API** and **Google Calendar API**
4. Create OAuth 2.0 credentials (Desktop application)
5. In Revelo's Settings, enter your Client ID

> Revelo uses PKCE flow -- no client secret is required.

### IMAP/SMTP

For non-Gmail providers (Outlook, Yahoo, iCloud, Fastmail, etc.):

1. Click the account switcher in the sidebar → **Add IMAP Account**
2. Enter your email address and password (or app-password)
3. Revelo auto-discovers server settings for well-known providers
4. For other providers, enter IMAP/SMTP host, port, and security manually
5. Test connection, then save

> No Google Cloud project or Client ID needed. Passwords are encrypted with AES-256-GCM in the local database. Some providers (e.g., Gmail, Yahoo) require an app-specific password instead of your main password.

## AI Setup (Optional)

To enable AI features, add your API key for one or more providers in Settings:

- **Anthropic Claude** -- [Get API key](https://console.anthropic.com/) -- Haiku 4.5 (default), Sonnet 4, Opus 4
- **OpenAI** -- [Get API key](https://platform.openai.com/) -- GPT-4o Mini (default), GPT-4o, GPT-4.1 series
- **Google Gemini** -- [Get API key](https://aistudio.google.com/) -- 2.5 Flash (default), 2.5 Pro

After adding an API key, select which model to use for each provider in Settings > AI.

## Checking what actually gets sent

Unit tests cover the message builder, but they cannot tell you what survives a
real trip through a provider. For that there is a catch-all lab mailbox:
anything addressed to `<anything>@m.x.3mb.be` lands in Mailpit, whose API
returns the full RFC822 source.

```bash
set -a; . ~/.config/bugbounty/mailpit.env; set +a
curl -s -u "$MAILPIT_USERNAME:$MAILPIT_PASSWORD" "$MAILPIT_URL/api/v1/messages?limit=5"
curl -s -u "$MAILPIT_USERNAME:$MAILPIT_PASSWORD" "$MAILPIT_URL/api/v1/message/<ID>/raw"
```

Send a reply from the app to `revelo-test@m.x.3mb.be`, then read `/raw` to check
`In-Reply-To`, `References`, recipient lists, RFC 2047 header encoding and the
MIME structure.

Two things to know before trusting a green result:

- The lab does **not** verify SPF, DKIM or DMARC — nothing is rejected on the
  way in. Delivery there proves the message arrived and shows its shape; it says
  nothing about whether it authenticated. For that, send a copy to an ordinary
  Gmail address and read its `Authentication-Results` header.
- The lab cannot send outbound, by design. Seed a thread from somewhere else and
  reply *to* the lab rather than expecting mail to originate there.
