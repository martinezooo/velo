export interface MailtoFields {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
}

/**
 * A mailto: link is attacker-supplied: anyone can put one on a page or in a
 * message, and the OS hands it straight to this app. A CR or LF inside a field
 * is never legitimate here, and downstream it is a header-injection primitive,
 * so it is removed on the way in as well as on the way out.
 */
function clean(value: string): string {
  return value.replace(/[\r\n\u2028\u2029\u0000]+/g, " ").trim();
}

export function parseMailtoUrl(url: string): MailtoFields {
  const result: MailtoFields = {
    to: [],
    cc: [],
    bcc: [],
    subject: "",
    body: "",
  };

  if (!url.startsWith("mailto:")) {
    return result;
  }

  // Remove the "mailto:" prefix
  const rest = url.slice(7);

  // Split on the first "?" to get address part and query part
  const qIndex = rest.indexOf("?");
  const addressPart = qIndex >= 0 ? rest.slice(0, qIndex) : rest;
  const queryPart = qIndex >= 0 ? rest.slice(qIndex + 1) : "";

  // Parse the "to" addresses from the address part
  if (addressPart) {
    result.to = decodeURIComponent(addressPart)
      .split(",")
      .map((a) => clean(a))
      .filter(Boolean);
  }

  // Parse query parameters
  if (queryPart) {
    const params = new URLSearchParams(queryPart);

    const toParam = params.get("to");
    if (toParam) {
      const extraTo = toParam
        .split(",")
        .map((a) => clean(a))
        .filter(Boolean);
      result.to = [...result.to, ...extraTo];
    }

    const cc = params.get("cc");
    if (cc) {
      result.cc = cc
        .split(",")
        .map((a) => clean(a))
        .filter(Boolean);
    }

    const bcc = params.get("bcc");
    if (bcc) {
      result.bcc = bcc
        .split(",")
        .map((a) => clean(a))
        .filter(Boolean);
    }

    const subject = params.get("subject");
    if (subject) {
      result.subject = clean(subject);
    }

    // The body is not a header, so its line breaks are meaningful and kept
    const body = params.get("body");
    if (body) {
      result.body = body;
    }
  }

  return result;
}
