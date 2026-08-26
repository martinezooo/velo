/**
 * Where a sender's picture can come from.
 *
 * Gravatar covers individuals who registered one, which in practice is almost
 * nobody: across a sample of this mailbox's most recent senders, none had one.
 * Most mail comes from organisations, and those are recognisable by their
 * domain icon — the same sample resolved 13 of 20 that way.
 */

/**
 * Consumer mail providers. Their domain icon is the provider's own logo, which
 * would label every individual with the same picture — worse than an initial,
 * because it looks like information while carrying none.
 */
const CONSUMER_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.co.uk",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.de",
  "zoho.com",
  "fastmail.com",
  "wp.pl",
  "o2.pl",
  "interia.pl",
  "onet.pl",
  "op.pl",
]);

export function domainOf(address: string | null): string | null {
  if (!address) return null;
  const at = address.lastIndexOf("@");
  if (at === -1 || at === address.length - 1) return null;
  return address.slice(at + 1).trim().toLowerCase();
}

/** True when a domain icon would identify the sender rather than their provider. */
export function domainIconIsMeaningful(address: string | null): boolean {
  const domain = domainOf(address);
  if (!domain || !domain.includes(".")) return false;
  return !CONSUMER_MAIL_DOMAINS.has(domain);
}

/**
 * Icon URL for the sender's organisation.
 *
 * Resolved through a single icon service rather than by fetching each sender's
 * own site: contacting the sender's server on message display is precisely the
 * tracking-pixel behaviour this app blocks by default.
 */
export function getSenderDomainIconUrl(address: string | null): string | null {
  if (!domainIconIsMeaningful(address)) return null;
  const domain = domainOf(address);
  return domain ? `https://icons.duckduckgo.com/ip3/${domain}.ico` : null;
}
