import { describe, it, expect, beforeEach } from "vitest";
import { useAiStatusStore, runAiTask, describeAiError } from "./aiStatusStore";

describe("aiStatusStore", () => {
  beforeEach(() => {
    useAiStatusStore.setState({ running: 0, currentLabel: null, lastError: null });
  });

  it("reports a task as running while it is in flight", async () => {
    let release: (v: string) => void = () => {};
    const task = runAiTask("Summarising thread", () =>
      new Promise<string>((resolve) => { release = resolve; }),
    );

    expect(useAiStatusStore.getState().running).toBe(1);
    expect(useAiStatusStore.getState().currentLabel).toBe("Summarising thread");

    release("done");
    await task;

    expect(useAiStatusStore.getState().running).toBe(0);
    expect(useAiStatusStore.getState().currentLabel).toBeNull();
  });

  it("records a readable failure and stops counting the task as running", async () => {
    await expect(
      runAiTask("Summarising thread", () => Promise.reject(new Error("429 rate limit"))),
    ).rejects.toThrow();

    const state = useAiStatusStore.getState();
    expect(state.running).toBe(0);
    expect(state.lastError?.label).toBe("Summarising thread");
    expect(state.lastError?.message).toContain("Rate limit");
  });

  it("clears a previous failure when a new attempt starts", async () => {
    await expect(
      runAiTask("Summarising thread", () => Promise.reject(new Error("boom"))),
    ).rejects.toThrow();
    expect(useAiStatusStore.getState().lastError).not.toBeNull();

    await runAiTask("Summarising thread", () => Promise.resolve("ok"));
    expect(useAiStatusStore.getState().lastError).toBeNull();
  });

  it("tracks concurrent tasks without dropping below zero", async () => {
    const first = runAiTask("A", () => Promise.resolve(1));
    const second = runAiTask("B", () => Promise.resolve(2));
    await Promise.all([first, second]);

    expect(useAiStatusStore.getState().running).toBe(0);
  });

  it("translates provider errors into reader-facing text", () => {
    expect(describeAiError(new Error("401 unauthorized"))).toContain("API key");
    expect(describeAiError(new Error("request timed out"))).toContain("did not respond");
    expect(describeAiError(new Error("Failed to fetch"))).toContain("connection");
    expect(describeAiError(new Error("no provider configured"))).toContain("Settings");
  });

  it("keeps an unrecognised error, truncated", () => {
    const long = "x".repeat(200);
    const described = describeAiError(new Error(long));
    expect(described.length).toBeLessThanOrEqual(121);
    expect(described.endsWith("…")).toBe(true);
  });
});
