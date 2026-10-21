#!/usr/bin/env node
// Sets up (or refreshes) a hosted Elevate demo on Supabase and Vercel in one
// run: applies migrations, seeds fictional data, sends the settings to the
// Vercel project, deploys, checks the site answers, and optionally runs the
// end to end tests against it. See DEPLOYMENT.md, "Setup script".
//
//   npm run staging:setup                 everything
//   npm run staging:setup -- --skip-db    don't migrate or seed
//   npm run staging:setup -- --skip-e2e   don't offer the end to end tests
//
// Values can come from the environment instead of prompts:
// STAGING_TRANSACTION_URL, STAGING_SESSION_URL, STAGING_SUPABASE_URL,
// STAGING_PUBLISHABLE_KEY. Secrets go to child processes through their
// environment or stdin, never on a command line, and are never printed.
//
// Fictional data only: this script refuses to run with APP_ENV=production.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const args = new Set(process.argv.slice(2));
const VERCEL = process.env.VERCEL_CLI ?? "npx -y vercel@63.1.2";

function step(text) {
  console.log(`\n== ${text}`);
}

function fail(text) {
  console.error(`\nStopped: ${text}`);
  process.exit(1);
}

// Runs a command through the shell (needed for npx on Windows). `env` adds
// variables for this command only; `input` is sent on stdin.
function run(command, { env = {}, input, capture = false } = {}) {
  const result = spawnSync(command, {
    shell: true,
    env: { ...process.env, ...env },
    input,
    encoding: "utf8",
    stdio: [input === undefined ? "inherit" : "pipe", capture ? "pipe" : "inherit", "inherit"],
  });
  return { ok: result.status === 0, stdout: (result.stdout ?? "").trim() };
}

function parseUrl(value, label) {
  try {
    return new URL(value);
  } catch {
    fail(`${label} is not a valid URL.`);
  }
}

// One reader per question, closed straight after, so it never competes with
// the Vercel CLI's own prompts for the keyboard. Empty if stdin has ended.
async function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const closed = new Promise((resolve) => rl.once("close", () => resolve("")));
  const answer = await Promise.race([rl.question(question), closed]);
  rl.close();
  return answer.trim();
}

async function ask(envName, question) {
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) return fromEnv;
  const answer = await prompt(`${question}\n> `);
  if (!answer) fail(`${question.split("\n")[0]} is required.`);
  return answer;
}

if (process.env.APP_ENV === "production") {
  fail("APP_ENV is production. This script is for the demo with fictional data only.");
}

console.log("Elevate staging setup. Fictional data only. Values come from the Supabase");
console.log("dashboard: Connect (the two pooler URLs, password filled in) and");
console.log("Project Settings, API Keys (project URL and publishable key).\n");

let transactionUrl = await ask("STAGING_TRANSACTION_URL", "Transaction pooler URL (port 6543)");
const sessionUrl = await ask("STAGING_SESSION_URL", "Session pooler URL (port 5432)");
const supabaseUrl = await ask("STAGING_SUPABASE_URL", "Supabase project URL (https://...supabase.co)");
const publishableKey = await ask("STAGING_PUBLISHABLE_KEY", "Publishable key");

// Catch the common mix ups before anything is changed.
const transaction = parseUrl(transactionUrl, "The transaction pooler URL");
const session = parseUrl(sessionUrl, "The session pooler URL");
parseUrl(supabaseUrl, "The Supabase project URL");
if (transactionUrl.includes("[YOUR-PASSWORD]") || sessionUrl.includes("[YOUR-PASSWORD]")) {
  fail("Replace [YOUR-PASSWORD] in the URLs with the database password.");
}
if (transaction.port !== "6543") {
  console.warn("Warning: the transaction pooler URL usually uses port 6543.");
}
if (session.port !== "5432") {
  console.warn("Warning: the session pooler URL usually uses port 5432.");
}
if (session.hostname.startsWith("db.")) {
  fail(
    "That is Supabase's direct connection, which is IPv6 only. Use the Session pooler URL from Connect.",
  );
}
if (!transaction.searchParams.has("pgbouncer")) {
  transaction.searchParams.set("pgbouncer", "true");
  transactionUrl = transaction.toString();
}

if (!args.has("--skip-db")) {
  step("Applying migrations (prisma migrate deploy)");
  if (!run("npx prisma migrate deploy", { env: { DIRECT_URL: sessionUrl } }).ok) {
    fail("migrations did not apply. Check the session pooler URL and password.");
  }
  step("Seeding fictional data");
  if (!run("npx tsx prisma/seed.ts", { env: { DATABASE_URL: sessionUrl } }).ok) {
    fail("seeding failed.");
  }
}

step("Vercel");
if (!run(`${VERCEL} whoami`, { capture: true }).ok) {
  console.log("Log in to Vercel in the browser window that opens.");
  if (!run(`${VERCEL} login`).ok) fail("Vercel login did not complete.");
}
if (!existsSync(".vercel/project.json")) {
  console.log("Link this folder to a Vercel project. Choose to create a new one");
  console.log('(for example "elevate-trial"); don\'t connect a Git repository.');
  if (!run(`${VERCEL} link`).ok) fail("Vercel link did not complete.");
}

const settings = {
  DATABASE_URL: transactionUrl,
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  DEMO_MODE: "true",
  APP_ENV: "staging",
  MOCK_BUSYNESS_SCENARIO: "moderate",
};
for (const [name, value] of Object.entries(settings)) {
  // Production target: the trial is deployed with --prod, because preview
  // links sit behind Vercel's login by default.
  const added = run(`${VERCEL} env add ${name} production --force --yes`, {
    input: value,
    capture: true,
  });
  if (!added.ok) fail(`could not set ${name} in Vercel.`);
  console.log(`set ${name}`);
}

step("Deploying (vercel deploy --prod)");
const deployed = run(`${VERCEL} deploy --prod --yes`, { capture: true });
const url = deployed.stdout.split(/\s+/).find((word) => /^https?:\/\//.test(word));
if (!deployed.ok || !url) fail("the deploy failed. The build log is above.");

step(`Checking ${url}/login`);
let healthy = false;
for (let attempt = 0; attempt < 10 && !healthy; attempt++) {
  try {
    const response = await fetch(`${url}/login`);
    healthy = response.ok;
    if (!healthy) console.log(`status ${response.status}, retrying`);
  } catch {
    console.log("not answering yet, retrying");
  }
  if (!healthy) await new Promise((resolve) => setTimeout(resolve, 3000));
}
if (!healthy) fail(`${url}/login did not answer. Check the Logs tab in Vercel.`);
console.log("the site answers");

if (!args.has("--skip-e2e")) {
  const answer = await prompt(
    "\nRun the end to end tests against it now? Takes about 2 minutes. [y/N] ",
  );
  if (/^y/i.test(answer)) {
    const passed = run("npx playwright test", { env: { E2E_BASE_URL: url } }).ok;
    step("Reseeding, so the demo starts clean");
    run("npx tsx prisma/seed.ts", { env: { DATABASE_URL: sessionUrl } });
    if (!passed) fail("some end to end tests failed. `npx playwright show-report` has details.");
  }
}

console.log(`
Done: ${url}

Try it by hand: log in as desk / desk on a laptop and as
demo-valid-active / demo-valid-active on a phone, tap Demo scan, check in
at the desk. In Vercel, Logs, search for scan_taken to see waitMs.`);
