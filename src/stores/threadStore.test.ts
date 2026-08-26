import { describe, it, expect, beforeEach } from "vitest";
import { useThreadStore, type Thread } from "./threadStore";
import { makeThreadKey } from "@/utils/threadKey";

// Threads are addressed by composite account+thread keys, not bare thread IDs
const k1 = makeThreadKey("acc-1", "thread-1");
const k2 = makeThreadKey("acc-1", "thread-2");
const k3 = makeThreadKey("acc-1", "thread-3");

const mockThread: Thread = {
  id: "thread-1",
  accountId: "acc-1",
  subject: "Test Subject",
  snippet: "This is a test...",
  lastMessageAt: 1700000000,
  messageCount: 3,
  isRead: false,
  isStarred: false,
  isPinned: false,
  isMuted: false,
  hasAttachments: false,
  labelIds: ["INBOX"],
  fromName: "John Doe",
  fromAddress: "john@example.com",
};

const mockThread2: Thread = {
  id: "thread-2",
  accountId: "acc-1",
  subject: "Another Thread",
  snippet: "Another preview...",
  lastMessageAt: 1700001000,
  messageCount: 1,
  isRead: true,
  isStarred: true,
  isPinned: false,
  isMuted: false,
  hasAttachments: true,
  labelIds: ["INBOX", "STARRED"],
  fromName: "Jane Smith",
  fromAddress: "jane@example.com",
};

describe("threadStore", () => {
  beforeEach(() => {
    useThreadStore.setState({
      threads: [],
      threadMap: new Map(),
      selectedThreadId: null,
      selectedThreadIds: new Set(),
      isLoading: false,
    });
  });

  it("should start with empty threads", () => {
    const state = useThreadStore.getState();
    expect(state.threads).toHaveLength(0);
    expect(state.selectedThreadId).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it("should set threads", () => {
    useThreadStore.getState().setThreads([mockThread, mockThread2]);
    expect(useThreadStore.getState().threads).toHaveLength(2);
  });

  it("should select a thread", () => {
    useThreadStore.getState().setThreads([mockThread]);
    useThreadStore.getState().selectThread(k1);
    expect(useThreadStore.getState().selectedThreadId).toBe(k1);
  });

  it("should deselect a thread", () => {
    useThreadStore.getState().selectThread(k1);
    useThreadStore.getState().selectThread(null);
    expect(useThreadStore.getState().selectedThreadId).toBeNull();
  });

  it("should set loading state", () => {
    useThreadStore.getState().setLoading(true);
    expect(useThreadStore.getState().isLoading).toBe(true);
  });

  it("should select all threads", () => {
    useThreadStore.getState().setThreads([mockThread, mockThread2]);
    useThreadStore.getState().selectAll();
    const state = useThreadStore.getState();
    expect(state.selectedThreadIds.size).toBe(2);
    expect(state.selectedThreadIds.has(k1)).toBe(true);
    expect(state.selectedThreadIds.has(k2)).toBe(true);
  });

  it("should select all threads from the selected thread onward", () => {
    const mockThread3: Thread = {
      ...mockThread,
      id: "thread-3",
      subject: "Third Thread",
    };
    useThreadStore.getState().setThreads([mockThread, mockThread2, mockThread3]);
    useThreadStore.getState().selectThread(k2);
    useThreadStore.getState().selectAllFromHere();
    const state = useThreadStore.getState();
    // Should select thread-2 and thread-3 (from index 1 onward)
    expect(state.selectedThreadIds.size).toBe(2);
    expect(state.selectedThreadIds.has(k2)).toBe(true);
    expect(state.selectedThreadIds.has(k3)).toBe(true);
    expect(state.selectedThreadIds.has(k1)).toBe(false);
  });

  it("should select all from beginning when no thread is selected", () => {
    useThreadStore.getState().setThreads([mockThread, mockThread2]);
    useThreadStore.getState().selectAllFromHere();
    const state = useThreadStore.getState();
    expect(state.selectedThreadIds.size).toBe(2);
  });

  it("should merge selectAllFromHere with existing selection", () => {
    const mockThread3: Thread = {
      ...mockThread,
      id: "thread-3",
      subject: "Third Thread",
    };
    useThreadStore.getState().setThreads([mockThread, mockThread2, mockThread3]);
    // Select thread-2 as the current thread
    useThreadStore.getState().selectThread(k2);
    // Manually add thread-1 to multi-select (after selectThread since it clears multiselect)
    useThreadStore.getState().toggleThreadSelection(k1);
    // Now selectAllFromHere should merge with the existing selection
    useThreadStore.getState().selectAllFromHere();
    const state = useThreadStore.getState();
    // Should have thread-1 (from toggle) + thread-2, thread-3 (from selectAllFromHere)
    expect(state.selectedThreadIds.size).toBe(3);
  });

  describe("threadMap", () => {
    it("should build threadMap when setting threads", () => {
      useThreadStore.getState().setThreads([mockThread, mockThread2]);
      const { threadMap } = useThreadStore.getState();
      expect(threadMap.size).toBe(2);
      expect(threadMap.get(k1)).toBe(useThreadStore.getState().threads[0]);
      expect(threadMap.get(k2)).toBe(useThreadStore.getState().threads[1]);
    });

    it("should return undefined for non-existent thread in threadMap", () => {
      useThreadStore.getState().setThreads([mockThread]);
      expect(useThreadStore.getState().threadMap.get("non-existent")).toBeUndefined();
    });

    it("should update threadMap when updating a thread", () => {
      useThreadStore.getState().setThreads([mockThread, mockThread2]);
      useThreadStore.getState().updateThread(k1, { isRead: true });
      const { threadMap } = useThreadStore.getState();
      expect(threadMap.get(k1)?.isRead).toBe(true);
      expect(threadMap.get(k2)?.isRead).toBe(true); // was already true
    });

    it("should remove from threadMap when removing a thread", () => {
      useThreadStore.getState().setThreads([mockThread, mockThread2]);
      useThreadStore.getState().removeThread(k1);
      const { threadMap } = useThreadStore.getState();
      expect(threadMap.size).toBe(1);
      expect(threadMap.has(k1)).toBe(false);
      expect(threadMap.has(k2)).toBe(true);
    });

    it("should remove from threadMap when removing multiple threads", () => {
      const mockThread3: Thread = { ...mockThread, id: "thread-3" };
      useThreadStore.getState().setThreads([mockThread, mockThread2, mockThread3]);
      useThreadStore.getState().removeThreads([k1, k3]);
      const { threadMap } = useThreadStore.getState();
      expect(threadMap.size).toBe(1);
      expect(threadMap.has(k2)).toBe(true);
    });

    it("should start with empty threadMap", () => {
      expect(useThreadStore.getState().threadMap.size).toBe(0);
    });
  });

  it("keeps same-ID threads from different accounts apart", () => {
    // The same message delivered to two accounts yields the same IMAP thread ID
    const other: Thread = { ...mockThread, accountId: "acc-2" };
    useThreadStore.getState().setThreads([mockThread, other]);
    const otherKey = makeThreadKey("acc-2", "thread-1");

    expect(useThreadStore.getState().threadMap.size).toBe(2);

    useThreadStore.getState().updateThread(otherKey, { isRead: true });
    expect(useThreadStore.getState().threadMap.get(otherKey)?.isRead).toBe(true);
    expect(useThreadStore.getState().threadMap.get(k1)?.isRead).toBe(false);

    useThreadStore.getState().removeThread(otherKey);
    expect(useThreadStore.getState().threads).toHaveLength(1);
    expect(useThreadStore.getState().threads[0]?.accountId).toBe("acc-1");
  });

  it("should update a specific thread", () => {
    useThreadStore.getState().setThreads([mockThread, mockThread2]);
    useThreadStore.getState().updateThread(k1, { isRead: true, isStarred: true });

    const updated = useThreadStore.getState().threads.find((t) => t.id === "thread-1");
    expect(updated?.isRead).toBe(true);
    expect(updated?.isStarred).toBe(true);
    expect(updated?.subject).toBe("Test Subject"); // unchanged

    // Other thread should be untouched
    const other = useThreadStore.getState().threads.find((t) => t.id === "thread-2");
    expect(other?.isRead).toBe(true); // was already true
  });
});
