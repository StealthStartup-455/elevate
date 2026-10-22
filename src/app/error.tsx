"use client";

import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

// Shown instead of a page when something on it fails. The error code is the
// digest in the server log (instrumentation.ts), so staff can report it and we
// can find the exact error. The message itself is never shown: in production
// it is generic for server errors anyway.
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 p-4 sm:p-6">
      <Typography variant="pageTitle" component="h1">
        Something went wrong
      </Typography>
      <Typography variant="body">
        This page couldn&apos;t load. Try again, and if it keeps happening, let us know the error
        code below.
      </Typography>
      {error.digest ? (
        <Typography variant="secondary">Error code: {error.digest}</Typography>
      ) : null}
      <div>
        <Button variant="contained" onClick={() => retry()}>
          Try again
        </Button>
      </div>
    </main>
  );
}
