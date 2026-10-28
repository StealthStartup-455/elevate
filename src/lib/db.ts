import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { timed } from "./timing";

// Every query is timed, and logged when PERF_LOG="true" (#84): model,
// operation and milliseconds, never the data.
function createClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  }).$extends({
    query: {
      $allOperations({ model, operation, args, query }) {
        return timed("perf_db", { model: model ?? "raw", operation }, () => query(args));
      },
    },
  });
}

// Reuse the client across hot reloads in dev.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
