import { describe, it, expect } from "vitest";
import { parseAddressList } from "./contactHarvest";

describe("parseAddressList", () => {
  it("extracts the address from a display-name header", () => {
    expect(parseAddressList("Lia Giarleli <lia@example.com>")).toEqual([
      "lia@example.com",
    ]);
  });

  it("splits a multi-recipient header", () => {
    expect(
      parseAddressList("A <a@example.com>, b@example.com, C <c@example.com>"),
    ).toEqual(["a@example.com", "b@example.com", "c@example.com"]);
  });

  it("lowercases so the same person is one contact", () => {
    expect(parseAddressList("Marcin@Example.COM")).toEqual(["marcin@example.com"]);
  });

  it("drops automated senders that nobody replies to", () => {
    expect(parseAddressList("noreply@github.com")).toEqual([]);
    expect(parseAddressList("no-reply@services.ovh.com")).toEqual([]);
    expect(parseAddressList("bounces+123@mailer.example")).toEqual([]);
    expect(parseAddressList("mailer-daemon@example.com")).toEqual([]);
  });

  it("keeps real people whose name merely resembles a filter", () => {
    // "norbert" starts with "no" but is not "noreply"
    expect(parseAddressList("norbert@example.com")).toEqual(["norbert@example.com"]);
  });

  it("ignores entries that are not addresses", () => {
    expect(parseAddressList("undisclosed-recipients:;")).toEqual([]);
    expect(parseAddressList(null)).toEqual([]);
    expect(parseAddressList("")).toEqual([]);
  });
});
