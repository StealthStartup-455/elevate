import { describe, expect, it } from "vitest";
import { commitUrl } from "./version";

describe("commitUrl", () => {
  it("links a commit to GitHub", () => {
    expect(commitUrl("abc1234def")).toBe("https://github.com/StealthStartup-455/elevate/commit/abc1234def");
  });

  it("gives no link without a real commit", () => {
    expect(commitUrl("")).toBeNull();
    expect(commitUrl("not-a-sha")).toBeNull();
  });
});
