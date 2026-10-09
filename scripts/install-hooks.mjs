// Points git at the committed hooks in .githooks. Runs on `npm install`.
// Silently does nothing outside a git checkout (for example in a Docker build).
import { execSync } from "node:child_process";

try {
  execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
} catch {
  // Not a git checkout; nothing to install.
}
