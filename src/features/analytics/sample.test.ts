import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Generated busyness data is counted, so the pages can label it (#64).
const saved = vi.hoisted(() => ({
  rows: [] as {
    id: string;
    climberId: string;
    timestamp: Date;
    firstName: string;
    lastName: string;
    phone: string;
    waiverStatus: "valid";
  }[],
}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/features/climbers/queries", () => ({ getSavedCheckIns: async () => saved.rows }));
vi.mock("@/features/auth/staff", () => ({ requireStaff: async () => {} }));

const realVisit = {
  id: "real-1",
  climberId: "c-real",
  timestamp: new Date(),
  firstName: "Real",
  lastName: "Visit",
  phone: "2505550100",
  waiverStatus: "valid" as const,
};

async function load() {
  vi.resetModules();
  return import("./queries");
}

beforeEach(() => {
  saved.rows = [realVisit, { ...realVisit, id: "demo-checkin:demo-gym:today:0" }];
});
afterEach(() => vi.unstubAllEnvs());

describe("sample check-ins", () => {
  it("counts saved demo visits alongside new check-ins", async () => {
    vi.stubEnv("MOCK_BUSYNESS_SCENARIO", "moderate");
    const { getBusynessSummary } = await load();
    const summary = await getBusynessSummary("demo-gym");
    expect(summary.sampleCount).toBe(1);
    expect(summary.count).toBe(summary.sampleCount + 1);
  });

  it("marks each desk row as sample or real", async () => {
    vi.stubEnv("MOCK_BUSYNESS_SCENARIO", "moderate");
    const { getFrontDeskBusyness } = await load();
    const { checkIns } = await getFrontDeskBusyness("demo-gym");
    expect(checkIns.find((c) => c.id === "real-1")?.sample).toBe(false);
    expect(checkIns.filter((c) => c.sample).length).toBe(checkIns.length - 1);
  });

  it("has nothing to label with real check-ins only", async () => {
    saved.rows = [realVisit];
    vi.stubEnv("MOCK_BUSYNESS_SCENARIO", "none");
    const { getBusynessSummary } = await load();
    const summary = await getBusynessSummary("demo-gym");
    expect(summary).toMatchObject({ count: 1, sampleCount: 0 });
  });

  it("never adds header-only mock visits even when a scenario is configured", async () => {
    saved.rows = [];
    vi.stubEnv("MOCK_BUSYNESS_SCENARIO", "moderate");
    const { getBusynessSummary } = await load();
    expect(await getBusynessSummary("demo-gym")).toMatchObject({ count: 0, sampleCount: 0 });
  });

  it("still labels the typical week, which is always generated for now", async () => {
    const { getWeeklyBusyness } = await load();
    expect((await getWeeklyBusyness("demo-gym")).sample).toBe(true);
  });
});
