import { describe, it, expect } from "vitest";
import { sortThreads } from "./sortThreads";
import type { Thread } from "@/stores/threadStore";

function thread(over: Partial<Thread> & { id: string }): Thread {
  return {
    accountId: "acc-1",
    subject: "Subject",
    snippet: null,
    lastMessageAt: 1000,
    messageCount: 1,
    isRead: true,
    isStarred: false,
    isPinned: false,
    isMuted: false,
    hasAttachments: false,
    labelIds: [],
    fromName: null,
    fromAddress: "a@x.pl",
    ...over,
  } as Thread;
}

const ids = (list: Thread[]) => list.map((t) => t.id);

describe("sortThreads", () => {
  const a = thread({ id: "a", lastMessageAt: 3000, fromName: "Charlie", subject: "Banana" });
  const b = thread({ id: "b", lastMessageAt: 1000, fromName: "alice", subject: "Re: Apple" });
  const c = thread({ id: "c", lastMessageAt: 2000, fromName: "Bob", subject: "Cherry" });

  it("puts the newest first by default", () => {
    expect(ids(sortThreads([b, c, a], "newest"))).toEqual(["a", "c", "b"]);
  });

  it("reverses for oldest first", () => {
    expect(ids(sortThreads([a, b, c], "oldest"))).toEqual(["b", "c", "a"]);
  });

  it("sorts by sender case-insensitively", () => {
    // "alice" must come before "Bob", which a naive comparison gets wrong
    expect(ids(sortThreads([a, b, c], "sender"))).toEqual(["b", "c", "a"]);
  });

  it("files a reply under the original subject", () => {
    // "Re: Apple" belongs with Apple, not under R
    expect(ids(sortThreads([a, b, c], "subject"))).toEqual(["b", "a", "c"]);
  });

  it("brings unread to the top, newest among them first", () => {
    const unreadOld = thread({ id: "u1", lastMessageAt: 500, isRead: false });
    const unreadNew = thread({ id: "u2", lastMessageAt: 4000, isRead: false });
    expect(ids(sortThreads([a, unreadOld, unreadNew], "unread"))).toEqual(["u2", "u1", "a"]);
  });

  it("brings threads with attachments to the top", () => {
    const withFile = thread({ id: "f", lastMessageAt: 100, hasAttachments: true });
    expect(ids(sortThreads([a, withFile, c], "attachments"))).toEqual(["f", "a", "c"]);
  });

  it("keeps pinned threads on top under every ordering", () => {
    const pinnedOld = thread({ id: "p", lastMessageAt: 1, isPinned: true, fromName: "zzz" });
    for (const sort of ["newest", "oldest", "sender", "subject", "unread", "attachments"] as const) {
      expect(ids(sortThreads([a, pinnedOld, c], sort))[0]).toBe("p");
    }
  });

  it("does not mutate the array it was given", () => {
    const input = [b, a, c];
    sortThreads(input, "newest");
    expect(ids(input)).toEqual(["b", "a", "c"]);
  });

  it("handles missing sender and subject without throwing", () => {
    const bare = thread({ id: "x", fromName: null, fromAddress: null, subject: null });
    expect(() => sortThreads([bare, a], "sender")).not.toThrow();
    expect(() => sortThreads([bare, a], "subject")).not.toThrow();
  });
});
