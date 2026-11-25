import { describe, expect, it } from "vitest";
import { labelKey, MAX_LABEL_LENGTH, normalizeLabelName } from "./validate";

describe("normalizeLabelName", () => {
  it("trims the ends and makes runs of spaces one", () => {
    expect(normalizeLabelName("  Must   retest  belay ")).toEqual({
      ok: true,
      name: "Must retest belay",
      key: "must retest belay",
    });
  });

  it("keeps the case staff typed, but the key is lower case", () => {
    const a = normalizeLabelName("Ask for ID");
    const b = normalizeLabelName("  ask FOR id ");
    expect(a).toMatchObject({ ok: true, name: "Ask for ID" });
    expect(b).toMatchObject({ ok: true, name: "ask FOR id" });
    // The same key, so the second is a duplicate of the first.
    expect(a.ok && b.ok && a.key === b.key).toBe(true);
  });

  it("refuses an empty name", () => {
    for (const raw of ["", "   ", null, undefined]) {
      expect(normalizeLabelName(raw)).toEqual({ ok: false, message: "Type a label name." });
    }
  });

  it(`allows ${MAX_LABEL_LENGTH} characters and refuses more`, () => {
    expect(normalizeLabelName("a".repeat(MAX_LABEL_LENGTH)).ok).toBe(true);
    expect(normalizeLabelName("a".repeat(MAX_LABEL_LENGTH + 1))).toEqual({
      ok: false,
      message: "Keep labels to 30 characters or fewer.",
    });
  });

  it("counts the length after tidying spaces", () => {
    // 31 characters as typed, 29 once the double spaces are one.
    expect(normalizeLabelName(`${"a".repeat(14)}   ${"b".repeat(14)}`).ok).toBe(true);
  });

  it("counts an emoji as one character", () => {
    expect(normalizeLabelName("🧗".repeat(MAX_LABEL_LENGTH)).ok).toBe(true);
  });

  it("refuses tabs, line breaks and other control characters inside the name", () => {
    for (const raw of ["Ask\tfor ID", "Ask\nfor ID", "Ask\u0000ID", "Ask\u007fID"]) {
      expect(normalizeLabelName(raw).ok).toBe(false);
    }
  });

  it("drops a line break at the very end, as a paste often has", () => {
    expect(normalizeLabelName("Ask for ID\n")).toMatchObject({ ok: true, name: "Ask for ID" });
  });

  it("treats a composed and a decomposed accent as the same name", () => {
    const composed = normalizeLabelName("Café");
    const decomposed = normalizeLabelName("Café");
    expect(composed.ok && decomposed.ok && composed.key === decomposed.key).toBe(true);
  });
});

describe("labelKey", () => {
  it("is the name in lower case", () => {
    expect(labelKey("Ask for ID")).toBe("ask for id");
  });
});
