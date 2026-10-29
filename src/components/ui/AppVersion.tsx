import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { APP_VERSION, commitUrl } from "@/lib/version";

// The build's version at the bottom of every page (#43), for example
// v0.1.0-dev.23+abc1234, linking to that commit on GitHub. Tells anyone
// reporting a problem, or checking a deploy, exactly which code is running.
export default function AppVersion() {
  const url = commitUrl();
  return (
    <footer className="mt-auto px-4 py-3">
      <Typography variant="secondary" data-testid="app-version">
        {url ? (
          <Link href={url} target="_blank" rel="noreferrer" aria-label={`Version ${APP_VERSION}, opens the commit on GitHub`}>
            {APP_VERSION}
          </Link>
        ) : (
          APP_VERSION
        )}
      </Typography>
    </footer>
  );
}
