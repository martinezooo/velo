import { useState, useCallback, useRef, useEffect } from "react";
import { Sparkles, ChevronDown, ChevronUp, RefreshCw, AlertTriangle } from "lucide-react";
import { runAiTask, describeAiError } from "@/stores/aiStatusStore";
import { isAiAvailable } from "@/services/ai/providerManager";
import { summarizeThread } from "@/services/ai/aiService";
import { deleteAiCache } from "@/services/db/aiCache";
import type { DbMessage } from "@/services/db/messages";

interface ThreadSummaryProps {
  threadId: string;
  accountId: string;
  messages: DbMessage[];
}

export function ThreadSummary({ threadId, accountId, messages }: ThreadSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [available, setAvailable] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    if (messages.length < 2) return;
    isAiAvailable().then(setAvailable);
  }, [messages.length]);

  const loadingRef = useRef(false);
  // A failed auto-load must not retry on its own: summary stays null, so the
  // effect below would fire again on every render and spin forever.
  const attemptedRef = useRef<string | null>(null);

  const loadSummary = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await runAiTask("Summarising thread", () =>
        summarizeThread(threadId, accountId, messages),
      );
      setSummary(result);
    } catch (err) {
      console.error("Failed to summarize thread:", err);
      setSummary(null);
      setError(describeAiError(err));
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [threadId, accountId, messages]);

  // Auto-load once per thread; retries are explicit
  useEffect(() => {
    if (!available || messages.length < 2 || summary !== null || loadingRef.current) return;
    if (attemptedRef.current === threadId) return;
    attemptedRef.current = threadId;
    loadSummary();
  }, [available, messages.length, summary, threadId, loadSummary]);

  // A different thread deserves a fresh attempt
  useEffect(() => {
    setSummary(null);
    setError(null);
  }, [threadId]);

  const handleRefresh = useCallback(async () => {
    await deleteAiCache(accountId, threadId, "summary");
    setSummary(null);
    setError(null);
    attemptedRef.current = threadId;
    setLoading(true);
    try {
      const result = await runAiTask("Summarising thread", () =>
        summarizeThread(threadId, accountId, messages),
      );
      setSummary(result);
    } catch (err) {
      console.error("Failed to refresh summary:", err);
      setError(describeAiError(err));
    } finally {
      setLoading(false);
    }
  }, [threadId, accountId, messages]);

  if (!available || messages.length < 2) return null;

  return (
    <div className="mx-4 my-2 p-3 rounded-lg bg-accent/5 border border-accent/20">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Sparkles size={14} className="text-accent shrink-0" />
        <span className="text-xs font-medium text-accent flex-1">AI Summary</span>
        {loading && (
          <span className="flex items-center gap-1.5 text-[0.625rem] text-text-tertiary">
            <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
            Generating
          </span>
        )}
        {error && !loading && (
          <span className="flex items-center gap-1 text-[0.625rem] text-danger">
            <AlertTriangle size={11} />
            Failed
          </span>
        )}
        {(summary || error) && !loading && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); handleRefresh(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); handleRefresh(); } }}
            className="p-0.5 text-text-tertiary hover:text-accent transition-colors cursor-pointer"
            title={error ? "Try again" : "Refresh summary"}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </span>
        )}
        {collapsed ? <ChevronDown size={14} className="text-text-tertiary" /> : <ChevronUp size={14} className="text-text-tertiary" />}
      </button>
      {!collapsed && (
        <div className="mt-2 text-sm text-text-secondary">
          {loading && !summary && (
            <div className="flex items-center gap-2 text-text-tertiary">
              <div className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <span className="text-xs">Generating summary...</span>
            </div>
          )}
          {summary && <p className="text-xs leading-relaxed">{summary}</p>}
          {error && !loading && (
            <div className="flex items-start gap-2 text-xs text-text-tertiary">
              <AlertTriangle size={12} className="mt-0.5 shrink-0 text-danger" />
              <span>
                {error}{" "}
                <button
                  onClick={handleRefresh}
                  className="text-accent underline underline-offset-2 hover:text-accent-hover"
                >
                  Try again
                </button>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
