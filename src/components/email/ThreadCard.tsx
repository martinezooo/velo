import { memo, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { Thread } from "@/stores/threadStore";
import type { Account } from "@/stores/accountStore";
import { threadKeyOf } from "@/utils/threadKey";
import { useThreadStore } from "@/stores/threadStore";
import { useUIStore } from "@/stores/uiStore";
import { useActiveLabel } from "@/hooks/useRouteNavigation";
import { formatRelativeDate } from "@/utils/date";
import { Paperclip, Star, Check, Pin, BellRing, VolumeX } from "lucide-react";
import type { DragData } from "@/components/dnd/DndProvider";

const CATEGORY_COLORS: Record<string, string> = {
  Updates: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  Promotions: "bg-green-500/15 text-green-600 dark:text-green-400",
  Social: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  Newsletters: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
};

/** Stable per-account accent so the same mailbox always reads the same colour. */
const ACCOUNT_COLORS = [
  "bg-sky-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
] as const;

function accountColor(accountId: string): string {
  let hash = 0;
  for (let i = 0; i < accountId.length; i++) {
    hash = (hash * 31 + accountId.charCodeAt(i)) >>> 0;
  }
  return ACCOUNT_COLORS[hash % ACCOUNT_COLORS.length]!;
}

interface ThreadCardProps {
  thread: Thread;
  isSelected: boolean;
  onClick: (thread: Thread) => void;
  onContextMenu?: (e: React.MouseEvent, threadKey: string) => void;
  category?: string;
  showCategoryBadge?: boolean;
  hasFollowUp?: boolean;
  /** Set only in "All inboxes" mode — shows which mailbox the thread is in. */
  account?: Account | undefined;
}

export const ThreadCard = memo(function ThreadCard({ thread, isSelected, onClick, onContextMenu, category, showCategoryBadge, hasFollowUp, account }: ThreadCardProps) {
  const threadKey = threadKeyOf(thread);
  const isMultiSelected = useThreadStore((s) => s.selectedThreadIds.has(threadKey));
  const hasMultiSelect = useThreadStore((s) => s.selectedThreadIds.size > 0);
  const toggleThreadSelection = useThreadStore((s) => s.toggleThreadSelection);
  const selectThreadRange = useThreadStore((s) => s.selectThreadRange);
  const activeLabel = useActiveLabel();
  const emailDensity = useUIStore((s) => s.emailDensity);
  const isSpam = thread.labelIds.includes("SPAM");

  // Read selectedThreadIds lazily for drag — avoids subscribing all cards to the Set reference
  const dragData: DragData = useMemo(() => ({
    threadKeys: hasMultiSelect && isMultiSelected
      ? [...useThreadStore.getState().selectedThreadIds]
      : [threadKey],
    sourceLabel: activeLabel,
  }), [hasMultiSelect, isMultiSelected, threadKey, activeLabel]);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `thread-${threadKey}`,
    data: dragData,
  });

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      e.preventDefault();
      selectThreadRange(threadKey);
    } else if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      toggleThreadSelection(threadKey);
    } else if (hasMultiSelect) {
      toggleThreadSelection(threadKey);
    } else {
      onClick(thread);
    }
  };

  const handleContextMenu = onContextMenu
    ? (e: React.MouseEvent) => onContextMenu(e, threadKey)
    : undefined;
  const initial = (
    thread.fromName?.[0] ??
    thread.fromAddress?.[0] ??
    "?"
  ).toUpperCase();

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      aria-label={`${thread.isRead ? "" : "Unread "}email from ${thread.fromName ?? thread.fromAddress ?? "Unknown"}: ${thread.subject ?? "(No subject)"}`}
      aria-selected={isSelected}
      className={`w-full text-left border-b border-border-secondary group hover-lift press-scale ${
        emailDensity === "compact" ? "px-3 py-1.5" : emailDensity === "spacious" ? "px-4 py-4" : "px-4 py-3"
      } ${
        isDragging
          ? "opacity-50"
          : isMultiSelected
            ? "bg-accent/10"
            : isSelected
              ? "bg-bg-selected"
              : "hover:bg-bg-hover"
      } ${isSpam ? "bg-red-500/8 dark:bg-red-500/10" : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={`rounded-full flex items-center justify-center shrink-0 font-medium text-white ${
            emailDensity === "compact" ? "w-7 h-7 text-xs" : emailDensity === "spacious" ? "w-10 h-10 text-sm" : "w-9 h-9 text-sm"
          } ${
            isMultiSelected ? "bg-accent" : thread.isRead ? "bg-text-tertiary" : "bg-accent"
          }`}
        >
          {isMultiSelected ? <Check size={emailDensity === "compact" ? 14 : 16} /> : initial}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* First row: sender + date */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-sm truncate ${
                thread.isRead
                  ? "text-text-secondary"
                  : "font-semibold text-text-primary"
              }`}
            >
              {thread.fromName ?? thread.fromAddress ?? "Unknown"}
            </span>
            {account && (
              <span
                className="flex items-center gap-1 text-[0.625rem] text-text-tertiary max-w-[9rem] shrink-0"
                title={account.email}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${accountColor(account.id)}`} />
                <span className="truncate">{account.email}</span>
              </span>
            )}
            <span className="text-xs text-text-tertiary whitespace-nowrap shrink-0">
              {formatRelativeDate(thread.lastMessageAt)}
            </span>
          </div>

          {/* Subject */}
          <div
            className={`text-sm truncate mt-0.5 ${
              thread.isRead ? "text-text-secondary" : "text-text-primary"
            }`}
          >
            {thread.subject ?? "(No subject)"}
          </div>

          {/* Snippet + indicators */}
          <div className={`flex items-center gap-1.5 mt-0.5 ${emailDensity === "compact" ? "hidden" : ""}`}>
            <span className="text-xs text-text-tertiary truncate flex-1">
              {thread.snippet}
            </span>
            {showCategoryBadge && category && category !== "Primary" && CATEGORY_COLORS[category] && (
              <span className={`shrink-0 text-[0.625rem] px-1.5 rounded-full leading-normal ${CATEGORY_COLORS[category]}`}>
                {category}
              </span>
            )}
            {hasFollowUp && (
              <span className="shrink-0 text-accent" title="Follow-up reminder set">
                <BellRing size={12} />
              </span>
            )}
            {thread.isMuted && (
              <span className="shrink-0 text-warning" title="Muted">
                <VolumeX size={12} />
              </span>
            )}
            {thread.isPinned && (
              <span className="shrink-0 text-accent" title="Pinned">
                <Pin size={12} className="fill-current" />
              </span>
            )}
            {thread.hasAttachments && (
              <span className="shrink-0 text-text-tertiary" title="Has attachments">
                <Paperclip size={12} />
              </span>
            )}
            {thread.isStarred && (
              <span className="shrink-0 text-warning star-animate" title="Starred">
                <Star size={12} className="fill-current" />
              </span>
            )}
            {thread.messageCount > 1 && (
              <span className="text-xs text-text-tertiary shrink-0 bg-bg-tertiary rounded-full px-1.5">
                {thread.messageCount}
              </span>
            )}
          </div>
        </div>
      </div>

    </button>
  );
});
