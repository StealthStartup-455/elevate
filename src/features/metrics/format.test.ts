import { describe, expect, it } from "vitest";
import { formatDuration, formatShare, plural, reasonLabel } from "./format";

describe("metrics formatting", () => {
  it("writes durations the way staff read them", () => {
    expect(formatDuration(null)).toBe("None yet");
    expect(formatDuration(3240)).toBe("3.2 s");
    expect(formatDuration(45_400)).toBe("45 s");
    expect(formatDuration(125_000)).toBe("2 min 5 s");
    expect(formatDuration(120_000)).toBe("2 min");
  });

  it("writes shares as whole percentages", () => {
    expect(formatShare(null)).toBe("None yet");
    expect(formatShare(0.375)).toBe("38%");
  });

  it("uses the singular for one (Khanh's review)", () => {
    expect(plural(1, "try", "tries")).toBe("1 try");
    expect(plural(0, "try", "tries")).toBe("0 tries");
    expect(plural(3, "try", "tries")).toBe("3 tries");
  });

  it("names reasons in words", () => {
    expect(reasonLabel("waiver_missing")).toBe("No waiver");
    expect(reasonLabel("something_new")).toBe("something new");
  });
});
