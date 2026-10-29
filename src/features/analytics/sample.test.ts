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
  saved.rows = [realVisit];
});
afterEach(() => vi.unstubAllEnvs());

describe("sample check-ins", () => {
  it("counts the generated check-ins mixed in with real ones", async () => {
    vi.stubEnv("MOCK_BUSYNESS_SCENARIO", "moderate");
    const { getBusynessSummary } = await load();
    const summary = await getBusynessSummary("demo-gym");
    expect(summary.sampleCount).toBeGreaterThan(0);
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
    vi.stubEnv("MOCK_BUSYNESS_SCENARIO", "none");
    const { getBusynessSummary } = await load();
    const summary = await getBusynessSummary("demo-gym");
    expect(summary).toMatchObject({ count: 1, sampleCount: 0 });
  });

  it("shows real check-ins only in production unless a scenario is set", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("MOCK_BUSYNESS_SCENARIO", "");
    let { getBusynessSummary } = await load();
    expect(await getBusynessSummary("demo-gym")).toMatchObject({ count: 1, sampleCount: 0 });

    vi.stubEnv("MOCK_BUSYNESS_SCENARIO", "moderate");
    ({ getBusynessSummary } = await load());
    expect((await getBusynessSummary("demo-gym")).sampleCount).toBeGreaterThan(0);
  });

  it("still labels the typical week, which is always generated for now", async () => {
    const { getWeeklyBusyness } = await load();
    expect((await getWeeklyBusyness("demo-gym")).sample).toBe(true);
  });
});
