import { useEffect, useState } from "react";
import { Sparkles, AlertTriangle } from "lucide-react";
import { useAiStatusStore } from "@/stores/aiStatusStore";
import { isAiAvailable } from "@/services/ai/providerManager";
import { navigateToSettings } from "@/router/navigate";

/**
 * Always-visible AI status light in the title bar.
 *
 * Answers "is AI even on?" at a glance, which the floating card cannot — that
 * only appears once something is already running or has already failed. The
 * card stays for the detail; this is the resting indicator.
 */
export function AiStatusChip() {
  const running = useAiStatusStore((s) => s.running);
  const lastError = useAiStatusStore((s) => s.lastError);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      isAiAvailable()
        .then((ok) => { if (!cancelled) setAvailable(ok); })
        .catch(() => { if (!cancelled) setAvailable(false); });
    };
    check();
    // Settings can turn AI on or off while the window is open
    window.addEventListener("velo-ai-config-changed", check);
    return () => {
      cancelled = true;
      window.removeEventListener("velo-ai-config-changed", check);
    };
  }, []);

  const isRunning = running > 0;
  const state = isRunning
    ? "working"
    : lastError
      ? "error"
      : available
        ? "ready"
        : "off";

  const title = {
    working: `AI working${running > 1 ? ` (${running} tasks)` : ""}…`,
    error: `AI: ${lastError?.message ?? "last request failed"} — click to configure`,
    ready: "AI ready — click to configure",
    off: "AI not configured — click to set it up",
  }[state];

  return (
    <button
      onClick={() => navigateToSettings("ai")}
      title={title}
      aria-label={title}
      className="flex shrink-0 items-center gap-1.5 rounded px-1.5 py-1 transition-colors hover:bg-sidebar-hover"
    >
      {state === "error" ? (
        <AlertTriangle size={12} className="text-danger" />
      ) : (
        <span className="relative flex h-3 w-3 items-center justify-center">
          {state === "working" && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/40" />
          )}
          <Sparkles
            size={12}
            className={
              state === "working"
                ? "relative text-accent"
                : state === "ready"
                  ? "relative text-accent/70"
                  : "relative text-sidebar-text/30"
            }
          />
        </span>
      )}
      <span className="text-[0.6875rem] text-sidebar-text/45">
        {state === "working" ? "AI…" : "AI"}
      </span>
    </button>
  );
}
