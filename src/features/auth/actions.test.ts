import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "./queries";
import { login } from "./actions";

// The real (Supabase) login, with Supabase and the database faked so it runs
// in CI. redirect() throws in Next.js too, so nothing after it runs.
const fake = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  findAccount: vi.fn(),
  clearSession: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { signInWithPassword: fake.signInWithPassword, signOut: fake.signOut },
  }),
}));
vi.mock("./queries", () => ({ findAccount: fake.findAccount }));
vi.mock("./session", () => ({
  clearSession: fake.clearSession,
  setSession: vi.fn(),
  setDeskSession: vi.fn(),
}));
vi.mock("./demo-mode", () => ({ isDemoMode: () => false }));
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
  staff: staff ? { id: "s1", name: "Front Desk", role: "DESK" } : null,
  climberIds,
});

beforeEach(() => {
  vi.clearAllMocks();
  fake.signInWithPassword.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
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

  it("signs a login with no staff row or climber straight back out", async () => {
    fake.findAccount.mockResolvedValue(account(false, []));
    expect(await login({}, form("stranger@elevate.test", "pw"))).toEqual({
      error: "This login isn't set up for the gym yet.",
    });
    expect(fake.signOut).toHaveBeenCalled();
  });

  it("doesn't call Supabase when a field is empty", async () => {
    expect(await login({}, form("", "pw"))).toEqual({ error: "Unknown email or password." });
    expect(fake.signInWithPassword).not.toHaveBeenCalled();
  });
});
