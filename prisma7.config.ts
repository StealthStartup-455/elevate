import "dotenv/config";
import { defineConfig } from "prisma/config";

// The Prisma CLI (migrations, seed, studio) uses DIRECT_URL when it is set:
// a direct Postgres connection, which migrations need. The app itself uses
// DATABASE_URL (src/lib/db.ts), which on hosted Supabase is the pooled
// connection (port 6543). Locally both are the same database, so DIRECT_URL
// can be left unset. SHADOW_DATABASE_URL is only for the CI check that the
// migrations match schema.prisma. See DEPLOYMENT.md.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
    ...(process.env["SHADOW_DATABASE_URL"]
      ? { shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"] }
      : {}),
  },
});
