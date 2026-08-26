import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/services/db/connection", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/db/connection")>();
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

import { getDb } from "@/services/db/connection";
import {
  muteThread,
  unmuteThread,
  getMutedThreadIds,
  deleteAllThreadsForAccount,
  getThreadsForAccounts,
  getThreadsForCategoryAcrossAccounts,
} from "./threads";
import { createMockDb } from "@/test/mocks";

const mockDb = createMockDb();

describe("threads service - deleteAllThreadsForAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Awaited<ReturnType<typeof getDb>>);
  });

  it("deletes all threads for the given account", async () => {
    await deleteAllThreadsForAccount("acc-1");

    expect(mockDb.execute).toHaveBeenCalledWith(
      "DELETE FROM threads WHERE account_id = $1",
      ["acc-1"],
    );
  });
});

describe("threads service - mute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Awaited<ReturnType<typeof getDb>>);
  });

  describe("muteThread", () => {
    it("calls db.execute with correct SQL to set is_muted = 1", async () => {
      await muteThread("acc-1", "thread-1");

      expect(mockDb.execute).toHaveBeenCalledWith(
        "UPDATE threads SET is_muted = 1 WHERE account_id = $1 AND id = $2",
        ["acc-1", "thread-1"],
      );
    });
  });

  describe("unmuteThread", () => {
    it("calls db.execute with correct SQL to set is_muted = 0", async () => {
      await unmuteThread("acc-1", "thread-1");

      expect(mockDb.execute).toHaveBeenCalledWith(
        "UPDATE threads SET is_muted = 0 WHERE account_id = $1 AND id = $2",
        ["acc-1", "thread-1"],
      );
    });
  });

  describe("getMutedThreadIds", () => {
    it("returns a Set of muted thread IDs", async () => {
      mockDb.select.mockResolvedValueOnce([
        { id: "thread-1" },
        { id: "thread-3" },
      ]);

      const result = await getMutedThreadIds("acc-1");

      expect(mockDb.select).toHaveBeenCalledWith(
        "SELECT id FROM threads WHERE account_id = $1 AND is_muted = 1",
        ["acc-1"],
      );
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(2);
      expect(result.has("thread-1")).toBe(true);
      expect(result.has("thread-3")).toBe(true);
    });

    it("returns an empty Set when no threads are muted", async () => {
      mockDb.select.mockResolvedValueOnce([]);

      const result = await getMutedThreadIds("acc-1");

      expect(result.size).toBe(0);
    });
  });
});

describe("threads service - multi-account queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Awaited<ReturnType<typeof getDb>>);
    mockDb.select.mockResolvedValue([]);
  });

  it("expands one placeholder per account and appends limit/offset after them", async () => {
    await getThreadsForAccounts(["acc-1", "acc-2"], undefined, 50, 0);

    const [sql, params] = mockDb.select.mock.calls[0]!;
    expect(sql).toContain("t.account_id IN ($1, $2)");
    expect(sql).toContain("LIMIT $3 OFFSET $4");
    expect(params).toEqual(["acc-1", "acc-2", 50, 0]);
  });

  it("places the label parameter after the account placeholders", async () => {
    await getThreadsForAccounts(["acc-1", "acc-2", "acc-3"], "INBOX", 25, 25);

    const [sql, params] = mockDb.select.mock.calls[0]!;
    expect(sql).toContain("t.account_id IN ($1, $2, $3)");
    expect(sql).toContain("tl.label_id = $4");
    expect(sql).toContain("LIMIT $5 OFFSET $6");
    expect(params).toEqual(["acc-1", "acc-2", "acc-3", "INBOX", 25, 25]);
  });

  it("orders by pinned then recency so accounts interleave by date", async () => {
    await getThreadsForAccounts(["acc-1", "acc-2"]);

    const [sql] = mockDb.select.mock.calls[0]!;
    expect(sql).toContain("ORDER BY t.is_pinned DESC, t.last_message_at DESC");
  });

  it("returns empty without querying when no accounts are given", async () => {
    expect(await getThreadsForAccounts([])).toEqual([]);
    expect(await getThreadsForCategoryAcrossAccounts([], "Primary")).toEqual([]);
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("keeps category parameters after the account placeholders", async () => {
    await getThreadsForCategoryAcrossAccounts(["acc-1", "acc-2"], "Promotions", 50, 0);

    const [sql, params] = mockDb.select.mock.calls[0]!;
    expect(sql).toContain("t.account_id IN ($1, $2)");
    expect(sql).toContain("tc.category = $3");
    expect(sql).toContain("LIMIT $4 OFFSET $5");
    expect(params).toEqual(["acc-1", "acc-2", "Promotions", 50, 0]);
  });

  it("includes uncategorised threads in Primary across accounts", async () => {
    await getThreadsForCategoryAcrossAccounts(["acc-1", "acc-2"], "Primary", 50, 0);

    const [sql, params] = mockDb.select.mock.calls[0]!;
    expect(sql).toContain("t.account_id IN ($1, $2)");
    expect(sql).toContain("tc.category IS NULL OR tc.category = 'Primary'");
    expect(sql).toContain("LIMIT $3 OFFSET $4");
    expect(params).toEqual(["acc-1", "acc-2", 50, 0]);
  });
});
