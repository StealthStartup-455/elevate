import { beforeEach, describe, expect, it, vi } from "vitest";
import { joinGym, signUpGym, switchGym } from "./actions";

const fake = vi.hoisted(() => ({
  findGymBySlug: vi.fn(),
  getDemoClimberId: vi.fn(),
  getDemoClimberIds: vi.fn(),
  create: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findOwner: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
  getCurrentUser: vi.fn(),
  demo: true,
  signUp: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  provisionGym: vi.fn(),
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
    $transaction: fake.transaction,
    staff: { findFirst: fake.findOwner },
    climber: {
      create: fake.create,
      findUnique: fake.findUnique,
      update: fake.update,
    },
  },
}));
vi.mock("./provision", () => ({ provisionGym: fake.provisionGym }));
vi.mock("@/features/auth/demo-mode", () => ({ isDemoMode: () => fake.demo }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: fake.getUser, signUp: fake.signUp, updateUser: fake.updateUser } }),
}));
vi.mock("@/features/auth/session", () => ({
  clearSession: vi.fn(),
  getDemoClimberId: fake.getDemoClimberId,
  getDemoClimberIds: fake.getDemoClimberIds,
  setActiveClimberSession: vi.fn(),
  setDeskSession: vi.fn(),
  setSession: fake.setSession,
}));
vi.mock("@/features/auth/queries", () => ({ getCurrentUser: fake.getCurrentUser }));
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
    fake.demo = true;
    fake.transaction.mockImplementation(async (run) => run({
      $queryRaw: vi.fn(),
      climber: {
        create: fake.create, findFirst: fake.findFirst, update: fake.update,
      },
    }));
    fake.findFirst.mockResolvedValue(null);
    fake.update.mockResolvedValue({ id: "pending-climber" });
    fake.getCurrentUser.mockResolvedValue(null);
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
      authUserId: "demo-account",
    });
    fake.create.mockResolvedValue({ id: "target-climber" });
  });

  it("creates the selected gym's climber record from a pending demo profile", async () => {
    await expect(joinGym("target-gym", new FormData())).rejects.toThrow("redirect /me/register");

    expect(fake.create).toHaveBeenCalledWith({
      data: {
        gymId: "target-gym",
        authUserId: "demo-account",
        firstName: "Alex",
        lastName: "Climber",
        phone: "+12505550100",
        email: "alex@example.com",
        dateOfBirth: new Date("1998-06-15T00:00:00Z"),
      },
      select: { id: true },
    });
    expect(fake.setSession).toHaveBeenCalledWith("target-climber");
  });

  it("reuses a demo account's existing target record when joining from another gym", async () => {
    fake.findFirst.mockResolvedValue({ id: "already-joined" });
    fake.update.mockResolvedValue({ id: "already-joined" });
    await expect(joinGym("target-gym", new FormData())).rejects.toThrow("redirect /me/register");
    expect(fake.create).not.toHaveBeenCalled();
    expect(fake.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        gymId: "target-gym",
        OR: [{ authUserId: "demo-account" }, { id: { in: ["pending-climber"] }, authUserId: null }],
      },
    }));
    expect(fake.setSession).toHaveBeenCalledWith("already-joined");
  });

  it("opens an already joined real gym even when signup metadata is missing", async () => {
    fake.getDemoClimberId.mockResolvedValue(undefined);
    fake.getCurrentUser.mockResolvedValue({ authUserId: "old-account", climberIds: ["existing"] });
    fake.findFirst.mockResolvedValue({ id: "existing" });
    await expect(joinGym("target-gym", new FormData())).rejects.toThrow("redirect /me/register");
    expect(fake.create).not.toHaveBeenCalled();
  });

  it("asks an account without any complete profile to finish it instead of silently failing", async () => {
    fake.getDemoClimberId.mockResolvedValue(undefined);
    fake.getCurrentUser.mockResolvedValue({ authUserId: "old-account", climberIds: [] });
    await expect(joinGym("target-gym", new FormData())).rejects.toThrow("redirect /me/profile");
    expect(fake.create).not.toHaveBeenCalled();
  });

  it("switches to a remembered demo gym", async () => {
    fake.getDemoClimberIds.mockResolvedValue(["pending-climber", "target-climber"]);

    await expect(switchGym("target-climber")).rejects.toThrow("redirect /me");

    expect(fake.setSession).toHaveBeenCalledWith("target-climber");
  });

  describe("signUpGym", () => {
    const gymForm = () => {
      const form = new FormData();
      for (const [key, value] of Object.entries({
        gymName: "New Gym", ownerName: "Owner", email: "owner@example.test", password: "password",
      })) form.set(key, value);
      return form;
    };

    beforeEach(() => {
      vi.clearAllMocks();
      fake.demo = false;
      fake.findOwner.mockResolvedValue(null);
      fake.getUser.mockResolvedValue({ data: { user: null } });
      fake.updateUser.mockResolvedValue({ error: null });
    });

    it("does not reserve a gym name until email confirmation and saves the intended setup", async () => {
      fake.signUp.mockResolvedValue({
        data: { user: { id: "owner", email_confirmed_at: null }, session: null }, error: null,
      });
      expect(await signUpGym({}, gymForm())).toMatchObject({ success: expect.stringMatching(/confirm/) });
      expect(fake.signUp).toHaveBeenCalledWith(expect.objectContaining({
        options: { data: { pendingGym: { gymName: "New Gym", ownerName: "Owner", timeZone: "America/Vancouver" } } },
      }));
      expect(fake.provisionGym).not.toHaveBeenCalled();
    });

    it("allows a confirmed account to retry provisioning without a second auth signup", async () => {
      fake.getUser.mockResolvedValue({
        data: { user: { id: "owner", email: "owner@example.test", email_confirmed_at: "confirmed" } },
      });
      fake.provisionGym.mockResolvedValue({ gymId: "new-gym" });
      await expect(signUpGym({}, gymForm())).rejects.toThrow("redirect /desk");
      expect(fake.signUp).not.toHaveBeenCalled();
      expect(fake.updateUser).toHaveBeenCalledWith({
        data: { pendingGym: { gymName: "New Gym", ownerName: "Owner", timeZone: "America/Vancouver" } },
      });
      expect(fake.provisionGym).toHaveBeenCalledWith("owner", expect.objectContaining({ gymName: "New Gym" }));
    });

    it("keeps a recoverable provisioning error visible", async () => {
      fake.getUser.mockResolvedValue({
        data: { user: { id: "owner", email: "owner@example.test", email_confirmed_at: "confirmed" } },
      });
      fake.provisionGym.mockResolvedValue({ error: "Log in again to retry." });
      expect(await signUpGym({}, gymForm())).toMatchObject({ error: "Log in again to retry." });
    });

    it("does not provision if saving the pending setup fails", async () => {
      fake.getUser.mockResolvedValue({
        data: { user: { id: "owner", email: "owner@example.test", email_confirmed_at: "confirmed" } },
      });
      fake.updateUser.mockResolvedValue({ error: { code: "service_unavailable" } });
      expect(await signUpGym({}, gymForm())).toMatchObject({ error: "We couldn't save your gym setup. Try again." });
      expect(fake.provisionGym).not.toHaveBeenCalled();
    });

    it("never reclaims an existing demo gym by its name", async () => {
      fake.demo = true;
      fake.findGymBySlug.mockResolvedValue({ id: "legacy" });
      expect(await signUpGym({}, gymForm())).toMatchObject({ error: expect.stringMatching(/already exists/) });
      expect(fake.transaction).not.toHaveBeenCalled();
    });
  });
});
