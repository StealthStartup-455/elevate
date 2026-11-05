import { beforeEach, describe, expect, it, vi } from "vitest";
import { joinGym, switchGym } from "./actions";

const fake = vi.hoisted(() => ({
  findGymBySlug: vi.fn(),
  getDemoClimberId: vi.fn(),
  getDemoClimberIds: vi.fn(),
  create: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  setSession: vi.fn(),
  revalidatePath: vi.fn(),
  logEvent: vi.fn(),
}));

vi.mock("./queries", () => ({
  findGymBySlug: fake.findGymBySlug,
  listGymsForCustomer: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    climber: {
      create: fake.create,
      findUnique: fake.findUnique,
      update: fake.update,
    },
  },
}));
vi.mock("@/features/auth/session", () => ({
  clearSession: vi.fn(),
  getDemoClimberId: fake.getDemoClimberId,
  getDemoClimberIds: fake.getDemoClimberIds,
  setActiveClimberSession: vi.fn(),
  setDeskSession: vi.fn(),
  setSession: fake.setSession,
}));
vi.mock("@/features/auth/queries", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/gym", () => ({ forgetGym: vi.fn() }));
vi.mock("@/lib/log", () => ({ logEvent: fake.logEvent }));
vi.mock("next/cache", () => ({ revalidatePath: fake.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));

describe("joinGym", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake.findGymBySlug.mockResolvedValue({
      id: "target-gym",
      name: "Target Gym",
      slug: "target-gym",
      timeZone: "America/Vancouver",
    });
    fake.getDemoClimberId.mockResolvedValue("pending-climber");
    fake.getDemoClimberIds.mockResolvedValue(["pending-climber"]);
    fake.findUnique.mockResolvedValue({
      id: "pending-climber",
      gymId: "demo-gym",
      firstName: "Alex",
      lastName: "Climber",
      phone: "+12505550100",
      email: "alex@example.com",
      dateOfBirth: new Date("1998-06-15T00:00:00Z"),
    });
    fake.create.mockResolvedValue({ id: "target-climber" });
  });

  it("creates the selected gym's climber record from a pending demo profile", async () => {
    await expect(joinGym("target-gym", new FormData())).rejects.toThrow("redirect /me/register");

    expect(fake.create).toHaveBeenCalledWith({
      data: {
        gymId: "target-gym",
        firstName: "Alex",
        lastName: "Climber",
        phone: "+12505550100",
        email: "alex@example.com",
        dateOfBirth: new Date("1998-06-15T00:00:00Z"),
      },
      select: { id: true },
    });
    expect(fake.update).not.toHaveBeenCalled();
    expect(fake.setSession).toHaveBeenCalledWith("target-climber");
  });

  it("switches to a remembered demo gym", async () => {
    fake.getDemoClimberIds.mockResolvedValue(["pending-climber", "target-climber"]);

    await expect(switchGym("target-climber")).rejects.toThrow("redirect /me");

    expect(fake.setSession).toHaveBeenCalledWith("target-climber");
  });
});
