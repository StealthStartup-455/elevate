"use client";

import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ThemeRegistry from "@/components/ui/ThemeRegistry";

// Last resort when the root layout itself fails. It replaces the whole
// document, so it brings its own <html>, <body> and theme. See error.tsx.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-6">
            <title>Something went wrong | Elevate</title>
            <Typography variant="pageTitle" component="h1">
              Something went wrong
            </Typography>
            <Typography variant="body">
              Elevate couldn&apos;t load. Try again, and if it keeps happening, let us know the
              error code below.
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
        </ThemeRegistry>
      </body>
    </html>
  );
}
