import { useState } from "react";
import { PlugZap, Loader2 } from "lucide-react";
import { useAccountStore } from "@/stores/accountStore";
import { useAccountHealthStore } from "@/stores/accountHealthStore";
import { useStatusToastStore } from "@/stores/statusToastStore";

/**
 * A mailbox whose sign-in has expired, said out loud where the mail should be.
 *
 * Burying this in Settings meant the account simply looked empty: no mail, no
 * error, nothing to click. The fix belongs next to the symptom, so the banner
 * sits above the list and reconnects in place.
 */
export function DisconnectedAccountsBanner() {
  const accounts = useAccountStore((s) => s.accounts);
  const needsReauth = useAccountHealthStore((s) => s.needsReauth);
  const clearNeedsReauth = useAccountHealthStore((s) => s.clearNeedsReauth);
  const showToast = useStatusToastStore((s) => s.showToast);
  const [busyId, setBusyId] = useState<string | null>(null);

  const disconnected = accounts.filter((a) => needsReauth.has(a.id));
  if (disconnected.length === 0) return null;

  const reconnect = async (accountId: string, email: string) => {
    setBusyId(accountId);
    try {
      const { reauthorizeAccount } = await import("@/services/gmail/tokenManager");
      await reauthorizeAccount(accountId, email);
      clearNeedsReauth(accountId);
      showToast(`${email} reconnected`);
      const { triggerSync } = await import("@/services/gmail/syncManager");
      triggerSync([accountId]);
    } catch (err) {
      showToast(
        `Could not reconnect ${email}: ${err instanceof Error ? err.message : "unknown error"}`,
        "error",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="border-b border-warning/30 bg-warning/10">
      {disconnected.map((account) => (
        <div key={account.id} className="flex items-center gap-2 px-4 py-2">
          <PlugZap size={14} className="shrink-0 text-warning" />
          <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">
            <span className="font-medium text-text-primary">{account.email}</span>{" "}
            is disconnected — its mail is not syncing.
          </span>
          <button
            onClick={() => reconnect(account.id, account.email)}
            disabled={busyId === account.id}
            className="flex shrink-0 items-center gap-1.5 rounded bg-accent px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {busyId === account.id && <Loader2 size={11} className="animate-spin" />}
            {busyId === account.id ? "Waiting…" : "Reconnect"}
          </button>
        </div>
      ))}
    </div>
  );
}
