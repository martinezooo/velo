import { create } from "zustand";
import { threadKeyOf } from "@/utils/threadKey";

export interface Thread {
  id: string;
  accountId: string;
  subject: string | null;
  snippet: string | null;
  lastMessageAt: number;
  messageCount: number;
  isRead: boolean;
  isStarred: boolean;
  isPinned: boolean;
  isMuted: boolean;
  hasAttachments: boolean;
  labelIds: string[];
  fromName: string | null;
  fromAddress: string | null;
}

/**
 * Threads are addressed by their composite key (`accountId` + `id`), never by
 * the bare provider thread ID — the unified inbox mixes accounts in one list
 * and thread IDs are only unique within an account. See utils/threadKey.
 */
interface ThreadState {
  threads: Thread[];
  threadMap: Map<string, Thread>;
  selectedThreadId: string | null;
  selectedThreadIds: Set<string>;
  isLoading: boolean;
  searchQuery: string;
  searchThreadIds: Set<string> | null; // null = no active search
  setThreads: (threads: Thread[]) => void;
  selectThread: (key: string | null) => void;
  toggleThreadSelection: (key: string) => void;
  selectThreadRange: (key: string) => void;
  clearMultiSelect: () => void;
  selectAll: () => void;
  selectAllFromHere: () => void;
  setLoading: (loading: boolean) => void;
  updateThread: (key: string, updates: Partial<Thread>) => void;
  removeThread: (key: string) => void;
  removeThreads: (keys: string[]) => void;
  setSearch: (query: string, threadIds: Set<string> | null) => void;
  clearSearch: () => void;
}

export const useThreadStore = create<ThreadState>((set, get) => ({
  threads: [],
  threadMap: new Map(),
  selectedThreadId: null,
  selectedThreadIds: new Set(),
  isLoading: false,
  searchQuery: "",
  searchThreadIds: null,

  setThreads: (threads) =>
    set({ threads, threadMap: new Map(threads.map((t) => [threadKeyOf(t), t])) }),
  selectThread: (selectedThreadId) => set({ selectedThreadId, selectedThreadIds: new Set() }),
  toggleThreadSelection: (key) =>
    set((state) => {
      const next = new Set(state.selectedThreadIds);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return { selectedThreadIds: next };
    }),
  selectThreadRange: (key) => {
    const state = get();
    const threads = state.threads;
    // Find the anchor: last selected thread or the currently viewed thread
    const anchor = state.selectedThreadId ?? [...state.selectedThreadIds].pop();
    if (!anchor) {
      set({ selectedThreadIds: new Set([key]) });
      return;
    }
    const anchorIdx = threads.findIndex((t) => threadKeyOf(t) === anchor);
    const targetIdx = threads.findIndex((t) => threadKeyOf(t) === key);
    if (anchorIdx === -1 || targetIdx === -1) return;
    const start = Math.min(anchorIdx, targetIdx);
    const end = Math.max(anchorIdx, targetIdx);
    const rangeKeys = threads.slice(start, end + 1).map(threadKeyOf);
    set((s) => ({
      selectedThreadIds: new Set([...s.selectedThreadIds, ...rangeKeys]),
    }));
  },
  clearMultiSelect: () => set({ selectedThreadIds: new Set() }),
  selectAll: () => {
    const threads = get().threads;
    set({ selectedThreadIds: new Set(threads.map(threadKeyOf)) });
  },
  selectAllFromHere: () => {
    const { threads, selectedThreadId } = get();
    const idx = threads.findIndex((t) => threadKeyOf(t) === selectedThreadId);
    const startIdx = idx === -1 ? 0 : idx;
    const keys = threads.slice(startIdx).map(threadKeyOf);
    set((s) => ({
      selectedThreadIds: new Set([...s.selectedThreadIds, ...keys]),
    }));
  },
  setLoading: (isLoading) => set({ isLoading }),
  updateThread: (key, updates) =>
    set((state) => {
      const threads = state.threads.map((t) =>
        threadKeyOf(t) === key ? { ...t, ...updates } : t,
      );
      const threadMap = new Map(state.threadMap);
      const existing = threadMap.get(key);
      if (existing) threadMap.set(key, { ...existing, ...updates });
      return { threads, threadMap };
    }),
  removeThread: (key) =>
    set((state) => {
      const threadMap = new Map(state.threadMap);
      threadMap.delete(key);
      const next = new Set(state.selectedThreadIds);
      next.delete(key);
      return {
        threads: state.threads.filter((t) => threadKeyOf(t) !== key),
        threadMap,
        selectedThreadId: state.selectedThreadId === key ? null : state.selectedThreadId,
        selectedThreadIds: next,
      };
    }),
  removeThreads: (keys) =>
    set((state) => {
      const keySet = new Set(keys);
      const threadMap = new Map(state.threadMap);
      for (const key of keys) threadMap.delete(key);
      const next = new Set(state.selectedThreadIds);
      for (const key of keys) next.delete(key);
      return {
        threads: state.threads.filter((t) => !keySet.has(threadKeyOf(t))),
        threadMap,
        selectedThreadId:
          state.selectedThreadId && keySet.has(state.selectedThreadId)
            ? null
            : state.selectedThreadId,
        selectedThreadIds: next,
      };
    }),
  setSearch: (query, threadIds) => set({ searchQuery: query, searchThreadIds: threadIds }),
  clearSearch: () => set({ searchQuery: "", searchThreadIds: null }),
}));
