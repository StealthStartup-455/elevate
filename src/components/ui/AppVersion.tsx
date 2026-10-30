import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { APP_VERSION, commitUrl } from "@/lib/version";

// The build's version (#43), for example v0.1.0-dev.23+abc1234, linking to
// that commit on GitHub. Tells anyone reporting a problem, or checking a
// deploy, exactly which code is running.
export function VersionLink() {
  const url = commitUrl();
  return url ? (
    <Link
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Version ${APP_VERSION}, opens the commit on GitHub`}
      data-testid="app-version"
    >
      {APP_VERSION}
    </Link>
  ) : (
    <span data-testid="app-version">{APP_VERSION}</span>
  );
}

// The version at the bottom of the desk, so staff can read it out when
// something goes wrong. Climbers find it in About on /me instead (#103).
export default function AppVersion() {
  return (
    <footer className="mt-auto px-4 py-3">
      <Typography variant="secondary">
        <VersionLink />
      </Typography>
    </footer>
  );
}
