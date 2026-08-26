import { describe, it, expect } from "vitest";
import { formatSyncAge } from "./LastSyncLine";

const NOW = 1_700_000_000_000;
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatSyncAge", () => {
  it("calls anything under a minute 'just now'", () => {
    expect(formatSyncAge(NOW, NOW)).toBe("just now");
    expect(formatSyncAge(NOW - 59 * SECOND, NOW)).toBe("just now");
  });

  it("switches to minutes at the minute boundary", () => {
    expect(formatSyncAge(NOW - MINUTE, NOW)).toBe("1 min ago");
    expect(formatSyncAge(NOW - 45 * MINUTE, NOW)).toBe("45 min ago");
  });

  it("switches to hours at the hour boundary, singular at one", () => {
    expect(formatSyncAge(NOW - HOUR, NOW)).toBe("1 hour ago");
    expect(formatSyncAge(NOW - 5 * HOUR, NOW)).toBe("5 hours ago");
    expect(formatSyncAge(NOW - 23 * HOUR, NOW)).toBe("23 hours ago");
  });

  it("switches to days at the day boundary", () => {
    expect(formatSyncAge(NOW - DAY, NOW)).toBe("yesterday");
    expect(formatSyncAge(NOW - 3 * DAY, NOW)).toBe("3 days ago");
  });

  it("does not report a negative age when the clock skews backwards", () => {
    expect(formatSyncAge(NOW + 10 * MINUTE, NOW)).toBe("just now");
  });
});
