# 2026-10-29 05:34 UTC: Exchange Floor becomes one file per entry

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#102 / PR pending
- **Branch:** `docs/102-exchange-floor-entries`
- **What the agent did:**
  - New `exchange-floor/` folder: `README.md` (before and after a task, rules, template) and this entry as the first file.
  - `EXCHANGE_FLOOR.md` is now a read-only archive: its "How to use it" section is replaced by a pointer to the folder; the Active work table and the old template are marked frozen; every past entry is unchanged.
  - Updated the rule everywhere it was written: `AGENTS.md` ("Exchange Floor (mandatory)"), `CONTRIBUTING.md`, `.github/pull_request_template.md`, `.github/copilot-instructions.md`, `.cursor/rules/exchange-floor.mdc`. `CLAUDE.md` and `GEMINI.md` load `AGENTS.md`, so they follow.
- **Files touched:** `exchange-floor/`, `EXCHANGE_FLOOR.md`, `AGENTS.md`, `CONTRIBUTING.md`, `.github/pull_request_template.md`, `.github/copilot-instructions.md`, `.cursor/rules/exchange-floor.mdc`
- **Decisions and why:**
  - One file per entry, named `YYYY-MM-DD-HHMM-<branch>.md` (UTC): two pull requests never touch the same file, and `sort | tail` gives the newest.
  - The Active work table is dropped, not moved: open pull requests already show active work, and the table drifted (rows stayed "In review" after merging). It was also the other conflict hotspot.
  - The old file stays in place rather than being split into files, so history and links to it keep working.
  - An author may update their own entry while the branch is open (for example the verification after a review fix); merged entries are fixed.
- **Gotchas:** Open PRs that already added an entry to `EXCHANGE_FLOOR.md` (#79, #81, #82, #100 at the time of writing) still conflict with each other there until their entry moves into `exchange-floor/`.
- **Open follow-ups:** Move those PRs' entries into the folder. Optional: a CI check that fails a PR adding lines to `EXCHANGE_FLOOR.md`.
- **Verification:** `npm run lint` clean (docs only, no code changed). Conflict test: from this branch, two scratch branches each added a different file in `exchange-floor/`; merging both into a third branch gave no conflict. The same test on `EXCHANGE_FLOOR.md` (two entries added at the top) conflicts, as before.
