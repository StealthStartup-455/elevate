// Demo mode: the hard-coded demo login (a cookie instead of real sign-in).
//
// On by default under `next dev`. A deployed build only turns it on when the
// host sets DEMO_MODE="true", which is how the hosted staging demo runs with
// fictional data until real sign-in (#33) lands. It can never run in the
// production environment: APP_ENV="production" switches it off even if
// DEMO_MODE is set by mistake.
//
// TODO(auth): delete this file, and every check that uses it, once Supabase
// sign-in replaces the demo login (#33).
export function isDemoMode(): boolean {
  if (process.env.APP_ENV === "production") return false;
  if (process.env.NODE_ENV === "development") return true;
  return process.env.DEMO_MODE === "true";
}
