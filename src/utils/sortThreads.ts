import type { Thread } from "@/stores/threadStore";
import type { EmailSort } from "@/stores/uiStore";

/**
 * Order the thread list.
 *
 * Pinned threads stay at the top under every ordering — pinning is a statement
 * about importance, and a sort that buries a pinned thread has ignored it.
 * Ties fall back to recency so the order is stable and predictable.
 */
export function sortThreads(threads: Thread[], sort: EmailSort): Thread[] {
  const byRecency = (a: Thread, b: Thread) => b.lastMessageAt - a.lastMessageAt;

  const comparators: Record<EmailSort, (a: Thread, b: Thread) => number> = {
    newest: byRecency,
    oldest: (a, b) => a.lastMessageAt - b.lastMessageAt,
    unread: (a, b) => Number(a.isRead) - Number(b.isRead) || byRecency(a, b),
    sender: (a, b) =>
      senderKey(a).localeCompare(senderKey(b), undefined, { sensitivity: "base" })
      || byRecency(a, b),
    subject: (a, b) =>
      subjectKey(a).localeCompare(subjectKey(b), undefined, { sensitivity: "base" })
      || byRecency(a, b),
    attachments: (a, b) =>
      Number(b.hasAttachments) - Number(a.hasAttachments) || byRecency(a, b),
  };

  const compare = comparators[sort] ?? byRecency;
  return [...threads].sort(
    (a, b) => Number(b.isPinned) - Number(a.isPinned) || compare(a, b),
  );
}

function senderKey(thread: Thread): string {
  return (thread.fromName ?? thread.fromAddress ?? "").trim();
}

/**
 * Sort by what the conversation is about, not by how many times it has been
 * replied to, so "Re: Offer" files under O with "Offer".
 */
function subjectKey(thread: Thread): string {
  return (thread.subject ?? "")
    .replace(/^\s*((re|odp|aw|sv|fwd?|fw|wg)\s*(\[\d+\])?\s*:\s*)+/i, "")
    .trim();
}
