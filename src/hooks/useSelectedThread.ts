import { useAccountStore } from "@/stores/accountStore";
import { useThreadStore, type Thread } from "@/stores/threadStore";
import { useSelectedThreadKey } from "./useRouteNavigation";

/**
 * The thread currently open, or null when nothing is selected.
 *
 * A route can name a thread that is not in the loaded list — after switching
 * label, account, or search — so "a threadId is in the URL" is not the same as
 * "there is something to read". The layout uses this to decide whether the
 * reading pane exists at all, and the pane itself uses it to render, so the
 * two can never disagree.
 */
export function useSelectedThread(): Thread | null {
  const activeAccountId = useAccountStore((s) => s.activeAccountId);
  const selectedThreadKey = useSelectedThreadKey(activeAccountId);
  return useThreadStore((s) =>
    selectedThreadKey ? s.threadMap.get(selectedThreadKey) ?? null : null,
  );
}
