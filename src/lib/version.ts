// The running build's version, set at build time by next.config.ts from
// scripts/app-version.mjs (#43). Shown on the desk, in About on /me (#103) and
// at /api/version, and added to every log line, so any screen, check or log
// points to one commit.

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown";
export const COMMIT_SHA = process.env.NEXT_PUBLIC_COMMIT_SHA ?? "";
export const BUILT_AT = process.env.NEXT_PUBLIC_BUILD_TIME ?? "";

const REPOSITORY = "https://github.com/StealthStartup-455/elevate";

// The commit on GitHub, or null when the build doesn't know its commit.
export function commitUrl(sha: string = COMMIT_SHA): string | null {
  return /^[0-9a-f]{7,40}$/.test(sha) ? `${REPOSITORY}/commit/${sha}` : null;
}
