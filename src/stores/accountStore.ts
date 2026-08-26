import { create } from "zustand";
import { setSetting } from "../services/db/settings";

export interface Account {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  provider?: string;
}

interface AccountState {
  accounts: Account[];
  activeAccountId: string | null;
  /**
   * "All inboxes" mode — mail lists span every mail-capable account instead of
   * just `activeAccountId`. The active account stays set underneath so that
   * per-account things (custom labels, compose defaults) keep working.
   */
  unifiedInbox: boolean;
  setAccounts: (
    accounts: Account[],
    restoredId?: string | null,
    restoredUnified?: boolean,
  ) => void;
  setActiveAccount: (id: string) => void;
  setUnifiedInbox: (enabled: boolean) => void;
  addAccount: (account: Account) => void;
  removeAccount: (id: string) => void;
}

export const useAccountStore = create<AccountState>((set) => ({
  accounts: [],
  activeAccountId: null,
  unifiedInbox: false,

  setAccounts: (accounts, restoredId, restoredUnified) => {
    const activeId = (restoredId && accounts.some((a) => a.id === restoredId))
      ? restoredId
      : accounts[0]?.id ?? null;
    // Unified mode only makes sense with more than one mail account
    const unifiedInbox = (restoredUnified ?? false) && mailAccounts(accounts).length > 1;
    set({ accounts, activeAccountId: activeId, unifiedInbox });
  },

  setActiveAccount: (activeAccountId) => {
    setSetting("active_account_id", activeAccountId).catch(() => {});
    setSetting("unified_inbox", "false").catch(() => {});
    set({ activeAccountId, unifiedInbox: false });
  },

  setUnifiedInbox: (enabled) => {
    setSetting("unified_inbox", enabled ? "true" : "false").catch(() => {});
    set({ unifiedInbox: enabled });
  },

  addAccount: (account) =>
    set((state) => ({
      accounts: [...state.accounts, account],
      activeAccountId: state.activeAccountId ?? account.id,
    })),

  removeAccount: (id) =>
    set((state) => {
      const accounts = state.accounts.filter((a) => a.id !== id);
      return {
        accounts,
        activeAccountId:
          state.activeAccountId === id
            ? (accounts[0]?.id ?? null)
            : state.activeAccountId,
        unifiedInbox: state.unifiedInbox && mailAccounts(accounts).length > 1,
      };
    }),
}));

/** Accounts that actually carry mail (CalDAV-only accounts have no mailbox). */
export function mailAccounts(accounts: Account[]): Account[] {
  return accounts.filter((a) => a.provider !== "caldav");
}

/**
 * The accounts a mail list should read from: every mail account in unified
 * mode, otherwise just the active one. Empty when no account is usable.
 */
export function getViewAccountIds(state: {
  accounts: Account[];
  activeAccountId: string | null;
  unifiedInbox: boolean;
}): string[] {
  if (state.unifiedInbox) return mailAccounts(state.accounts).map((a) => a.id);
  return state.activeAccountId ? [state.activeAccountId] : [];
}
