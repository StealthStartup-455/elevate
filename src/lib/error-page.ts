// What the error pages (src/app/error.tsx, global-error.tsx) tell the user to
// do next. A server error has a digest, the code in the server log
// (instrumentation.ts), so staff can report it and we can find the error. An
// error in the browser (a lost connection, a failed server action call) has
// no digest and nothing in the server log, so the page doesn't promise a code
// it can't show (#130).
export function errorPageHelp(digest: string | undefined): string {
  return digest
    ? "Try again, and if it keeps happening, let us know the error code below."
    : "Check your connection and try again. If it keeps happening, let us know what you were doing when it happened.";
}
