import { useMatches } from "@tanstack/react-router";
import { makeThreadKey } from "@/utils/threadKey";

/**
 * Safely call useMatches — returns [] when no router context is available
 * (e.g. in pop-out ThreadWindow which has no RouterProvider).
 */
function useMatchesSafe() {
  try {
    return useMatches();
  } catch {
    return [];
  }
}

/**
 * Derive the active label from the current route.
 * Returns the same string format as the old uiStore.activeLabel.
 */
export function useActiveLabel(): string {
  const matches = useMatchesSafe();
  for (const match of matches) {
    if (match.routeId === "/mail/$label" || match.routeId === "/mail/$label/thread/$threadId") {
      return (match.params as { label: string }).label;
    }
    if (match.routeId === "/label/$labelId" || match.routeId === "/label/$labelId/thread/$threadId") {
      return (match.params as { labelId: string }).labelId;
    }
    if (match.routeId === "/smart-folder/$folderId" || match.routeId === "/smart-folder/$folderId/thread/$threadId") {
      return `smart-folder:${(match.params as { folderId: string }).folderId}`;
    }
    if (match.routeId === "/settings/$tab" || match.routeId === "/settings") {
      return "settings";
    }
    if (match.routeId === "/calendar") {
      return "calendar";
    }
    if (match.routeId === "/help/$topic" || match.routeId === "/help") {
      return "help";
    }
  }
  return "inbox";
}

/**
 * Get the selected thread ID from route params, or null if no thread is selected.
 */
export function useSelectedThreadId(): string | null {
  const matches = useMatchesSafe();
  for (const match of matches) {
    const params = match.params as Record<string, string>;
    if (params["threadId"]) {
      return params["threadId"];
    }
  }
  return null;
}

/**
 * Account that owns the selected thread, taken from `?acct=`.
 * Absent on routes written before "All inboxes" existed, and on single-account
 * navigation — callers fall back to the active account.
 */
export function useSelectedThreadAccountId(): string | null {
  const matches = useMatchesSafe();
  for (const match of matches) {
    const search = (match as { search?: Record<string, unknown> }).search;
    if (search && typeof search["acct"] === "string" && search["acct"]) {
      return search["acct"];
    }
  }
  return null;
}

/**
 * Composite key (account + thread) of the selected thread — what the thread
 * store is keyed by. Null when no thread is selected.
 */
export function useSelectedThreadKey(fallbackAccountId?: string | null): string | null {
  const threadId = useSelectedThreadId();
  const acct = useSelectedThreadAccountId();
  if (!threadId) return null;
  return makeThreadKey(acct ?? fallbackAccountId ?? "", threadId);
}

/**
 * Get the active category from search params (only relevant on inbox in split mode).
 */
export function useActiveCategory(): string {
  const matches = useMatchesSafe();
  for (const match of matches) {
    const search = (match as { search?: Record<string, unknown> }).search;
    if (search && typeof search["category"] === "string") {
      return search["category"];
    }
  }
  return "Primary";
}

/**
 * Get the search query from search params.
 */
export function useSearchQuery(): string {
  const matches = useMatchesSafe();
  for (const match of matches) {
    const search = (match as { search?: Record<string, unknown> }).search;
    if (search && typeof search["q"] === "string") {
      return search["q"];
    }
  }
  return "";
}
