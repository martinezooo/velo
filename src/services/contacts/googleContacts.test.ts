import { describe, it, expect } from "vitest";
import { realPhotoUrl, personEmails } from "./googleContacts";

describe("googleContacts", () => {
  it("takes a real photo", () => {
    expect(
      realPhotoUrl({ photos: [{ url: "https://lh3.googleusercontent.com/a/abc" }] }),
    ).toBe("https://lh3.googleusercontent.com/a/abc");
  });

  it("rejects Google's generic silhouette", () => {
    // Storing these would give every contact the same picture
    expect(
      realPhotoUrl({ photos: [{ url: "https://lh3.googleusercontent.com/x", default: true }] }),
    ).toBeNull();
  });

  it("prefers a real photo when both are offered", () => {
    expect(
      realPhotoUrl({
        photos: [
          { url: "https://lh3.googleusercontent.com/placeholder", default: true },
          { url: "https://lh3.googleusercontent.com/real" },
        ],
      }),
    ).toBe("https://lh3.googleusercontent.com/real");
  });

  it("returns null when there are no photos at all", () => {
    expect(realPhotoUrl({})).toBeNull();
    expect(realPhotoUrl({ photos: [] })).toBeNull();
    expect(realPhotoUrl({ photos: [{ default: true }] })).toBeNull();
  });

  it("normalises addresses so they match the contact book", () => {
    expect(
      personEmails({ emailAddresses: [{ value: "  Lia@Example.COM " }] }),
    ).toEqual(["lia@example.com"]);
  });

  it("keeps every address a person has", () => {
    expect(
      personEmails({
        emailAddresses: [{ value: "a@example.com" }, { value: "b@example.com" }],
      }),
    ).toEqual(["a@example.com", "b@example.com"]);
  });

  it("skips entries that are not addresses", () => {
    expect(personEmails({ emailAddresses: [{ value: "not-an-address" }, {}] })).toEqual([]);
    expect(personEmails({})).toEqual([]);
  });
});
