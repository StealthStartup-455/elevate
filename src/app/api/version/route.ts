import { APP_VERSION, BUILT_AT, COMMIT_SHA } from "@/lib/version";

// Which build is live (#43). The Deploy staging workflow reads this to confirm
// the commit it just deployed is the one answering. Public and safe: it holds
// only what the page footer already shows.
export function GET() {
  return Response.json(
    {
      version: APP_VERSION,
      commit: COMMIT_SHA,
      builtAt: BUILT_AT,
      environment: process.env.APP_ENV ?? process.env.NODE_ENV,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
