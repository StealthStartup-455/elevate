import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "./queries";
import { Prisma } from "@/generated/prisma/client";
import { login, signUpCustomer } from "./actions";

// The real (Supabase) login, with Supabase and the database faked so it runs
// in CI. redirect() throws in Next.js too, so nothing after it runs.
const fake = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  findAccount: vi.fn(),
  clearSession: vi.fn(),
  setActiveClimberSession: vi.fn(),
  provisionGym: vi.fn(),
  demo: false,
  signUp: vi.fn(),
  createClimber: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { signInWithPassword: fake.signInWithPassword, signOut: fake.signOut, signUp: fake.signUp },
  }),
}));
vi.mock("./queries", () => ({ findAccount: fake.findAccount }));
vi.mock("@/features/gyms/provision", () => ({ provisionGym: fake.provisionGym }));
vi.mock("./session", () => ({
  clearSession: fake.clearSession,
  setActiveClimberSession: fake.setActiveClimberSession,
  setSession: vi.fn(),
  setDeskSession: vi.fn(),
}));
vi.mock("./demo-mode", () => ({ isDemoMode: () => fake.demo }));
vi.mock("@/lib/gym", () => ({ getGym: async () => ({ id: "demo-gym" }) }));
vi.mock("@/lib/db", () => ({ db: { climber: { create: fake.createClimber } } }));
vi.mock("./mock-users", () => ({ DESK_USERNAME: "desk", findClimberIdByUsername: vi.fn() }));
vi.mock("@/lib/log", () => ({ logEvent: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));

function form(email: string, password: string): FormData {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
}

const account = (staff: boolean, climberIds: string[]): CurrentUser => ({
  authUserId: "u1",
  staff: staff ? { id: "s1", name: "Front Desk", role: "DESK", gymId: "g1" } : null,
  climberIds,
});

beforeEach(() => {
  vi.clearAllMocks();
  fake.demo = false;
  fake.signInWithPassword.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("customer signup after student-ID integration", () => {
  function signupForm() {
    const data = form("alex@example.test", "password");
    for (const [key, value] of Object.entries({
      firstName: "Alex", lastName: "Climber", studentId: "v00123456",
      phone: "2505550100", dateOfBirth: "1990-01-01",
    })) data.set(key, value);
    return data;
  }

  it("persists the normalized student ID in real account metadata", async () => {
    fake.signUp.mockResolvedValue({ data: { user: { id: "new-user" }, session: null }, error: null });
    expect(await signUpCustomer({}, signupForm())).toHaveProperty("success");
    expect(fake.signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: { data: expect.objectContaining({ studentId: "V00123456" }) },
    }));
  });

  it("reports a taken demo student ID without replacing the current session", async () => {
    fake.demo = true;
    fake.createClimber.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("taken", {
      code: "P2002", clientVersion: "test",
    }));
    expect(await signUpCustomer({}, signupForm())).toMatchObject({
      errors: { studentId: expect.stringContaining("already has this student ID") },
      values: { studentId: "V00123456" },
    });
    expect(fake.clearSession).not.toHaveBeenCalled();
  });
});

describe("login", () => {
  it("sends staff to the desk and clears any demo cookie", async () => {
    fake.findAccount.mockResolvedValue(account(true, []));
    await expect(login({}, form("desk@elevate.test", "pw"))).rejects.toThrow("redirect /desk");
    expect(fake.clearSession).toHaveBeenCalled();
  });

  it("sends a climber to /me", async () => {
    fake.findAccount.mockResolvedValue(account(false, ["c1"]));
    await expect(login({}, form("climber@elevate.test", "pw"))).rejects.toThrow("redirect /me");
  });

  it("signs in with the email trimmed and lowercased", async () => {
    fake.findAccount.mockResolvedValue(account(false, ["c1"]));
    await login({}, form("  Climber@Elevate.TEST ", "pw")).catch(() => {});
    expect(fake.signInWithPassword).toHaveBeenCalledWith({
      email: "climber@elevate.test",
      password: "pw",
    });
  });

  it("gives the same error for a wrong password as for an unknown email", async () => {
    fake.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { code: "invalid_credentials" },
    });
    expect(await login({}, form("someone@elevate.test", "wrong"))).toEqual({
      error: "Unknown email or password.",
    });
    expect(fake.findAccount).not.toHaveBeenCalled();
  });

  it("sends a login with no staff row or climber to gym discovery", async () => {
    fake.findAccount.mockResolvedValue(account(false, []));
    await expect(login({}, form("stranger@elevate.test", "pw"))).rejects.toThrow("redirect /me/explore");
  });

  it("retries a confirmed owner's pending gym setup on login", async () => {
    fake.findAccount.mockResolvedValue(account(false, []));
    fake.signInWithPassword.mockResolvedValue({
      data: { user: {
        id: "u1", email_confirmed_at: "confirmed",
        user_metadata: { pendingGym: { gymName: "New Gym", ownerName: "Owner" } },
      } },
      error: null,
    });
    fake.provisionGym.mockResolvedValue({ gymId: "new-gym" });
    await expect(login({}, form("owner@example.test", "pw"))).rejects.toThrow("redirect /desk");
    expect(fake.provisionGym).toHaveBeenCalledWith("u1", expect.objectContaining({ gymName: "New Gym" }));
  });

  it("doesn't call Supabase when a field is empty", async () => {
    expect(await login({}, form("", "pw"))).toEqual({ error: "Unknown email or password." });
    expect(fake.signInWithPassword).not.toHaveBeenCalled();
  });
});
