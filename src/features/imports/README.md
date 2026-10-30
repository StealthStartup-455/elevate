# imports

The checker for Rock Gym Pro (RGP) exports (#40). It reads a gym's RGP files, cleans the values, maps RGP's columns to Elevate's fields, links parents and visit counts, flags problems, and reports each person as ready, needs review or can't import.

It **saves nothing**. It never writes to the database. Saving the ready records is #41.

Only RGP exports are supported for now. Our team runs it from the command line; gym staff don't see it, and there is no page.

**Owner:** Tyler Le

## Folder shape

Planned files. Each step of #40 adds one or two, each with its own `*.test.ts`.

```
features/imports/
├── types.ts         # shared types: tables, people, passes, issues, the report
├── parse.ts         # reads CSV text into a table of rows
├── cards.ts         # refuses any file with a full card number
├── dates.ts         # reads dates, deciding day/month order once per column
├── clean.ts         # cleans phones, emails, names and yes/no values
├── rgp-mapping.ts   # which RGP column goes to which Elevate field
├── build.ts         # turns RGP rows into people and passes
├── check.ts         # flags problems with each person
├── links.ts         # links children to parents
├── match.ts         # flags possible duplicates, never merges
├── dry-run.ts       # runs every step and builds the report
├── report-csv.ts    # writes the report's issues as a CSV
└── fixtures/        # fake RGP files for the tests
```

The functions take everything as arguments (file text, existing climbers, answers, `now`) and return results. They don't read files, env variables, the database or the clock themselves.

## Fixtures

`fixtures/` is fake data only. Never put a real gym's file in this repo.

`fixtures/README.md` lists the expected result for every row. It is the spec for the tests.
