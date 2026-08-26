import { describe, it, expect } from "vitest";
import {
  makeThreadKey,
  threadKeyOf,
  parseThreadKey,
  threadIdFromKey,
  groupKeysByAccount,
} from "./threadKey";

describe("threadKey", () => {
  it("round-trips an account and thread ID", () => {
    const key = makeThreadKey("acc-1", "thread-1");
    expect(parseThreadKey(key)).toEqual({ accountId: "acc-1", threadId: "thread-1" });
    expect(threadIdFromKey(key)).toBe("thread-1");
  });

  it("keeps the same thread ID in two accounts distinct", () => {
    // The same message delivered to two mailboxes yields one IMAP thread ID
    expect(makeThreadKey("acc-1", "imap-thread-abc")).not.toBe(
      makeThreadKey("acc-2", "imap-thread-abc"),
    );
  });

  it("builds a key from a thread-shaped object", () => {
    expect(threadKeyOf({ accountId: "acc-1", id: "thread-1" })).toBe(
      makeThreadKey("acc-1", "thread-1"),
    );
  });

  it("treats a bare thread ID as having no account", () => {
    expect(parseThreadKey("thread-1")).toEqual({ accountId: "", threadId: "thread-1" });
  });

  it("groups keys by their owning account", () => {
    const grouped = groupKeysByAccount([
      makeThreadKey("acc-1", "t1"),
      makeThreadKey("acc-2", "t2"),
      makeThreadKey("acc-1", "t3"),
    ]);
    expect(grouped.get("acc-1")).toEqual(["t1", "t3"]);
    expect(grouped.get("acc-2")).toEqual(["t2"]);
  });

  it("assigns account-less keys to the fallback account", () => {
    const grouped = groupKeysByAccount(["t1"], "acc-9");
    expect(grouped.get("acc-9")).toEqual(["t1"]);
  });

  it("drops account-less keys when there is no fallback", () => {
    expect(groupKeysByAccount(["t1"]).size).toBe(0);
  });
});
