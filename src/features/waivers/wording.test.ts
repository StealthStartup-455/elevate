import { describe, expect, it } from "vitest";
import { MAX_CLAUSES, nextVersion, parseWaiverWording } from "./wording";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const GOOD = {
  title: "Release of liability",
  body: "Climbing is dangerous.\n\nRead this before you sign.",
  clauses: "I understand the risks.\nI will follow the rules.",
  confirm: "on",
};

describe("parseWaiverWording", () => {
  it("accepts a title, text and rules", () => {
    expect(parseWaiverWording(form(GOOD))).toEqual({
      ok: true,
      value: {
        title: "Release of liability",
        body: "Climbing is dangerous.\n\nRead this before you sign.",
        clauses: ["I understand the risks.", "I will follow the rules."],
      },
    });
  });

  it("tidies spaces and Windows line ends, so the same text always hashes the same", () => {
    const result = parseWaiverWording(
      form({
        ...GOOD,
        title: "  Release   of liability ",
        body: "Climbing  is\r\ndangerous.\r\n\r\n\r\n  Read this before you sign. ",
        clauses: "\r\n I understand the risks. \r\n\r\nI will follow the rules.\r\n",
      }),
    );
    expect(result.ok && result.value).toEqual({
      title: "Release of liability",
      body: "Climbing is dangerous.\n\nRead this before you sign.",
      clauses: ["I understand the risks.", "I will follow the rules."],
    });
  });

  it("allows no rules", () => {
    const result = parseWaiverWording(form({ ...GOOD, clauses: " \n " }));
    expect(result.ok && result.value.clauses).toEqual([]);
  });

  it("needs a title, text and the confirmation", () => {
    const result = parseWaiverWording(form({ title: " ", body: "\n\n", clauses: "" }));
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(["body", "confirm", "title"]);
  });

  it("limits the number and length of rules", () => {
    const many = Array.from({ length: MAX_CLAUSES + 1 }, (_, i) => `Rule ${i}`).join("\n");
    const tooMany = parseWaiverWording(form({ ...GOOD, clauses: many }));
    expect(!tooMany.ok && tooMany.errors.clauses).toMatch(/at most/);
    const tooLong = parseWaiverWording(form({ ...GOOD, clauses: "x".repeat(301) }));
    expect(!tooLong.ok && tooLong.errors.clauses).toMatch(/under 300/);
  });
});

describe("nextVersion", () => {
  it("counts up from the highest vN", () => {
    expect(nextVersion([])).toBe("v1");
    expect(nextVersion(["v1"])).toBe("v2");
    expect(nextVersion(["v2", "v10", "v3"])).toBe("v11");
  });

  it("skips versions that aren't vN, such as imported ones", () => {
    expect(nextVersion(["rgp-2024", "v1"])).toBe("v2");
  });
});
