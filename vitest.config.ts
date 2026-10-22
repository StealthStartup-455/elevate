import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests: *.test.ts next to the code they test. Tests named *.db.test.ts
// need a Postgres database with the migrations applied (DATABASE_URL); CI
// provides one. End to end tests live in e2e/ and run with Playwright.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "e2e", "src/generated"],
  },
});
