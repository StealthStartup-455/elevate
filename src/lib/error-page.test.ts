import { describe, expect, it } from "vitest";
import { errorPageHelp } from "./error-page";

describe("errorPageHelp", () => {
  it("points to the error code when there is one", () => {
    expect(errorPageHelp("digest-from-the-log")).toBe(
      "Try again, and if it keeps happening, let us know the error code below.",
    );
  });

  it("doesn't mention a code when there is none", () => {
    for (const digest of [undefined, ""]) {
      const help = errorPageHelp(digest);
      expect(help).not.toMatch(/code/i);
      expect(help).toMatch(/try again/i);
    }
  });
});
