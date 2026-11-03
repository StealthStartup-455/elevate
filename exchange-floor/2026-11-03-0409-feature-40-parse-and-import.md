# 2026-11-03 04:09 UTC: Restore missing lockfile dependencies

- **Developer:** @tyler0308gm
- **AI tool / model:** Codex
- **Issue / PR:** StealthStartup-455/elevate#40 / #141
- **Branch:** `feature/40-parse-and-import`
- **What the agent did:** Traced the npm ci failure to a526a97, which removed the @emnapi/core and @emnapi/runtime records added by c4a2082. Restored those exact 1.11.3 records.
- **Files touched:** `package-lock.json`, this Exchange Floor entry.
- **Decisions and why:** Kept the repair to the two missing transitive dependency records. Sharp's WASM package requires runtime; Tailwind's WASM package and napi-rs reference core and runtime. No direct dependencies or versions changed.
- **Gotchas:** npm ci validates the dependency graph even for optional packages. Re-running CI with the same lockfile cannot repair it. Local Node is 25.0.0 / npm 11.6.2; CI uses Node 24 as package.json requires.
- **Open follow-ups:** Run CI under Node 24 after pushing the fix; full clean installation was not performed locally.
- **Verification:** `npm ci --dry-run --ignore-scripts --offline --cache /private/tmp/elevate-npm-diagnosis-cache` failed before the repair and passed afterward (existing optional yaml peer and Node engine warnings remain). `npm run lint` passed. `git diff --check` passed. `npm run build` failed because Turbopack could not bind a worker port (Operation not permitted), including an escalated retry.
