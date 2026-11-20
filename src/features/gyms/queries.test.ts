import { beforeEach, describe, expect, it, vi } from "vitest";
import { listGymsForCustomer } from "./queries";

const fake = vi.hoisted(() => ({
  findMany: vi.fn(),
  getCurrentUser: vi.fn(),
  getDemoClimberIds: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    gym: { findMany: fake.findMany },
    climber: { findMany: fake.findMany },
  },
}));
vi.mock("@/features/auth/queries", () => ({ getCurrentUser: fake.getCurrentUser }));
vi.mock("@/features/auth/session", () => ({ getDemoClimberIds: fake.getDemoClimberIds }));

describe("listGymsForCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake.getCurrentUser.mockResolvedValue(null);
    fake.getDemoClimberIds.mockResolvedValue(["demo-gym-climber", "other-gym-climber"]);
    fake.findMany
      .mockResolvedValueOnce([
        { id: "demo-gym", name: "Demo Gym", slug: "demo-gym", timeZone: "America/Vancouver" },
        { id: "other-gym", name: "Other Gym", slug: "other-gym", timeZone: "America/Vancouver" },
      ])
      .mockResolvedValueOnce([
        { id: "demo-gym-climber", gymId: "demo-gym", onboardingComplete: true },
        { id: "other-gym-climber", gymId: "other-gym", onboardingComplete: true },
      ]);
  });

  it("marks every joined demo gym", async () => {
    await expect(listGymsForCustomer()).resolves.toEqual([
      {
        id: "demo-gym",
        name: "Demo Gym",
        slug: "demo-gym",
        timeZone: "America/Vancouver",
        joinedClimberId: "demo-gym-climber",
      },
      {
        id: "other-gym",
        name: "Other Gym",
        slug: "other-gym",
        timeZone: "America/Vancouver",
        joinedClimberId: "other-gym-climber",
      },
    ]);
  });
});
