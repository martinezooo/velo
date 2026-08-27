import { useState } from "react";
import { useStatusToastStore } from "@/stores/statusToastStore";

/**
 * The running version, and the way to ask whether it is still the newest.
 *
 * Checking is on click rather than automatic here — the background checker
 * already runs on its own schedule; this is for when you want an answer now.
 */
export function VersionChip() {
  const showToast = useStatusToastStore((s) => s.showToast);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    if (checking) return;
    setChecking(true);
    showToast("Checking for updates…", "info");
    try {
      const { checkForUpdateNow } = await import("@/services/updateManager");
      const update = await checkForUpdateNow();
      showToast(
        update
          ? `Revelo ${update.version} is available`
          : `Revelo ${__APP_VERSION__} is the latest version`,
        update ? "info" : "success",
      );
    } catch (err) {
      // The fork publishes no releases yet, so "no endpoint" is the common case
      const message = err instanceof Error ? err.message : String(err);
      showToast(
        /404|not found|no releases|endpoint/i.test(message)
          ? "No update feed published for this build"
          : `Update check failed: ${message.slice(0, 80)}`,
        "error",
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <button
      onClick={check}
      disabled={checking}
      title={`Revelo ${__APP_VERSION__} — click to check for updates`}
      aria-label={`Version ${__APP_VERSION__}. Click to check for updates.`}
      className="shrink-0 rounded px-1.5 py-1 text-[0.625rem] text-sidebar-text/35 transition-colors hover:bg-sidebar-hover hover:text-sidebar-text/60"
    >
      v{__APP_VERSION__}
    </button>
  );
}
