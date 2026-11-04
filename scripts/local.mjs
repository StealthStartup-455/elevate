#!/usr/bin/env node
// Sets up and runs Elevate on your machine in one command, in the right order:
// checks Docker, makes .env if it's missing, installs packages when the
// lockfile changed, starts local Supabase, applies migrations, regenerates the
// Prisma client, seeds when the database just changed, then starts next dev.
// Safe to run every time, including straight after switching branches. #171
//
//   npm run local                  everything
//   npm run local -- --seed        also reload the sample data (logs you out)
//   npm run local -- --no-seed     never seed, even after new migrations
//   npm run local -- --setup-only  everything except starting the app
//
// Local only: it refuses to run with APP_ENV=production, and it never prints
// keys from Supabase or .env.

import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";

const args = new Set(process.argv.slice(2));
const KNOWN = new Set(["--seed", "--no-seed", "--setup-only", "--help", "-h"]);
const PLACEHOLDER_KEY = "paste-publishable-key-here";
const KEY_NAME = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

function step(text) {
  console.log(`\n== ${text}`);
}

function fail(text) {
  console.error(`\nStopped: ${text}`);
  process.exit(1);
}

// Runs a command through the shell (needed for npx on Windows). With
// `capture`, output is collected instead of shown.
function run(command, { capture = false } = {}) {
  const result = spawnSync(command, {
    shell: true,
    encoding: "utf8",
    stdio: ["inherit", capture ? "pipe" : "inherit", capture ? "pipe" : "inherit"],
  });
  return {
    ok: result.status === 0,
    out: `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim(),
  };
}

// KEY=value lines from `supabase status -o env`, quotes removed.
function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
  }
  return values;
}

function envValue(text, name) {
  const match = text.match(new RegExp(`^${name}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^"(.*)"$/, "$1") : undefined;
}

if (args.has("--help") || args.has("-h")) {
  console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 14).join("\n").replace(/^\/\/ ?/gm, ""));
  process.exit(0);
}
for (const arg of args) if (!KNOWN.has(arg)) fail(`unknown option ${arg}. Try npm run local -- --help`);
if (args.has("--seed") && args.has("--no-seed")) fail("pick one of --seed and --no-seed.");
if (process.env.APP_ENV === "production") fail("APP_ENV is production. This script is for your own machine only.");

// 1. Node
const major = Number(process.versions.node.split(".")[0]);
if (major < 24) fail(`Node ${process.versions.node} is too old. Install Node 24 (see README, Requirements).`);
if (major !== 24) console.log(`Note: Node ${process.versions.node}; the project and CI use Node 24. It usually works, but if something odd happens, try 24.`);

// 2. .env
step(".env");
if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log("Made .env from .env.example.");
} else {
  console.log("Using your .env.");
}
const env = readFileSync(".env", "utf8");
if (envValue(env, "APP_ENV") === "production") fail(".env sets APP_ENV=production. This script is for your own machine only.");
const databaseUrl = envValue(env, "DATABASE_URL") ?? "";
if (databaseUrl && !/@(127\.0\.0\.1|localhost)[:/]/.test(databaseUrl)) {
  fail("DATABASE_URL in .env isn't a local database, so migrating and seeding could change a hosted one. Point it back at the local one in .env.example.");
}

// 3. Docker (local Supabase runs in it)
step("Docker");
if (!run("docker info", { capture: true }).ok) {
  const how = {
    linux: "sudo systemctl start docker",
    darwin: "open Docker Desktop and wait until it says it's running",
    win32: "open Docker Desktop and wait until it says it's running",
  }[process.platform] ?? "start Docker";
  fail(`Docker isn't running. Local Supabase needs it. Start it (${how}), then run npm run local again.`);
}
console.log("Running.");

// 4. Packages, only when the lockfile is newer than the last install
step("Packages");
const installed = "node_modules/.package-lock.json";
if (!existsSync(installed) || statSync("package-lock.json").mtimeMs > statSync(installed).mtimeMs) {
  if (!run("npm install").ok) fail("npm install failed (see above).");
} else {
  console.log("Up to date.");
}

// 5. Local Supabase
step("Local Supabase");
let status = run("npx supabase status -o env", { capture: true });
if (!status.ok) {
  console.log("Not running, starting it. The first time downloads Docker images and takes a few minutes.");
  if (!run("npx supabase start").ok) fail("npx supabase start failed (see above).");
  status = run("npx supabase status -o env", { capture: true });
  if (!status.ok) fail("Supabase started but npx supabase status failed:\n" + status.out);
} else {
  console.log("Running.");
}
const supabase = parseEnv(status.out);
const key = supabase.PUBLISHABLE_KEY ?? supabase.ANON_KEY;
const currentKey = envValue(env, KEY_NAME);
if (key && (!currentKey || currentKey === PLACEHOLDER_KEY)) {
  const line = `${KEY_NAME}="${key}"`;
  const updated = env.match(new RegExp(`^${KEY_NAME}=.*$`, "m"))
    ? env.replace(new RegExp(`^${KEY_NAME}=.*$`, "m"), line)
    : `${env.trimEnd()}\n${line}\n`;
  writeFileSync(".env", updated);
  console.log(`Put the local publishable key in .env (${KEY_NAME}).`);
}

// 6. Migrations and the Prisma client
step("Database migrations");
const migrate = run("npx prisma migrate deploy", { capture: true });
console.log(migrate.out.split("\n").filter((l) => !l.startsWith("npm notice")).join("\n"));
if (!migrate.ok) {
  fail("migrations didn't apply (see above). If this branch changed a migration that's already applied, reset the local database with npx supabase db reset, then run npm run local -- --seed.");
}
const applied = !/No pending migrations/i.test(migrate.out);
const generate = run("npx prisma generate", { capture: true });
if (!generate.ok) fail("npx prisma generate failed:\n" + generate.out);
console.log("Prisma client is up to date.");

// 7. Sample data
step("Sample data");
const seed = args.has("--seed") || (applied && !args.has("--no-seed"));
if (seed) {
  if (!run("npm run db:seed").ok) fail("seeding failed (see above).");
  console.log("Seeded. Seeding gives every climber a new id, so log in again if a browser tab was already logged in.");
} else {
  console.log(applied ? "Skipped (--no-seed)." : "No new migrations, so the data you have stays. Use npm run local -- --seed to reload it.");
}

// 8. The app
if (args.has("--setup-only")) {
  console.log("\nReady. Start the app with npm run dev.");
  process.exit(0);
}
step("Starting the app (Ctrl+C to stop)");
console.log("Open the Local address below (http://localhost:3000, or the next free port if 3000 is taken) and log in as desk / desk, or as a climber such as demo-valid-active.");
const dev = spawn("npm run dev", { shell: true, stdio: "inherit" });
dev.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => dev.kill(signal));
