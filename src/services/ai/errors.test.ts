import { describe, it, expect } from "vitest";
import { describeProviderError } from "./errors";

describe("describeProviderError", () => {
  it("names a withdrawn model rather than blaming the network", () => {
    // The exact message Google returns for a retired preview alias
    const raw =
      "[GoogleGenerativeAI Error]: models/gemini-2.5-flash-preview-05-20 is not " +
      "found for API version v1beta, or is not supported for generateContent.";
    expect(describeProviderError(new Error(raw))).toContain("not available for this API key");
  });

  it("distinguishes a rejected key from an unreachable host", () => {
    expect(describeProviderError(new Error("API key not valid. Please pass a valid API key."))).toContain(
      "rejected",
    );
    expect(describeProviderError(new Error("Failed to fetch"))).toContain("Could not reach");
  });

  it("still reports a genuine connection failure as one", () => {
    expect(describeProviderError(new Error("Connection error."))).toContain("Could not reach");
  });

  it("recognises quota and permission failures", () => {
    expect(describeProviderError(new Error("429 rate limit exceeded"))).toContain("Rate limit");
    expect(describeProviderError(new Error("403 permission denied"))).toContain("permission");
  });

  it("recognises timeouts", () => {
    expect(describeProviderError(new Error("request timed out"))).toContain("did not respond");
  });

  it("passes an unrecognised message through, truncated", () => {
    expect(describeProviderError(new Error("something odd"))).toBe("something odd");
    const long = "y".repeat(200);
    const described = describeProviderError(new Error(long));
    expect(described.length).toBeLessThanOrEqual(161);
    expect(described.endsWith("…")).toBe(true);
  });
});
