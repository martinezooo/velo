import { useEffect, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { getAttachmentsForMessage, type DbAttachment } from "@/services/db/attachments";
import { getEmailProvider } from "@/services/email/providerFactory";
import { useComposerStore } from "@/stores/composerStore";
import { formatFileSize } from "@/utils/fileTypeHelpers";

/**
 * Offers the original's attachments when forwarding.
 *
 * Forwarding used to drop them silently, which quietly loses the contract the
 * message was about. Attaching them automatically is the other wrong answer:
 * files can be large, and a forward is often just "look at this thread". So it
 * asks, and only downloads once the answer is yes.
 */
export function ForwardAttachmentsPrompt({
  accountId,
  messageId,
}: {
  accountId: string;
  messageId: string;
}) {
  const addAttachment = useComposerStore((s) => s.addAttachment);
  const [candidates, setCandidates] = useState<DbAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDismissed(false);
    setError(null);
    getAttachmentsForMessage(accountId, messageId)
      .then((all) => {
        if (cancelled) return;
        // Inline images belong to the quoted body, not to the file list
        setCandidates(all.filter((a) => a.is_inline !== 1 && a.gmail_attachment_id));
      })
      .catch(() => { if (!cancelled) setCandidates([]); });
    return () => { cancelled = true; };
  }, [accountId, messageId]);

  if (dismissed || candidates.length === 0) return null;

  const totalBytes = candidates.reduce((sum, a) => sum + (a.size ?? 0), 0);

  const attachAll = async () => {
    setBusy(true);
    setError(null);
    try {
      const provider = await getEmailProvider(accountId);
      for (const att of candidates) {
        const { data, size } = await provider.fetchAttachment(
          messageId,
          att.gmail_attachment_id!,
        );
        addAttachment({
          id: att.id,
          // The picker path carries a File; a forwarded attachment has none
          file: undefined as unknown as File,
          filename: att.filename ?? "attachment",
          mimeType: att.mime_type ?? "application/octet-stream",
          size: size || att.size || 0,
          content: data,
        });
      }
      setDismissed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fetch the attachments");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-4 mb-2 flex items-center gap-2 rounded-md border border-border-primary bg-bg-tertiary/50 px-3 py-2">
      <Paperclip size={14} className="shrink-0 text-text-tertiary" />
      <span className="min-w-0 flex-1 text-xs text-text-secondary">
        {error ?? (
          <>
            The original has {candidates.length}{" "}
            {candidates.length === 1 ? "attachment" : "attachments"}
            {totalBytes > 0 && <> ({formatFileSize(totalBytes)})</>}. Forward them too?
          </>
        )}
      </span>
      <button
        onClick={attachAll}
        disabled={busy}
        className="shrink-0 rounded bg-accent px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {busy ? "Attaching…" : error ? "Try again" : "Attach"}
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Forward without attachments"
        title="Forward without attachments"
        className="shrink-0 rounded p-0.5 text-text-tertiary transition-colors hover:text-text-primary"
      >
        <X size={13} />
      </button>
    </div>
  );
}
