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
  // Pages that moved (#101). Here rather than as redirect() in a page, which Cache Components
  // tries to prerender and warns about.
  async redirects() {
    return [
      { source: "/desk/events", destination: "/desk/events/hours", permanent: false },
      { source: "/me/purchase", destination: "/me/membership", permanent: false },
      { source: "/me/events", destination: "/me/classes?view=events", permanent: false },
    ];
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
