import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/db/aiCache", () => ({
  getAiCache: vi.fn(),
  setAiCache: vi.fn(() => Promise.resolve()),
  deleteAiCache: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/services/db/settings", () => ({
  getSetting: vi.fn(() => Promise.resolve(null)),
}));
vi.mock("./providerManager", () => ({
  getActiveProvider: vi.fn(),
}));

import { summarizeThread } from "./aiService";
import { getAiCache, setAiCache } from "@/services/db/aiCache";
import { getSetting } from "@/services/db/settings";
import { getActiveProvider } from "./providerManager";
import type { DbMessage } from "@/services/db/messages";

const complete = vi.fn(() => Promise.resolve("summary text"));

function message(id: string, date: number, body: string): DbMessage {
  return {
    id,
    account_id: "acc-1",
    thread_id: "t1",
    from_address: `${id}@example.com`,
    from_name: id,
    subject: "Offer",
    date,
    body_text: body,
    snippet: body.slice(0, 40),
  } as unknown as DbMessage;
}

describe("summarizeThread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActiveProvider).mockResolvedValue({ complete } as never);
    vi.mocked(getSetting).mockResolvedValue(null);
  });

  it("returns the cached summary when no message has arrived since", async () => {
    vi.mocked(getAiCache).mockImplementation(async (_a, _t, kind) =>
      kind === "summary" ? "cached" : "m2",
    );

    const result = await summarizeThread("t1", "acc-1", [
      message("m1", 1000, "first"),
      message("m2", 2000, "second"),
    ]);

    expect(result).toBe("cached");
    expect(complete).not.toHaveBeenCalled();
  });

  it("updates the existing summary using only the newer messages", async () => {
    vi.mocked(getAiCache).mockImplementation(async (_a, _t, kind) =>
      kind === "summary" ? "older summary" : "m1",
    );

    await summarizeThread("t1", "acc-1", [
      message("m1", 1000, "the oldest thing"),
      message("m2", 2000, "the newest thing"),
    ]);

    const { systemPrompt, userContent } = complete.mock.calls[0]![0] as never as {
      systemPrompt: string; userContent: string;
    };
    expect(systemPrompt).toContain("updating an existing summary");
    expect(userContent).toContain("older summary");
    expect(userContent).toContain("the newest thing");
    // The message already covered is not re-sent
    expect(userContent).not.toContain("the oldest thing");
  });

  it("keeps the newest messages when the thread exceeds the budget", async () => {
    vi.mocked(getAiCache).mockResolvedValue(null);
    const filler = "x".repeat(3000);
    const messages = [
      message("old", 1000, `OLDEST ${filler}`),
      message("mid", 2000, `MIDDLE ${filler}`),
      message("new", 3000, `NEWEST ${filler}`),
    ];

    await summarizeThread("t1", "acc-1", messages);

    const { userContent } = complete.mock.calls[0]![0] as never as { userContent: string };
    // Truncating front-to-back used to drop exactly the part that matters
    expect(userContent).toContain("NEWEST");
    expect(userContent).not.toContain("OLDEST");
  });

  it("records which message the stored summary covers", async () => {
    vi.mocked(getAiCache).mockResolvedValue(null);

    await summarizeThread("t1", "acc-1", [
      message("m1", 1000, "first"),
      message("m2", 2000, "second"),
    ]);

    expect(setAiCache).toHaveBeenCalledWith("acc-1", "t1", "summary_upto", "m2");
  });

  it("asks for the configured summary language", async () => {
    vi.mocked(getAiCache).mockResolvedValue(null);
    vi.mocked(getSetting).mockResolvedValue("Polish");

    await summarizeThread("t1", "acc-1", [message("m1", 1000, "hello")]);

    const { systemPrompt } = complete.mock.calls[0]![0] as never as { systemPrompt: string };
    expect(systemPrompt).toContain("Polish");
  });

  it("follows the thread's language when set to auto", async () => {
    vi.mocked(getAiCache).mockResolvedValue(null);
    vi.mocked(getSetting).mockResolvedValue("auto");

    await summarizeThread("t1", "acc-1", [message("m1", 1000, "hello")]);

    const { systemPrompt } = complete.mock.calls[0]![0] as never as { systemPrompt: string };
    expect(systemPrompt).toContain("same language as the thread");
  });

  it("returns empty for a thread with no messages", async () => {
    expect(await summarizeThread("t1", "acc-1", [])).toBe("");
  });
});
