import { getActiveProvider } from "./providerManager";
import { getAiCache, setAiCache } from "@/services/db/aiCache";
import { AiError, describeProviderError } from "./errors";
import { getSetting } from "@/services/db/settings";
import type { AiConnectionTest } from "./types";
import type { DbMessage } from "@/services/db/messages";
import {
  SUMMARIZE_PROMPT,
  COMPOSE_PROMPT,
  REPLY_PROMPT,
  IMPROVE_PROMPT,
  SHORTEN_PROMPT,
  FORMALIZE_PROMPT,
  CATEGORIZE_PROMPT,
  SMART_REPLY_PROMPT,
  ASK_INBOX_PROMPT,
  SMART_LABEL_PROMPT,
  SUMMARIZE_UPDATE_PROMPT,
  EXTRACT_TASK_PROMPT,
} from "./prompts";

/**
 * Ceiling on a single model call. Provider SDKs do their own networking, so a
 * stalled request is invisible to the app's own fetch timeout — without this a
 * spinner can run forever with nothing to cancel it.
 */
const AI_TIMEOUT_MS = 60_000;

async function withTimeout<T>(task: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${AI_TIMEOUT_MS / 1000}s`)),
          AI_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Single entry point for every model call, so the timeout and the error
 * classification cannot be bypassed by a second copy of this function.
 */
export async function callAi(systemPrompt: string, userContent: string): Promise<string> {
  try {
    const provider = await getActiveProvider();
    return await withTimeout(
      provider.complete({ systemPrompt, userContent }),
      "AI request",
    );
  } catch (err) {
    if (err instanceof AiError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("401") || message.includes("authentication")) {
      throw new AiError("AUTH_ERROR", "Invalid API key");
    }
    if (message.includes("429") || message.includes("rate")) {
      throw new AiError("RATE_LIMITED", "Rate limited — please try again shortly");
    }
    throw new AiError("NETWORK_ERROR", message);
  }
}

function formatMessageForSummary(msg: DbMessage): string {
  const from = msg.from_name
    ? `${msg.from_name} <${msg.from_address}>`
    : (msg.from_address ?? "Unknown");
  const date = new Date(msg.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const body = (msg.body_text ?? msg.snippet ?? "").trim();
  return `<email_content>From: ${from}\nDate: ${date}\n\n${body}</email_content>`;
}

/** Characters of thread text a summary request may carry. */
const SUMMARY_BUDGET = 6000;

/**
 * Fit messages into the budget starting from the newest.
 *
 * Truncating the joined thread front-to-back dropped the *end* of long
 * threads — the part that says where things actually stand. Messages are
 * emitted newest first, and older ones are only included while there is room.
 */
function packRecentMessages(messages: DbMessage[], budget: number): string {
  const newestFirst = [...messages].sort((a, b) => Number(b.date) - Number(a.date));
  const parts: string[] = [];
  let used = 0;
  for (const message of newestFirst) {
    const formatted = formatMessageForSummary(message);
    if (used + formatted.length > budget && parts.length > 0) break;
    parts.push(formatted);
    used += formatted.length + 5;
  }
  return parts.join("\n---\n");
}

/** Cache marker: the newest message the stored summary already accounts for. */
const SUMMARY_MARKER = "summary_upto";

export async function summarizeThread(
  threadId: string,
  accountId: string,
  messages: DbMessage[],
): Promise<string> {
  if (messages.length === 0) return "";

  const newestFirst = [...messages].sort((a, b) => Number(b.date) - Number(a.date));
  const newestId = newestFirst[0]!.id;
  const subject = messages[0]?.subject ?? "No subject";
  const language = await getSummaryLanguageInstruction();

  const cached = await getAiCache(accountId, threadId, "summary");
  const coveredUpTo = await getAiCache(accountId, threadId, SUMMARY_MARKER);

  // Nothing new since the cached summary was written
  if (cached && coveredUpTo === newestId) return cached;

  let summary: string;
  if (cached && coveredUpTo) {
    // Update the existing summary with only what arrived since, rather than
    // re-reading the whole thread every time a message lands.
    const coveredIndex = newestFirst.findIndex((m) => m.id === coveredUpTo);
    const fresh = coveredIndex === -1 ? newestFirst : newestFirst.slice(0, coveredIndex);
    const freshText = packRecentMessages(fresh, SUMMARY_BUDGET);
    summary = await callAi(
      SUMMARIZE_UPDATE_PROMPT + language,
      `Existing summary:\n${cached}\n\nNew messages (newest first):\n<email_content>${freshText}</email_content>`,
    );
  } else {
    const combined = `Subject: ${subject}\n\n${packRecentMessages(messages, SUMMARY_BUDGET)}`;
    summary = await callAi(SUMMARIZE_PROMPT + language, combined);
  }

  await setAiCache(accountId, threadId, "summary", summary);
  await setAiCache(accountId, threadId, SUMMARY_MARKER, newestId);
  return summary;
}

/**
 * Summaries are read by one person and can sit in a language they prefer, even
 * when the mail does not. Replies are read by the correspondent, so those
 * follow the thread instead — see the reply prompts.
 */
async function getSummaryLanguageInstruction(): Promise<string> {
  const setting = await getSetting("ai_summary_language");
  if (!setting || setting === "auto") {
    return "\n\nWrite the summary in the same language as the thread.";
  }
  return `\n\nWrite the summary in ${setting}, whatever language the emails are in.`;
}

export async function composeFromPrompt(instructions: string): Promise<string> {
  return callAi(COMPOSE_PROMPT, instructions);
}

export async function generateReply(
  messagesText: string[],
  instructions?: string,
): Promise<string> {
  const combined = messagesText.join("\n---\n").slice(0, 4000);
  const userContent = instructions
    ? `<email_content>${combined}</email_content>\n\nInstructions: ${instructions}`
    : `<email_content>${combined}</email_content>`;
  return callAi(REPLY_PROMPT, userContent);
}

export type TransformType = "improve" | "shorten" | "formalize";

export async function transformText(
  text: string,
  type: TransformType,
): Promise<string> {
  const prompts: Record<TransformType, string> = {
    improve: IMPROVE_PROMPT,
    shorten: SHORTEN_PROMPT,
    formalize: FORMALIZE_PROMPT,
  };
  return callAi(prompts[type], text);
}

export async function generateSmartReplies(
  threadId: string,
  accountId: string,
  messages: DbMessage[],
): Promise<string[]> {
  // Check cache first
  const cached = await getAiCache(accountId, threadId, "smart_replies");
  if (cached) {
    try {
      return JSON.parse(cached) as string[];
    } catch {
      // Corrupted cache, regenerate
    }
  }

  const formatted = messages.map(formatMessageForSummary).join("\n---\n");
  const combined = formatted.slice(0, 4000);
  const result = await callAi(SMART_REPLY_PROMPT, `<email_content>${combined}</email_content>`);

  // Parse JSON array from response
  let replies: string[];
  try {
    // Extract JSON array from the response (handle potential markdown wrapping)
    // Use non-greedy match to avoid capturing extra content
    const jsonMatch = result.match(/\[[\s\S]*?\]/);
    replies = jsonMatch ? JSON.parse(jsonMatch[0]) as string[] : [result];
  } catch {
    // If parsing fails, split by newlines as fallback
    replies = result
      .split("\n")
      .map((l) => l.replace(/^\d+\.\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  // Validate and sanitize each reply
  replies = replies
    .filter((r): r is string => typeof r === "string")
    .map((r) => r.replace(/<[^>]*>/g, "").slice(0, 200));

  // Ensure exactly 3 replies
  while (replies.length < 3) replies.push("Thanks for the update.");
  replies = replies.slice(0, 3);

  // Cache the result
  await setAiCache(accountId, threadId, "smart_replies", JSON.stringify(replies));
  return replies;
}

export async function askInbox(
  question: string,
  _accountId: string,
  context: string,
): Promise<string> {
  const userContent = `<email_content>${context}</email_content>\n\nQuestion: ${question}`;
  return callAi(ASK_INBOX_PROMPT, userContent);
}

const VALID_CATEGORIES = new Set(["Primary", "Updates", "Promotions", "Social", "Newsletters"]);

export async function categorizeThreads(
  threads: { id: string; subject: string; snippet: string; fromAddress: string }[],
): Promise<Map<string, string>> {
  const input = threads
    .map((t) => `<email_content>ID:${t.id} | From:${t.fromAddress} | Subject:${t.subject} | ${t.snippet}</email_content>`)
    .join("\n");

  const validThreadIds = new Set(threads.map((t) => t.id));

  const result = await callAi(CATEGORIZE_PROMPT, input);
  const categories = new Map<string, string>();

  for (const line of result.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const threadId = trimmed.slice(0, colonIdx).trim();
    const category = trimmed.slice(colonIdx + 1).trim();
    // Validate: only accept known thread IDs and valid categories
    if (threadId && category && validThreadIds.has(threadId) && VALID_CATEGORIES.has(category)) {
      categories.set(threadId, category);
    }
  }

  return categories;
}

export async function classifyThreadsBySmartLabels(
  threads: { id: string; subject: string; snippet: string; fromAddress: string }[],
  labelRules: { labelId: string; description: string }[],
): Promise<Map<string, string[]>> {
  const labelDefs = labelRules
    .map((r) => `LABEL_ID:${r.labelId} — ${r.description}`)
    .join("\n");

  const threadData = threads
    .map((t) => `<email_content>ID:${t.id} | From:${t.fromAddress} | Subject:${t.subject} | ${t.snippet}</email_content>`)
    .join("\n");

  const userContent = `Label definitions:\n${labelDefs}\n\nThreads:\n${threadData}`;

  const validThreadIds = new Set(threads.map((t) => t.id));
  const validLabelIds = new Set(labelRules.map((r) => r.labelId));

  const result = await callAi(SMART_LABEL_PROMPT, userContent);
  const assignments = new Map<string, string[]>();

  for (const line of result.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const threadId = trimmed.slice(0, colonIdx).trim();
    const labelsPart = trimmed.slice(colonIdx + 1).trim();
    if (!threadId || !labelsPart || !validThreadIds.has(threadId)) continue;

    const labelIds = labelsPart
      .split(",")
      .map((l) => l.trim())
      .filter((l) => validLabelIds.has(l));

    if (labelIds.length > 0) {
      assignments.set(threadId, labelIds);
    }
  }

  return assignments;
}

export async function extractTaskFromThread(
  _threadId: string,
  _accountId: string,
  messages: DbMessage[],
): Promise<string> {
  const subject = messages[0]?.subject ?? "No subject";
  const formatted = messages.map(formatMessageForSummary).join("\n---\n");
  const combined = `<email_content>Subject: ${subject}\n\n${formatted}</email_content>`.slice(0, 6000);
  return callAi(EXTRACT_TASK_PROMPT, combined);
}

export async function testConnection(): Promise<AiConnectionTest> {
  try {
    const provider = await getActiveProvider();
    return await provider.testConnection();
  } catch (err) {
    // Reaching here means the provider could not even be constructed —
    // usually a missing key or an unconfigured provider.
    return { ok: false, error: describeProviderError(err) };
  }
}
