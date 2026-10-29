import type { NextConfig } from "next";
import { appVersion } from "./scripts/app-version.mjs";

// The build's version, from git or from the deploy (#43); see src/lib/version.ts.
const version = appVersion();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version.version,
    NEXT_PUBLIC_COMMIT_SHA: version.commit,
    NEXT_PUBLIC_BUILD_TIME: version.builtAt,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
