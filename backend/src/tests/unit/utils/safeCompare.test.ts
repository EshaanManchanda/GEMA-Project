import { safeEqual } from "../../../utils/safeCompare";

describe("safeEqual", () => {
  it("is true only for identical non-empty strings", () => {
    expect(safeEqual("s3cret-token", "s3cret-token")).toBe(true);
    expect(safeEqual("s3cret-token", "s3cret-tokeN")).toBe(false);
    expect(safeEqual("short", "a-much-longer-value")).toBe(false);
  });

  it("never throws on equal-length strings whose BYTE lengths differ", () => {
    // timingSafeEqual throws RangeError on unequal byte lengths; a multi-byte
    // character makes the string lengths match while the bytes do not.
    expect(() => safeEqual("éé", "ab")).not.toThrow();
    expect(safeEqual("éé", "ab")).toBe(false);
    expect(safeEqual("ab", "éé")).toBe(false);
    expect(safeEqual("日本語", "abc")).toBe(false);
    expect(safeEqual("😀", "ab")).toBe(false); // 2 UTF-16 units, 4 bytes
  });

  it("matches identical multi-byte strings", () => {
    expect(safeEqual("pässwörd-日本", "pässwörd-日本")).toBe(true);
  });

  it("rejects empty and non-string input instead of treating it as a match", () => {
    expect(safeEqual("", "")).toBe(false);
    expect(safeEqual("a", "")).toBe(false);
    expect(safeEqual(undefined, "a")).toBe(false);
    expect(safeEqual("a", undefined)).toBe(false);
    expect(safeEqual(null, null)).toBe(false);
    expect(safeEqual(["a"], "a")).toBe(false);
    expect(safeEqual({ a: 1 }, "[object Object]")).toBe(false);
  });
});
