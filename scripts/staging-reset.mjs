#!/usr/bin/env node
// Resets a hosted Elevate demo to the seed before a demo or feedback session
// (#138): removes every climber added since the last seed (with their passes,
// waivers, sales, check ins and scans) and puts the seeded ones back. It is
// prisma/seed.ts against the hosted database, with the checks staging:setup
// does on the URL. See DEPLOYMENT.md, "Reset before a demo".
//
//   npm run staging:reset
//
// The session pooler URL can come from STAGING_SESSION_URL instead of the
// prompt. It goes to the seed through its environment, never on a command
// line, and is never printed. Refuses to run with APP_ENV=production.
//
// The seed also links climber@elevate.test to its climber again, but only
// with the staging project's STAGING_SUPABASE_URL and STAGING_SECRET_KEY (and
// SEED_LOGIN_PASSWORD). Without them the Supabase values in your .env are
// blanked, so a local project's keys never make logins against staging data.

import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";

function fail(text) {
  console.error(`\nStopped: ${text}`);
  process.exit(1);
}

if (process.env.APP_ENV === "production") {
  fail("APP_ENV is production. This resets the demo with fictional data only.");
}

let sessionUrl = process.env.STAGING_SESSION_URL?.trim();
if (!sessionUrl) {
  console.log("Elevate staging reset. Every climber added since the last seed is deleted.");
  console.log("Paste the staging Session pooler URL (Supabase, Connect), password filled in.");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  sessionUrl = (await rl.question("> ")).trim();
  rl.close();
}
if (!sessionUrl) fail("The session pooler URL is required.");

let session;
try {
  session = new URL(sessionUrl);
} catch {
  fail("The session pooler URL is not a valid URL.");
}
if (sessionUrl.includes("[YOUR-PASSWORD]")) {
  fail("Replace [YOUR-PASSWORD] in the URL with the database password.");
}
if (session.hostname.startsWith("db.")) {
  fail("That is Supabase's direct connection, which is IPv6 only. Use the Session pooler URL.");
}
if (session.port !== "5432") {
  console.warn("Warning: the session pooler URL usually uses port 5432.");
}

const supabaseUrl = process.env.STAGING_SUPABASE_URL?.trim() ?? "";
const secretKey = process.env.STAGING_SECRET_KEY?.trim() ?? "";
const linksLogins = Boolean(supabaseUrl && secretKey && process.env.SEED_LOGIN_PASSWORD);

console.log("\n== Resetting to the seed");
const result = spawnSync("npx tsx prisma/seed.ts", {
  shell: true, // needed for npx on Windows
  stdio: "inherit",
  // Set even when empty: dotenv in the seed never overrides a variable that is set.
  env: {
    ...process.env,
    DATABASE_URL: sessionUrl,
    NEXT_PUBLIC_SUPABASE_URL: linksLogins ? supabaseUrl : "",
    SUPABASE_SECRET_KEY: linksLogins ? secretKey : "",
  },
});
if (result.status !== 0) fail("the seed did not finish. Nothing was changed if it stopped before the summary.");

console.log("\nDone. Anyone still signed in as a removed climber is sent back to log in.");
if (!linksLogins) {
  console.log("climber@elevate.test was not linked again (no STAGING_SUPABASE_URL and STAGING_SECRET_KEY).");
  console.log("The demo usernames (demo-valid-active and the others) work as before.");
}
