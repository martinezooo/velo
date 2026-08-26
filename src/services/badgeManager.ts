import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { getUnreadInboxCount } from "./db/threads";

let lastCount = -1;

/**
 * Mirror the unread inbox count onto the dock/taskbar icon and tray tooltip.
 *
 * Counts unread INBOX threads across every account, so the number matches what
 * "All inboxes" shows rather than whichever account happens to be selected.
 *
 * @param force recompute even when the count looks unchanged — used after the
 *              window regains focus, where the OS may have dropped the badge.
 */
export async function updateBadgeCount(force = false): Promise<void> {
  try {
    const count = await getUnreadInboxCount();
    if (!force && count === lastCount) return;
    lastCount = count;

    try {
      await getCurrentWindow().setBadgeCount(count > 0 ? count : undefined);
    } catch (err) {
      // Not fatal, but silence here previously made a missing badge impossible
      // to diagnose — the platform, the permission, and the API all look alike
      // when the failure is swallowed.
      console.warn("Failed to set badge count:", err);
    }

    const tooltip = count > 0 ? `Revelo - ${count} unread` : "Revelo";
    try {
      await invoke("set_tray_tooltip", { tooltip });
    } catch {
      // tray tooltip update is best-effort
    }
  } catch (err) {
    console.error("Failed to update badge count:", err);
  }
}
