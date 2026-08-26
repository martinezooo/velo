import { ThreadView } from "../email/ThreadView";
import { useThreadStore } from "@/stores/threadStore";
import { useAccountStore } from "@/stores/accountStore";
import { useSelectedThreadKey } from "@/hooks/useRouteNavigation";
import { EmptyState } from "../ui/EmptyState";
import { ReadingPaneIllustration } from "../ui/illustrations";

export function ReadingPane() {
  const activeAccountId = useAccountStore((s) => s.activeAccountId);
  const selectedThreadKey = useSelectedThreadKey(activeAccountId);
  const selectedThread = useThreadStore((s) =>
    selectedThreadKey ? s.threadMap.get(selectedThreadKey) ?? null : null,
  );

  if (!selectedThread) {
    return (
      <div className="flex-1 flex flex-col bg-bg-primary/50 glass-panel">
        <EmptyState illustration={ReadingPaneIllustration} title="Velo" subtitle="Select an email to read" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-bg-primary/50 overflow-hidden glass-panel">
      <ThreadView thread={selectedThread} />
    </div>
  );
}
