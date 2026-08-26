import { describe, it, expect } from "vitest";
import {
  domainOf,
  domainIconIsMeaningful,
  getSenderDomainIconUrl,
} from "./senderIcon";

describe("senderIcon", () => {
  it("takes the domain from an address", () => {
    expect(domainOf("no-reply@hackerone.com")).toBe("hackerone.com");
    expect(domainOf("Hello@News.Caido.IO")).toBe("news.caido.io");
  });

  it("returns null for anything that is not an address", () => {
    expect(domainOf(null)).toBeNull();
    expect(domainOf("not-an-address")).toBeNull();
    expect(domainOf("trailing@")).toBeNull();
  });

  it("uses an organisation icon for company senders", () => {
    expect(getSenderDomainIconUrl("no-reply@hackerone.com")).toBe(
      "https://icons.duckduckgo.com/ip3/hackerone.com.ico",
    );
    expect(getSenderDomainIconUrl("support@services.ovhcloud.com")).toContain(
      "services.ovhcloud.com",
    );
  });

  it("refuses consumer mail domains, whose icon identifies the provider", () => {
    // Otherwise every Gmail correspondent would wear the same picture
    expect(domainIconIsMeaningful("marcin@gmail.com")).toBe(false);
    expect(domainIconIsMeaningful("someone@outlook.com")).toBe(false);
    expect(domainIconIsMeaningful("ktos@wp.pl")).toBe(false);
    expect(getSenderDomainIconUrl("marcin@gmail.com")).toBeNull();
  });

  it("treats a company on its own domain as meaningful", () => {
    expect(domainIconIsMeaningful("lia@eurodyn.com")).toBe(true);
  });

  it("rejects malformed input rather than building a bad URL", () => {
    expect(getSenderDomainIconUrl(null)).toBeNull();
    expect(getSenderDomainIconUrl("nodomain")).toBeNull();
    expect(getSenderDomainIconUrl("user@localhost")).toBeNull();
  });
});
