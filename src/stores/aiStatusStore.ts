import { create } from "zustand";

/**
 * Visible state for AI work.
 *
 * AI calls used to fail silently — a summary that errored left the card empty
 * with no spinner, no message, and no way to tell "still thinking" from
 * "broken". Every AI task registers here so one indicator can answer both
 * questions: is something running, and did the last attempt fail.
 */
export interface AiTaskError {
  /** What was being attempted, e.g. "Summarising thread". */
  label: string;
  /** Short, reader-facing reason. */
  message: string;
}

interface AiStatusState {
  /** Number of AI tasks in flight. */
  running: number;
  /** Label of the most recently started task, for the indicator's caption. */
  currentLabel: string | null;
  /** Last failure, until dismissed or superseded by a success. */
  lastError: AiTaskError | null;
  startTask: (label: string) => void;
  finishTask: () => void;
  failTask: (label: string, message: string) => void;
  clearError: () => void;
}

export const useAiStatusStore = create<AiStatusState>((set) => ({
  running: 0,
  currentLabel: null,
  lastError: null,

  startTask: (label) =>
    set((state) => ({
      running: state.running + 1,
      currentLabel: label,
      // A new attempt supersedes the previous failure
      lastError: null,
    })),

  finishTask: () =>
    set((state) => {
      const running = Math.max(0, state.running - 1);
      return { running, currentLabel: running === 0 ? null : state.currentLabel };
    }),

  failTask: (label, message) =>
    set((state) => {
      const running = Math.max(0, state.running - 1);
      return {
        running,
        currentLabel: running === 0 ? null : state.currentLabel,
        lastError: { label, message },
      };
    }),

  clearError: () => set({ lastError: null }),
}));

/**
 * Run an AI call with its progress and failure reflected in the indicator.
 * Re-throws, so callers still handle their own local state.
 */
export async function runAiTask<T>(label: string, task: () => Promise<T>): Promise<T> {
  const { startTask, finishTask, failTask } = useAiStatusStore.getState();
  startTask(label);
  try {
    const result = await task();
    finishTask();
    return result;
  } catch (err) {
    failTask(label, describeAiError(err));
    throw err;
  }
}

/** Turn a provider error into something worth showing a reader. */
export function describeAiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "Unknown error");
  const lower = raw.toLowerCase();

  if (lower.includes("timed out") || lower.includes("timeout") || lower.includes("aborted")) {
    return "The model did not respond in time";
  }
  if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("api key")) {
    return "API key rejected — check it in Settings > AI";
  }
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("quota")) {
    return "Rate limit or quota reached — try again shortly";
  }
  if (lower.includes("failed to fetch") || lower.includes("network") || lower.includes("enotfound")) {
    return "Could not reach the AI provider — check your connection";
  }
  if (lower.includes("no provider") || lower.includes("not configured")) {
    return "No AI provider configured — add a key in Settings > AI";
  }
  return raw.length > 120 ? raw.slice(0, 120) + "…" : raw;
}
