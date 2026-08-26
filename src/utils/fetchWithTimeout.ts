/**
 * Network calls that cannot hang forever.
 *
 * `navigator.onLine` only reports whether an interface exists, so it stays true
 * on a captive portal, a dropped VPN, or a router with no route upstream. In
 * those cases a plain `fetch` opens a socket and simply never settles — the
 * sync bar sits at "Syncing…" indefinitely with nothing to click. Bounding
 * every request turns that silence into an error the caller can report and
 * retry.
 */

/** Default ceiling for a single request. */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Thrown when a request exceeds its deadline. */
export class RequestTimeoutError extends Error {
  readonly isTimeout = true;

  constructor(url: string, timeoutMs: number) {
    super(`Request timed out after ${Math.round(timeoutMs / 1000)}s: ${url}`);
    this.name = "RequestTimeoutError";
  }
}

/** True when the error came from a request deadline rather than the server. */
export function isTimeoutError(err: unknown): boolean {
  return err instanceof RequestTimeoutError
    || (err instanceof Error && err.name === "AbortError");
}

/**
 * `fetch` with a deadline. Honours an AbortSignal the caller already passed,
 * so cancelling a sync still cancels its in-flight request.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const callerSignal = options.signal;
  const onCallerAbort = () => controller.abort();
  callerSignal?.addEventListener("abort", onCallerAbort);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    // An abort here is our deadline unless the caller cancelled first
    if (err instanceof Error && err.name === "AbortError" && !callerSignal?.aborted) {
      throw new RequestTimeoutError(url, timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", onCallerAbort);
  }
}
