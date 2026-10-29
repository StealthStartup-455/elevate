# Copilot instructions

Follow `AGENTS.md` and `CONTRIBUTING.md` in full. The git rules in `AGENTS.md` ("Git rules (mandatory)") are not optional.

Before any task, fetch `origin/dev` and read the newest entries in `exchange-floor/` (the shared log of AI-agent work, one file per entry); when you finish, add one new file there in your pull request. See "Exchange Floor (mandatory)" in `AGENTS.md`.

For any UI change, follow `STYLE_GUIDE.md` and the "UI and styling (mandatory)" section of `AGENTS.md`.

In short: work only on a branch named `<type>/<issue-number>-<short-description>` created from `origin/dev`, open pull requests into `dev`, and never push to or merge into `main`, `release` or `dev`.
