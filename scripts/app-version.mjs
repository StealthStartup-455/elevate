#!/usr/bin/env node
// The app's version, worked out from git so nobody types it (#43).
//
//   v1.0.0+def5678              exactly on the release tag v1.0.0
//   v1.0.1-dev.23+abc1234       23 commits after v1.0.0 (pre-release of the next patch)
//   v0.1.0-dev.23+abc1234       no release tag yet: 23 commits, pre-release of package.json's version
//   v0.1.0-dev.23+abc1234.local built on a laptop or in CI, not deployed
//   v0.1.0+unknown              no git (should not happen; the deploy passes the version in)
//
// Semantic Versioning 2.0: after "-" is a pre-release, after "+" build info.
// Builds after a release count toward the NEXT patch, so versions sort in
// order: v1.0.0 < v1.0.1-dev.3 < v1.0.1-dev.23 < v1.0.1.
//
// Used by next.config.ts (every build), the Deploy staging workflow and
// scripts/staging-setup.mjs (deployed builds pass it to Vercel, whose builder
// has no .git folder).
//
//   node scripts/app-version.mjs                 JSON, marked .local
//   node scripts/app-version.mjs --deployed      JSON, not marked .local
//   node scripts/app-version.mjs --deployed --github-output
//                                                also writes version, commit and
//                                                built_at to $GITHUB_OUTPUT

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const RELEASE_TAG = "v[0-9]*.[0-9]*.[0-9]*";
const DESCRIBE = /^v(\d+)\.(\d+)\.(\d+)-(\d+)-g[0-9a-f]+$/;

/**
 * Reads `git describe --long` output such as "v1.0.0-23-gabc1234".
 * @param {string} text
 * @returns {{ major: number, minor: number, patch: number, distance: number } | null}
 */
export function parseDescribe(text) {
  const m = DESCRIBE.exec(text.trim());
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], distance: +m[4] };
}

/**
 * Builds the version string. `tag` is the latest release tag (null if none
 * yet), `base` the package.json version used when there is no tag.
 * @param {{ tag: { major: number, minor: number, patch: number } | null, base: string, distance: number, sha: string | null, local: boolean }} parts
 * @returns {string}
 */
export function formatVersion({ tag, base, distance, sha, local }) {
  const build = (sha ? sha.slice(0, 7) : "unknown") + (local ? ".local" : "");
  if (!sha) return `v${base}+${build}`;
  if (tag && distance === 0) return `v${tag.major}.${tag.minor}.${tag.patch}+${build}`;
  const next = tag ? `${tag.major}.${tag.minor}.${tag.patch + 1}` : base;
  return `v${next}-dev.${distance}+${build}`;
}

function packageVersion() {
  return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

/**
 * The version of the checked-out commit. `run` is swappable for tests.
 * @param {{ local: boolean, run?: (args: string[]) => string, base?: string, now?: Date }} options
 * @returns {{ version: string, commit: string, builtAt: string }}
 */
export function gitVersion({ local, run = git, base = packageVersion(), now = new Date() }) {
  const builtAt = now.toISOString();
  let sha = null;
  try {
    sha = run(["rev-parse", "HEAD"]);
  } catch {
    return { version: formatVersion({ tag: null, base, distance: 0, sha: null, local }), commit: "", builtAt };
  }
  let tag = null;
  let distance = 0;
  try {
    const parsed = parseDescribe(run(["describe", "--tags", "--long", "--abbrev=7", "--match", RELEASE_TAG]));
    if (parsed) ({ distance, ...tag } = parsed);
  } catch {
    // No release tag yet.
  }
  if (!tag) distance = Number(run(["rev-list", "--count", "HEAD"])) || 0;
  return { version: formatVersion({ tag, base, distance, sha, local }), commit: sha, builtAt };
}

/**
 * For next.config.ts: the version a deploy passed in, or this checkout's
 * version marked .local.
 * @returns {{ version: string, commit: string, builtAt: string }}
 */
export function appVersion(env = process.env) {
  if (env.NEXT_PUBLIC_APP_VERSION) {
    return {
      version: env.NEXT_PUBLIC_APP_VERSION,
      commit: env.NEXT_PUBLIC_COMMIT_SHA ?? "",
      builtAt: env.NEXT_PUBLIC_BUILD_TIME ?? new Date().toISOString(),
    };
  }
  return gitVersion({ local: true });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = new Set(process.argv.slice(2));
  const result = gitVersion({ local: !args.has("--deployed") });
  if (args.has("--github-output")) {
    if (!process.env.GITHUB_OUTPUT) throw new Error("--github-output needs GITHUB_OUTPUT");
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `version=${result.version}\ncommit=${result.commit}\nbuilt_at=${result.builtAt}\n`,
    );
  }
  console.log(JSON.stringify(result));
}
