import { useAccountStore } from "@/stores/accountStore";
import { useUIStore } from "@/stores/uiStore";

/**
 * The mailbox that account-scoped settings apply to.
 *
 * Signatures, templates, filters, labels and quick steps all belong to one
 * account, but every editor used to read `activeAccountId` silently — so with
 * several accounts there was no way to tell which mailbox you were editing,
 * and in "All inboxes" the active account is not even on screen.
 */
export function useSettingsAccountId(): string | null {
  const settingsAccountId = useUIStore((s) => s.settingsAccountId);
  const activeAccountId = useAccountStore((s) => s.activeAccountId);
  const accounts = useAccountStore((s) => s.accounts);

  // A stale selection (account removed) must not strand the editors
  if (settingsAccountId && accounts.some((a) => a.id === settingsAccountId)) {
    return settingsAccountId;
  }
  return activeAccountId;
}
