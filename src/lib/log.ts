// Structured server logs: one JSON object per line on stdout or stderr, which
// Vercel (and any log tool) can search by field. Use it for events worth
// counting or debugging later: a check-in refused and why, a scan reaching the
// desk and how long it took, a server error.
//
// Every line carries the build's version (#43), so a log points to one commit.
//
// Privacy: never log names, phone numbers, emails, dates of birth or anything
// typed into a form. Log ids (climberId, gymId) and short reason codes only.

import { APP_VERSION } from "./version";

export type LogFields = Record<string, string | number | boolean | null | undefined>;

type Line = { level: "info" | "warn" | "error"; event: string; time: string } & LogFields;

function line(level: Line["level"], event: string, fields: LogFields, now: Date): string {
  const out: Line = { level, event, time: now.toISOString() };
  if (APP_VERSION !== "unknown") out.version = APP_VERSION;
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) out[key] = value;
  }
  return JSON.stringify(out);
}

export function logEvent(event: string, fields: LogFields = {}, now = new Date()): void {
  console.info(line("info", event, fields, now));
}

export function logWarning(event: string, fields: LogFields = {}, now = new Date()): void {
  console.warn(line("warn", event, fields, now));
}

// The error's name, message and digest (Next.js's id for matching an error
// shown in the browser with this log line), plus the top of the stack.
export function errorFields(error: unknown): LogFields {
  if (error instanceof Error) {
    const digest = (error as Error & { digest?: unknown }).digest;
    return {
      errorName: error.name,
      errorMessage: error.message,
      digest: typeof digest === "string" ? digest : undefined,
      stack: error.stack?.split("\n").slice(0, 6).join("\n"),
    };
  }
  return { errorMessage: String(error) };
}

export function logError(
  event: string,
  error: unknown,
  fields: LogFields = {},
  now = new Date(),
): void {
  console.error(line("error", event, { ...fields, ...errorFields(error) }, now));
}
