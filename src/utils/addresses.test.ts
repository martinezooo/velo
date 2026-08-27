import { describe, it, expect } from "vitest";
import {
  extractAddress,
  splitAddressList,
  withoutOwnAddresses,
  buildReferences,
} from "./addresses";

describe("extractAddress", () => {
  it("pulls the address out of a display-name header", () => {
    expect(extractAddress("Marcin Bortkiewicz <mbortki3wicz@gmail.com>")).toBe(
      "mbortki3wicz@gmail.com",
    );
    expect(extractAddress('"talents@eurodyn.com" <talents@eurodyn.com>')).toBe(
      "talents@eurodyn.com",
    );
  });

  it("accepts a bare address and normalises case", () => {
    expect(extractAddress("  Lia.Giarleli@Eurodyn.com ")).toBe("lia.giarleli@eurodyn.com");
  });
});

describe("withoutOwnAddresses", () => {
  it("removes the reader even when the header carries a display name", () => {
    // The exact bug: the account knows "me@x", the header says "Me <me@x>"
    const entries = [
      "Lia.Giarleli@eurodyn.com",
      "Marcin Bortkiewicz <mbortki3wicz@gmail.com>",
    ];
    expect(withoutOwnAddresses(entries, ["mbortki3wicz@gmail.com"])).toEqual([
      "Lia.Giarleli@eurodyn.com",
    ]);
  });

  it("matches regardless of case", () => {
    expect(withoutOwnAddresses(["ME@Example.com"], ["me@example.com"])).toEqual([]);
  });

  it("removes every one of the reader's addresses", () => {
    const entries = ["a@x.com", "Me <me@x.com>", "alias@x.com"];
    expect(withoutOwnAddresses(entries, ["me@x.com", "alias@x.com"])).toEqual(["a@x.com"]);
  });

  it("drops duplicates that differ only by display name", () => {
    const entries = ["Lia <lia@x.com>", "lia@x.com"];
    expect(withoutOwnAddresses(entries, [])).toEqual(["Lia <lia@x.com>"]);
  });

  it("keeps everyone when the reader is not among them", () => {
    const entries = ["a@x.com", "B <b@x.com>"];
    expect(withoutOwnAddresses(entries, ["me@x.com"])).toEqual(entries);
  });

  it("tolerates a missing own address", () => {
    expect(withoutOwnAddresses(["a@x.com"], [null, undefined])).toEqual(["a@x.com"]);
  });
});

describe("splitAddressList", () => {
  it("splits and trims, keeping display names", () => {
    expect(splitAddressList("A <a@x.com>, b@x.com")).toEqual(["A <a@x.com>", "b@x.com"]);
  });

  it("returns nothing for empty input", () => {
    expect(splitAddressList(null)).toEqual([]);
    expect(splitAddressList("")).toEqual([]);
  });
});

describe("buildReferences", () => {
  it("appends the parent to its own chain", () => {
    expect(buildReferences("<c@mail>", "<a@mail> <b@mail>")).toBe(
      "<a@mail> <b@mail> <c@mail>",
    );
  });

  it("starts the chain when the parent had none", () => {
    expect(buildReferences("<c@mail>", null)).toBe("<c@mail>");
  });

  it("returns null when the parent carried no Message-ID", () => {
    // Better no header than a fabricated one: a wrong ID threads worse
    expect(buildReferences(null, "<a@mail>")).toBeNull();
    expect(buildReferences(undefined, undefined)).toBeNull();
  });
});
