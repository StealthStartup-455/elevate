import fs from "node:fs";
import path from "node:path";

// Server actions are called by id. The local build lists them, so these
// tests can call an action directly, the way an attacker would.
export const manifestPath = path.join(
  process.cwd(),
  ".next/server/server-reference-manifest.json",
);

export function actionId(name: string): string {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    node: Record<string, { exportedName?: string }>;
  };
  const entry = Object.entries(manifest.node).find(([, v]) => v.exportedName === name);
  if (!entry) throw new Error(`No server action named ${name} in the build`);
  return entry[0];
}
