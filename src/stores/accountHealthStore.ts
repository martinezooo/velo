import { create } from "zustand";
import { getSetting, setSetting } from "@/services/db/settings";

/**
 * Accounts whose sign-in has stopped working.
 *
 * A sync failure surfaces as a toast that clears after a few seconds. That is
 * fine for a dropped connection, but an expired grant never fixes itself: the
 * account then shows an empty mailbox indefinitely, with nothing on screen
 * saying why. This keeps that state until it is actually resolved.
 */
const SETTING_KEY = "accounts_needing_reauth";

interface AccountHealthState {
  needsReauth: Set<string>;
  markNeedsReauth: (accountId: string) => void;
  clearNeedsReauth: (accountId: string) => void;
  restore: () => Promise<void>;
}

async function persist(ids: Set<string>): Promise<void> {
  try {
    await setSetting(SETTING_KEY, JSON.stringify([...ids]));
  } catch {
    // Best effort: losing this only costs the reminder, not the mail
  }
}

export const useAccountHealthStore = create<AccountHealthState>((set, get) => ({
  needsReauth: new Set(),

  markNeedsReauth: (accountId) => {
    const current = get().needsReauth;
    if (current.has(accountId)) return;
    const next = new Set(current).add(accountId);
    persist(next);
    set({ needsReauth: next });
  },

  clearNeedsReauth: (accountId) => {
    const current = get().needsReauth;
    if (!current.has(accountId)) return;
    const next = new Set(current);
    next.delete(accountId);
    persist(next);
    set({ needsReauth: next });
  },

  restore: async () => {
    try {
      const raw = await getSetting(SETTING_KEY);
      if (!raw) return;
      const ids = JSON.parse(raw) as string[];
      if (Array.isArray(ids)) set({ needsReauth: new Set(ids) });
    } catch {
      // A corrupt value is not worth blocking startup for
    }
  },
}));
