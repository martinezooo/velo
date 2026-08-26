import { Mail } from "lucide-react";
import { useAccountStore, mailAccounts } from "@/stores/accountStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsAccountId } from "@/hooks/useSettingsAccountId";

/**
 * Names, and lets you change, the mailbox a section's settings belong to.
 *
 * Rendered only on sections that are genuinely per-account — signatures,
 * templates, filters and the like — rather than once for the whole page, which
 * would imply everything in Settings is account-scoped when most of it is not.
 *
 * Changing it retargets the settings only; the mail being read is unaffected,
 * so opening Settings cannot move the inbox out from under you.
 */
export function SettingsAccountPicker() {
  const accounts = useAccountStore((s) => s.accounts);
  const setSettingsAccountId = useUIStore((s) => s.setSettingsAccountId);
  const settingsAccountId = useSettingsAccountId();

  const mail = mailAccounts(accounts);
  // With a single mailbox there is nothing to disambiguate
  if (mail.length < 2) return null;

  return (
    <label className="ml-auto flex min-w-0 items-center gap-1.5">
      <Mail size={12} className="shrink-0 text-accent" aria-hidden="true" />
      <span className="sr-only">Mailbox these settings apply to</span>
      <select
        value={settingsAccountId ?? ""}
        onChange={(e) => setSettingsAccountId(e.target.value || null)}
        title="Mailbox these settings apply to"
        className="min-w-0 max-w-[16rem] truncate rounded border border-border-primary bg-bg-tertiary px-1.5 py-0.5 text-[0.6875rem] text-text-secondary outline-none focus:border-accent"
      >
        {mail.map((account) => (
          <option key={account.id} value={account.id}>
            {account.email}
          </option>
        ))}
      </select>
    </label>
  );
}
