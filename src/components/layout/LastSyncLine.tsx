import { useEffect, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

/**
 * Turn an age in milliseconds into the coarsest phrase that is still true.
 * Exported for tests — the boundaries are where this reads wrong most easily.
 */
export function formatSyncAge(lastSyncAt: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - lastSyncAt) / 1000));
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/**
 * Last successful sync, in the sidebar footer.
 *
 * "Syncing…" alone cannot distinguish a run in progress from one that quietly
 * stopped hours ago, so the resting state names the time instead.
 */
export function LastSyncLine({
  collapsed,
  variant = "sidebar",
}: {
  collapsed: boolean;
  variant?: "sidebar" | "titlebar";
}) {
  const lastSyncAt = useUIStore((s) => s.lastSyncAt);
  const isOnline = useUIStore((s) => s.isOnline);
  const [now, setNow] = useState(() => Date.now());

  // Re-render on a minute cadence so the phrase does not go stale in place
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const label = !isOnline
    ? "Offline"
    : lastSyncAt === null
      ? "Not synced yet"
      : `Synced ${formatSyncAge(lastSyncAt, now)}`;

  const title = lastSyncAt !== null
    ? `Last sync: ${new Date(lastSyncAt).toLocaleString()}`
    : "No sync has completed yet";

  if (variant === "titlebar") {
    return (
      <div
        className="flex items-center gap-1.5 px-2 text-[0.6875rem] text-sidebar-text/45"
        title={title}
      >
        {isOnline
          ? <RefreshCw size={11} className="shrink-0" />
          : <WifiOff size={11} className="shrink-0 text-warning/70" />}
        <span className="whitespace-nowrap">{label}</span>
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="flex justify-center px-2 pb-1" title={title}>
        {isOnline
          ? <RefreshCw size={12} className="text-sidebar-text/35" />
          : <WifiOff size={12} className="text-warning/70" />}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 px-4 pb-1.5 text-[0.6875rem] text-sidebar-text/40"
      title={title}
    >
      {isOnline
        ? <RefreshCw size={11} className="shrink-0" />
        : <WifiOff size={11} className="shrink-0 text-warning/70" />}
      <span className="truncate">{label}</span>
    </div>
  );
}
