import { Mail } from "lucide-react";
import { useAccountStore, mailAccounts } from "@/stores/accountStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsAccountId } from "@/hooks/useSettingsAccountId";

/**
 * Names the mailbox that the account-scoped settings below apply to.
 *
 * Signatures, templates, filters, labels and quick steps are stored per
 * account. Without this the page silently edited whichever account happened to
 * be active — invisible with one account, a trap with several.
 *
 * Changing it here does not change the mail being read; it only retargets the
 * settings, so opening Settings cannot move the inbox out from under you.
 */
export function SettingsAccountPicker() {
  const accounts = useAccountStore((s) => s.accounts);
  const setSettingsAccountId = useUIStore((s) => s.setSettingsAccountId);
  const settingsAccountId = useSettingsAccountId();

  const mail = mailAccounts(accounts);
  // With a single mailbox there is nothing to disambiguate
  if (mail.length < 2) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-border-primary bg-bg-tertiary/50 px-3 py-2">
      <Mail size={13} className="shrink-0 text-accent" />
      <span className="shrink-0 text-xs text-text-secondary">Editing settings for</span>
      <select
        value={settingsAccountId ?? ""}
        onChange={(e) => setSettingsAccountId(e.target.value || null)}
        className="min-w-0 flex-1 rounded border border-border-primary bg-bg-tertiary px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
      >
        {mail.map((account) => (
          <option key={account.id} value={account.id}>
            {account.email}
          </option>
        ))}
      </select>
    </div>
  );
}
