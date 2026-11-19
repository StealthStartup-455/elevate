import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser, findDemoStaffSession } from "./queries";
import { signDemoDeskSession } from "./demo-credentials";

const fake = vi.hoisted(() => ({
  getUser: vi.fn(),
  findStaff: vi.fn(),
  findClimber: vi.fn(),
  findClimbers: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: fake.getUser } }),
}));
vi.mock("@/lib/db", () => ({
  db: {
    staff: { findFirst: fake.findStaff },
    climber: { findFirst: fake.findClimber, findMany: fake.findClimbers },
  },
}));
vi.mock("./session", () => ({ getActiveClimberId: vi.fn(), getDemoClimberId: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  fake.getUser.mockResolvedValue({ data: { user: { id: "legacy-user", user_metadata: {} } } });
  fake.findStaff.mockResolvedValue(null);
  fake.findClimbers.mockResolvedValue([{ id: "legacy-climber" }]);
  fake.findClimber.mockResolvedValue({
    firstName: "Alex", lastName: "Climber", phone: "+12505550100", email: null,
    dateOfBirth: new Date("1990-01-01"),
  });
});

describe("legacy customer profiles", () => {
  it("uses an existing customer record when signup metadata is absent", async () => {
    expect(await getCurrentUser()).toMatchObject({
      customerProfile: {
        firstName: "Alex", lastName: "Climber", phone: "+12505550100",
        email: "", dateOfBirth: "1990-01-01",
      },
    });
    expect(fake.findClimber).toHaveBeenCalledWith(expect.objectContaining({
      where: { authUserId: "legacy-user" },
    }));
  });

  it("does not copy invalid metadata and leaves incomplete profiles for the completion form", async () => {
    fake.getUser.mockResolvedValue({ data: { user: { id: "legacy-user", user_metadata: {
      firstName: "Alex", lastName: "Climber", phone: "12", email: "", dateOfBirth: "impossible",
    } } } });
    fake.findClimber.mockResolvedValue(null);
    expect((await getCurrentUser())?.customerProfile).toBeUndefined();
  });
});

describe("demo owner verification", () => {
  it("loads the signed owner and rejects edited or legacy raw gym cookies", async () => {
    const owner = { id: "owner", gymId: "new-gym", role: "OWNER", demoPasswordHash: "credential" };
    fake.findStaff.mockResolvedValue(owner);
    const token = signDemoDeskSession(owner);
    expect(await findDemoStaffSession(token)).toEqual({ id: "owner", gymId: "new-gym", role: "OWNER" });
    expect(fake.findStaff).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "owner", active: true, demoPasswordHash: { not: null } },
    }));
    expect(await findDemoStaffSession(token.replace("owner", "another-owner"))).toBeNull();
    expect(await findDemoStaffSession("known-gym-id")).toBeNull();
    fake.findStaff.mockResolvedValue(null);
    expect(await findDemoStaffSession(token)).toBeNull();
  });
});
