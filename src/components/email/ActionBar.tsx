import { useState, useEffect } from "react";
import type { Thread } from "@/stores/threadStore";
import { useThreadStore } from "@/stores/threadStore";
import { useUIStore } from "@/stores/uiStore";
import { threadKeyOf } from "@/utils/threadKey";
import { useActiveLabel } from "@/hooks/useRouteNavigation";
import { archiveThread, trashThread, permanentDeleteThread, markThreadRead, starThread, spamThread } from "@/services/emailActions";
import { deleteThread as deleteThreadFromDb, pinThread as pinThreadDb, unpinThread as unpinThreadDb, muteThread as muteThreadDb, unmuteThread as unmuteThreadDb } from "@/services/db/threads";
import { deleteDraftsForThread } from "@/services/gmail/draftDeletion";
import { snoozeThread } from "@/services/snooze/snoozeManager";
import { getGmailClient } from "@/services/gmail/tokenManager";
import { SnoozeDialog } from "./SnoozeDialog";
import { FollowUpDialog } from "./FollowUpDialog";
import { Archive, Trash2, MailOpen, Mail, Star, Clock, Ban, Pin, MailMinus, BellRing, VolumeX, Reply, ReplyAll, Forward, FolderInput, Printer, Download, ExternalLink, PanelRightClose, PanelRightOpen, ListTodo, Sun, Moon } from "lucide-react";
import type { DbMessage } from "@/services/db/messages";
import { insertFollowUpReminder, getFollowUpForThread, cancelFollowUpForThread } from "@/services/db/followUpReminders";
import { Button } from "@/components/ui/Button";

interface ActionBarProps {
  thread: Thread;
  messages?: DbMessage[];
  noReply?: boolean;
  defaultReplyMode?: "reply" | "replyAll";
  contactSidebarVisible?: boolean;
  taskSidebarVisible?: boolean;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
  onPopOut?: () => void;
  onToggleContactSidebar?: () => void;
  onToggleTaskSidebar?: () => void;
}

function Separator() {
  return <div className="w-px h-5 bg-border-secondary mx-1 shrink-0" />;
}

export function ActionBar({ thread, messages, noReply, defaultReplyMode = "reply", contactSidebarVisible, taskSidebarVisible, onReply, onReplyAll, onForward, onPrint, onExport, onPopOut, onToggleContactSidebar, onToggleTaskSidebar }: ActionBarProps) {
  const updateThread = useThreadStore((s) => s.updateThread);
  const removeThread = useThreadStore((s) => s.removeThread);
  // The thread's own account, not the sidebar selection — in "All inboxes"
  // they differ.
  const accountId = thread.accountId;
  const threadKey = threadKeyOf(thread);
  const activeLabel = useActiveLabel();
  const emailBodyTheme = useUIStore((s) => s.emailBodyTheme);
  const toggleEmailBodyTheme = useUIStore((s) => s.toggleEmailBodyTheme);
  const [showSnooze, setShowSnooze] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [hasFollowUp, setHasFollowUp] = useState(false);
  const isSpamView = activeLabel === "spam";
  const hasLastMessage = !!messages?.length;

  // Check if thread has an active follow-up reminder
  useEffect(() => {
    if (!accountId) return;
    getFollowUpForThread(accountId, thread.id)
      .then((r) => setHasFollowUp(r !== null))
      .catch(() => setHasFollowUp(false));
  }, [accountId, thread.id]);

  const handleToggleRead = async () => {
    if (!accountId) return;
    await markThreadRead(accountId, thread.id, [], !thread.isRead);
  };

  const handleToggleStar = async () => {
    if (!accountId) return;
    await starThread(accountId, thread.id, [], !thread.isStarred);
  };

  const handleArchive = async () => {
    if (!accountId) return;
    await archiveThread(accountId, thread.id, []);
  };

  const handleDelete = async () => {
    if (!accountId) return;
    const isTrashView = activeLabel === "trash";
    const isDraftsView = activeLabel === "drafts";
    if (isTrashView) {
      await permanentDeleteThread(accountId, thread.id, []);
      await deleteThreadFromDb(accountId, thread.id);
    } else if (isDraftsView) {
      removeThread(threadKey);
      try {
        const client = await getGmailClient(accountId);
        await deleteDraftsForThread(client, accountId, thread.id);
      } catch (err) {
        console.error("Failed to delete drafts:", err);
      }
    } else {
      await trashThread(accountId, thread.id, []);
    }
  };

  const handleSnooze = async (until: number) => {
    if (!accountId) return;
    setShowSnooze(false);
    try {
      await snoozeThread(accountId, thread.id, until);
      removeThread(threadKey);
    } catch (err) {
      console.error("Failed to snooze:", err);
    }
  };

  const handleSpam = async () => {
    if (!accountId) return;
    await spamThread(accountId, thread.id, [], !isSpamView);
  };

  // Find the first message with an unsubscribe header
  const unsubscribeMessage = messages?.find((m) => m.list_unsubscribe);
  const hasUnsubscribe = !!unsubscribeMessage?.list_unsubscribe;
  const [unsubscribeStatus, setUnsubscribeStatus] = useState<"idle" | "loading" | "done">("idle");

  const handleUnsubscribe = async () => {
    if (!unsubscribeMessage?.list_unsubscribe || !accountId) return;
    setUnsubscribeStatus("loading");
    try {
      const { executeUnsubscribe } = await import("@/services/unsubscribe/unsubscribeManager");
      const result = await executeUnsubscribe(
        accountId,
        thread.id,
        unsubscribeMessage.from_address ?? "unknown",
        unsubscribeMessage.from_name,
        unsubscribeMessage.list_unsubscribe,
        unsubscribeMessage.list_unsubscribe_post,
      );
      if (result.success) {
        setUnsubscribeStatus("done");
        // Auto-archive after successful unsubscribe
        await archiveThread(accountId, thread.id, []);
      } else {
        setUnsubscribeStatus("idle");
      }
    } catch (err) {
      console.error("Failed to unsubscribe:", err);
      setUnsubscribeStatus("idle");
    }
  };

  const handleTogglePin = async () => {
    if (!accountId) return;
    const newPinned = !thread.isPinned;
    updateThread(threadKey, { isPinned: newPinned });
    try {
      if (newPinned) {
        await pinThreadDb(accountId, thread.id);
      } else {
        await unpinThreadDb(accountId, thread.id);
      }
    } catch (err) {
      console.error("Failed to toggle pin:", err);
      updateThread(threadKey, { isPinned: !newPinned });
    }
  };

  const handleToggleMute = async () => {
    if (!accountId) return;
    const newMuted = !thread.isMuted;
    if (newMuted) {
      // Mute: mark as muted and archive
      updateThread(threadKey, { isMuted: true });
      try {
        await muteThreadDb(accountId, thread.id);
        await archiveThread(accountId, thread.id, []);
      } catch (err) {
        console.error("Failed to mute:", err);
        await unmuteThreadDb(accountId, thread.id);
        updateThread(threadKey, { isMuted: false });
      }
    } else {
      // Unmute
      updateThread(threadKey, { isMuted: false });
      try {
        await unmuteThreadDb(accountId, thread.id);
      } catch (err) {
        console.error("Failed to unmute:", err);
        updateThread(threadKey, { isMuted: true });
      }
    }
  };

  const handleFollowUp = async (remindAt: number) => {
    if (!accountId || !messages || messages.length === 0) return;
    setShowFollowUp(false);
    const lastMsg = messages[messages.length - 1]!;
    try {
      await insertFollowUpReminder(accountId, thread.id, lastMsg.id, remindAt);
      setHasFollowUp(true);
    } catch (err) {
      console.error("Failed to set follow-up reminder:", err);
    }
  };

  const handleCancelFollowUp = async () => {
    if (!accountId) return;
    try {
      await cancelFollowUpForThread(accountId, thread.id);
      setHasFollowUp(false);
    } catch (err) {
      console.error("Failed to cancel follow-up:", err);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 px-3 py-3 border-b border-border-secondary bg-bg-secondary">
        {/* Reply / Forward group */}
        {hasLastMessage && (
          <>
            <Button
              variant="secondary"
              iconOnly
              icon={defaultReplyMode === "replyAll" ? <ReplyAll size={15} /> : <Reply size={15} />}
              onClick={defaultReplyMode === "replyAll" ? onReplyAll : onReply}
              disabled={noReply}
              title={noReply ? "This sender does not accept replies" : defaultReplyMode === "replyAll" ? "Reply All (r)" : "Reply (r)"}
              className="disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
            />
            <Button
              variant="secondary"
              iconOnly
              icon={defaultReplyMode === "replyAll" ? <Reply size={15} /> : <ReplyAll size={15} />}
              onClick={defaultReplyMode === "replyAll" ? onReply : onReplyAll}
              disabled={noReply}
              title={noReply ? "This sender does not accept replies" : defaultReplyMode === "replyAll" ? "Reply (a)" : "Reply All (a)"}
              className="disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
            />
            <Button
              variant="secondary"
              iconOnly
              icon={<Forward size={15} />}
              onClick={onForward}
              title="Forward (f)"
            />
            <Separator />
          </>
        )}

        {/* Core actions group */}
        <Button variant="secondary" iconOnly icon={<Archive size={15} />} onClick={handleArchive} title="Archive (e)" />
        <Button variant="secondary" iconOnly icon={<Trash2 size={15} />} onClick={handleDelete} title="Delete (#)" />
        <Button
          variant="secondary"
          iconOnly
          icon={thread.isRead ? <Mail size={15} /> : <MailOpen size={15} />}
          onClick={handleToggleRead}
          title={thread.isRead ? "Mark unread" : "Mark read"}
        />
        <Button
          variant="secondary"
          iconOnly
          icon={<Star size={15} className={thread.isStarred ? "fill-current" : ""} />}
          onClick={handleToggleStar}
          title={thread.isStarred ? "Unstar (s)" : "Star (s)"}
          className={thread.isStarred ? "text-warning" : ""}
        />
        <Button variant="secondary" iconOnly icon={<Clock size={15} />} onClick={() => setShowSnooze(true)} title="Snooze (h)" />
        <Button
          variant="secondary"
          iconOnly
          icon={<Ban size={15} />}
          onClick={handleSpam}
          title={isSpamView ? "Not Spam (!)" : "Report Spam (!)"}
        />
        <Button
          variant="secondary"
          iconOnly
          icon={<FolderInput size={15} />}
          onClick={() => {
            if (!accountId) return;
            window.dispatchEvent(new CustomEvent("velo-move-to-folder", { detail: { threadIds: [thread.id] } }));
          }}
          title="Move to folder (v)"
        />
        <Button
          variant="secondary"
          iconOnly
          icon={<Pin size={15} className={thread.isPinned ? "fill-current" : ""} />}
          onClick={handleTogglePin}
          title={thread.isPinned ? "Unpin (p)" : "Pin (p)"}
          className={thread.isPinned ? "text-accent" : ""}
        />
        <Button
          variant="secondary"
          iconOnly
          icon={<VolumeX size={15} className={thread.isMuted ? "fill-current" : ""} />}
          onClick={handleToggleMute}
          title={thread.isMuted ? "Unmute (m)" : "Mute (m)"}
          className={thread.isMuted ? "text-warning" : ""}
        />
        {hasFollowUp ? (
          <Button
            variant="secondary"
            iconOnly
            icon={<BellRing size={15} className="fill-current" />}
            onClick={handleCancelFollowUp}
            title="Cancel follow-up reminder"
            className="text-accent"
          />
        ) : (
          <Button
            variant="secondary"
            iconOnly
            icon={<BellRing size={15} />}
            onClick={() => setShowFollowUp(true)}
            title="Remind me if no reply"
          />
        )}
        {hasUnsubscribe && (
          <Button
            variant="secondary"
            iconOnly
            icon={<MailMinus size={15} />}
            onClick={handleUnsubscribe}
            title={unsubscribeStatus === "loading" ? "Unsubscribing..." : unsubscribeStatus === "done" ? "Unsubscribed" : "Unsubscribe (u)"}
            className={unsubscribeStatus === "done" ? "text-success" : ""}
          />
        )}

        {/* Spacer */}
        <div className="ml-auto" />

        {/* Utility group */}
        <Button
          variant="secondary"
          iconOnly
          icon={emailBodyTheme === "dark" ? <Moon size={15} className="text-accent" /> : <Sun size={15} />}
          onClick={toggleEmailBodyTheme}
          title={
            emailBodyTheme === "dark"
              ? "Message body: dark — switch to light"
              : "Message body: light — switch to dark"
          }
        />
        <Button variant="secondary" iconOnly icon={<Printer size={15} />} onClick={onPrint} title="Print" />
        <Button variant="secondary" iconOnly icon={<Download size={15} />} onClick={onExport} title="Export as .eml" />
        <Button variant="secondary" iconOnly icon={<ExternalLink size={15} />} onClick={onPopOut} title="Open in new window" />
        <Button
          variant="secondary"
          iconOnly
          icon={<ListTodo size={15} className={taskSidebarVisible ? "text-accent" : ""} />}
          onClick={onToggleTaskSidebar}
          title={taskSidebarVisible ? "Hide task panel" : "Show task panel"}
        />
        <Button
          variant="secondary"
          iconOnly
          icon={contactSidebarVisible ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
          onClick={onToggleContactSidebar}
          title={contactSidebarVisible ? "Hide contact sidebar" : "Show contact sidebar"}
        />
      </div>

      <SnoozeDialog
        isOpen={showSnooze}
        onSnooze={handleSnooze}
        onClose={() => setShowSnooze(false)}
      />
      <FollowUpDialog
        isOpen={showFollowUp}
        onSetReminder={handleFollowUp}
        onClose={() => setShowFollowUp(false)}
      />
    </>
  );
}
