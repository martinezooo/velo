import { Sparkles, AlertTriangle, X, SlidersHorizontal } from "lucide-react";
import { useAiStatusStore } from "@/stores/aiStatusStore";
import { navigateToSettings } from "@/router/navigate";

/**
 * Floating indicator for AI work.
 *
 * Sits out of the way until something happens, then says which of the two
 * states it is in — running (pulsing) or failed (with the reason). Without it
 * a silent AI call is indistinguishable from a broken one.
 */
export function AiActivityIndicator() {
  const running = useAiStatusStore((s) => s.running);
  const currentLabel = useAiStatusStore((s) => s.currentLabel);
  const lastError = useAiStatusStore((s) => s.lastError);
  const clearError = useAiStatusStore((s) => s.clearError);

  const isRunning = running > 0;
  if (!isRunning && !lastError) return null;

  if (isRunning) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full border border-accent/30 bg-bg-primary/95 px-3.5 py-2 shadow-lg backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
      >
        <span className="relative flex h-4 w-4 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/40" />
          <Sparkles size={14} className="relative text-accent" />
        </span>
        <span className="text-xs text-text-secondary">
          {currentLabel ?? "Working"}
          {running > 1 ? ` (${running})` : ""}…
        </span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-40 flex max-w-sm items-start gap-2.5 rounded-lg border border-danger/40 bg-bg-primary/95 px-3.5 py-2.5 shadow-lg backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
    >
      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-text-primary">
          {lastError!.label} failed
        </div>
        <div className="mt-0.5 text-xs text-text-secondary">{lastError!.message}</div>
        <button
          onClick={() => {
            clearError();
            navigateToSettings("ai");
          }}
          className="mt-1.5 inline-flex items-center gap-1 text-xs text-accent transition-colors hover:text-accent-hover"
        >
          <SlidersHorizontal size={11} />
          Reconfigure
        </button>
      </div>
      <button
        onClick={clearError}
        aria-label="Dismiss AI error"
        className="shrink-0 rounded p-0.5 text-text-tertiary transition-colors hover:text-text-primary"
      >
        <X size={13} />
      </button>
    </div>
  );
}
