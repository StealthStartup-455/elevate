# imports

The checker for Rock Gym Pro (RGP) exports (#40). It reads a gym's RGP files, cleans the values, maps RGP's columns to Elevate's fields, links parents and visit counts, flags problems, and reports each person as ready, needs review or can't import.

It **saves nothing**. It never writes to the database. Saving the ready records is #41.

Only RGP exports are supported for now. Our team runs it from the command line; gym staff don't see it, and there is no page.

**Owner:** Tyler Le

## Folder shape

Each file has its own `*.test.ts`.

```
features/imports/
├── types.ts         # shared types: tables, people, passes, issues, the report
├── parse.ts         # reads CSV text into a table of rows (Papa Parse)
├── cards.ts         # refuses any file with a full card number
├── dates.ts         # reads dates, deciding day/month order once per column
├── clean.ts         # cleans phones, emails, names and yes/no values
├── rgp-mapping.ts   # which RGP column goes to which Elevate field
└── fixtures/        # fake RGP files for the tests
```

Still to come in #40: `build.ts` (RGP rows to people and passes), `check.ts` (problems with each person), `links.ts` (children to parents), `match.ts` (possible duplicates, never merged), `dry-run.ts` (runs every step, builds the report), `report-csv.ts` (the report as a CSV), and the `npm run import:check` command.

The functions take everything as arguments (file text, existing climbers, answers, `now`) and return results. They don't read files, env variables, the database or the clock themselves.

## Rules it follows

- **Never guess.** A date like `03/04/1996` could be March 4 or April 3. The order is decided once per column, or the gym tells us (`Answers.dateOrder`); until then the date is "ambiguous" and the person goes to review. Unknown belay labels stay unknown the same way.
- **No card numbers.** One full card number anywhere refuses the whole file. The message names the column, never the number.
- **A bad value doesn't block the row.** A phone or email that doesn't look right is left out with a warning.

## Fixtures

`fixtures/` is fake data only. Never put a real gym's file in this repo.

`fixtures/README.md` lists the expected result for every row. It is the spec for the tests.
