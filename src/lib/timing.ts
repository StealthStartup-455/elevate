import { logEvent, type LogFields } from "./log";

// Timing logs for finding slow requests (#84). Off unless PERF_LOG="true", so
// normal logs stay quiet; turn it on for a staging deploy, read Vercel's Logs
// (search "perf_"), then turn it off. Vercel groups every line a request
// writes under that request, so one page load shows each step's time.

export function perfLogging(): boolean {
  return process.env.PERF_LOG === "true";
}

// Runs `work` and, when PERF_LOG is on, logs `event` with how long it took in
// milliseconds, even if it throws. Ids and names of steps only: never data.
export async function timed<T>(
  event: string,
  fields: LogFields,
  work: () => Promise<T>,
  clock: () => number = () => performance.now(),
): Promise<T> {
  if (!perfLogging()) return work();
  const start = clock();
  try {
    return await work();
  } finally {
    logEvent(event, { ...fields, ms: Math.round(clock() - start) });
  }
}
