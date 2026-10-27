import { describe, expect, it } from "vitest";
import { formatVersion, gitVersion, parseDescribe } from "../../scripts/app-version.mjs";

const SHA = "abc1234def5678abc1234def5678abc1234def56";
const NOW = new Date("2026-10-27T05:00:00.000Z");

// A fake git: answers each command, or throws like git does when there's no tag.
function fakeGit(answers: Record<string, string | Error>) {
  return (args: string[]) => {
    const answer = answers[args[0]];
    if (answer === undefined || answer instanceof Error) throw answer ?? new Error("no");
    return answer;
  };
}

describe("parseDescribe", () => {
  it("reads the tag and the commits since it", () => {
    expect(parseDescribe("v1.2.3-23-gabc1234")).toEqual({ major: 1, minor: 2, patch: 3, distance: 23 });
  });

  it("ignores anything that isn't a release tag", () => {
    expect(parseDescribe("nightly-4-gabc1234")).toBeNull();
    expect(parseDescribe("v1.2-4-gabc1234")).toBeNull();
  });
});

describe("formatVersion", () => {
  const tag = { major: 1, minor: 0, patch: 0 };

  it("is the bare release on the tagged commit", () => {
    expect(formatVersion({ tag, base: "0.1.0", distance: 0, sha: SHA, local: false })).toBe("v1.0.0+abc1234");
  });

  it("counts commits after a release toward the next patch", () => {
    expect(formatVersion({ tag, base: "0.1.0", distance: 23, sha: SHA, local: false })).toBe(
      "v1.0.1-dev.23+abc1234",
    );
  });

  it("uses package.json's version before the first release tag", () => {
    expect(formatVersion({ tag: null, base: "0.1.0", distance: 23, sha: SHA, local: false })).toBe(
      "v0.1.0-dev.23+abc1234",
    );
  });

  it("marks builds that weren't deployed", () => {
    expect(formatVersion({ tag, base: "0.1.0", distance: 23, sha: SHA, local: true })).toBe(
      "v1.0.1-dev.23+abc1234.local",
    );
  });

  it("has no spaces or brackets", () => {
    const version = formatVersion({ tag, base: "0.1.0", distance: 5, sha: SHA, local: true });
    expect(version).toMatch(/^[0-9A-Za-z.+-]+$/);
  });
});

describe("gitVersion", () => {
  it("uses the latest release tag", () => {
    const run = fakeGit({ "rev-parse": SHA, describe: "v1.0.0-23-gabc1234" });
    expect(gitVersion({ local: false, run, base: "0.1.0", now: NOW })).toEqual({
      version: "v1.0.1-dev.23+abc1234",
      commit: SHA,
      builtAt: "2026-10-27T05:00:00.000Z",
    });
  });

  it("counts every commit when there is no tag yet", () => {
    const run = fakeGit({ "rev-parse": SHA, describe: new Error("no tags"), "rev-list": "120" });
    expect(gitVersion({ local: false, run, base: "0.1.0", now: NOW }).version).toBe("v0.1.0-dev.120+abc1234");
  });

  it("still gives a version without git", () => {
    const run = fakeGit({});
    expect(gitVersion({ local: true, run, base: "0.1.0", now: NOW })).toMatchObject({
      version: "v0.1.0+unknown.local",
      commit: "",
    });
  });
});
