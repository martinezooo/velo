export type AiErrorCode =
  | "NOT_CONFIGURED"
  | "AUTH_ERROR"
  | "RATE_LIMITED"
  | "NETWORK_ERROR";

export class AiError extends Error {
  code: AiErrorCode;

  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = "AiError";
    this.code = code;
  }
}

/**
 * Turn a provider SDK error into a reason a reader can act on.
 *
 * SDKs flatten very different failures into similar-looking messages: a
 * withdrawn model, a rejected key, and an unreachable host all arrived as
 * "Connection error", which sent people looking at their network when the
 * model ID was the problem.
 */
export function describeProviderError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "Unknown error");
  const lower = raw.toLowerCase();

  if (lower.includes("is not found for api version")
    || lower.includes("model not found")
    || lower.includes("does not exist")
    || (lower.includes("404") && lower.includes("model"))) {
    return "That model is not available for this API key — pick another model above";
  }
  if (lower.includes("api key not valid") || lower.includes("api_key_invalid")) {
    return "The API key was rejected — check you pasted it in full";
  }
  if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("authentication")) {
    return "The API key was rejected";
  }
  if (lower.includes("permission") || lower.includes("403")) {
    return "This key lacks permission for that model";
  }
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("quota")) {
    return "Rate limit or quota reached — try again shortly";
  }
  if (lower.includes("timed out") || lower.includes("timeout") || lower.includes("aborted")) {
    return "The provider did not respond in time";
  }
  if (lower.includes("failed to fetch")
    || lower.includes("networkerror")
    || lower.includes("enotfound")
    || lower.includes("connection error")) {
    return "Could not reach the provider — check your connection";
  }
  return raw.length > 160 ? raw.slice(0, 160) + "…" : raw;
}
