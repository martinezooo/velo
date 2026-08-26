import { ThreadView } from "../email/ThreadView";
import { useSelectedThread } from "@/hooks/useSelectedThread";

/**
 * The reading pane only exists while a thread is open — MailLayout does not
 * render it otherwise, so there is no empty placeholder taking up half the
 * window. The null branch here is a guard for the instant between a thread
 * disappearing (archived, moved) and the layout re-rendering.
 */
export function ReadingPane() {
  const selectedThread = useSelectedThread();

  if (!selectedThread) return null;

  return (
    <div className="flex-1 bg-bg-primary/50 overflow-hidden glass-panel">
      <ThreadView thread={selectedThread} />
    </div>
  );
}
