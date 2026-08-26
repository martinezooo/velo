import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchWithTimeout,
  isTimeoutError,
  RequestTimeoutError,
} from "./fetchWithTimeout";

describe("fetchWithTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns the response when the request settles in time", async () => {
    const response = new Response("ok");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(response)));

    await expect(fetchWithTimeout("https://example.test", {}, 1000)).resolves.toBe(
      response,
    );
  });

  it("rejects with a timeout error when the request never settles", async () => {
    // A socket that opens but never answers — the case navigator.onLine misses
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        }),
      ),
    );

    const promise = fetchWithTimeout("https://example.test", {}, 1000);
    const assertion = expect(promise).rejects.toBeInstanceOf(RequestTimeoutError);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it("aborts the underlying request when the deadline passes", async () => {
    let seenSignal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, options: RequestInit) => {
        seenSignal = options.signal ?? undefined;
        return new Promise(() => {});
      }),
    );

    void fetchWithTimeout("https://example.test", {}, 500).catch(() => {});
    await vi.advanceTimersByTimeAsync(500);

    expect(seenSignal?.aborted).toBe(true);
  });

  it("clears the timer once the request settles", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("ok"))));

    await fetchWithTimeout("https://example.test", {}, 1000);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("propagates a caller abort as-is rather than as a timeout", async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        }),
      ),
    );

    const promise = fetchWithTimeout(
      "https://example.test",
      { signal: controller.signal },
      10_000,
    );
    const assertion = expect(promise).rejects.not.toBeInstanceOf(RequestTimeoutError);
    controller.abort();
    await assertion;
  });

  it("recognises both timeout and abort errors", () => {
    const aborted = new Error("aborted");
    aborted.name = "AbortError";

    expect(isTimeoutError(new RequestTimeoutError("https://x.test", 1000))).toBe(true);
    expect(isTimeoutError(aborted)).toBe(true);
    expect(isTimeoutError(new Error("404 Not Found"))).toBe(false);
  });
});
