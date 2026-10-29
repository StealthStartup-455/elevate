import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "./queries";
import { isStaff, requireStaff } from "./staff";

// Who is signed in is faked here, so these run in CI without Supabase.
// redirect() throws in Next.js too, so nothing after it runs.
const signedIn = vi.hoisted(() => ({
  user: null as CurrentUser | null,
  demoDesk: false,
  demoClimberId: undefined as string | undefined,
}));
vi.mock("./queries", () => ({
  getCurrentUser: async () => signedIn.user,
  getSessionClimberId: async () => signedIn.demoClimberId ?? signedIn.user?.climberIds[0],
}));
vi.mock("./session", () => ({ hasDemoDeskSession: async () => signedIn.demoDesk }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));

const CLIMBER: CurrentUser = { authUserId: "u1", staff: null, climberIds: ["c1"] };
const STAFF: CurrentUser = {
  authUserId: "u2",
  staff: { id: "s1", name: "Front Desk", role: "DESK" },
  climberIds: [],
};

beforeEach(() => {
  signedIn.user = null;
  signedIn.demoDesk = false;
  signedIn.demoClimberId = undefined;
});

describe("requireStaff", () => {
  it("lets staff through", async () => {
    signedIn.user = STAFF;
    await expect(requireStaff()).resolves.toBeUndefined();
  });

  it("lets the demo desk login through", async () => {
    signedIn.demoDesk = true;
    await expect(requireStaff()).resolves.toBeUndefined();
  });

  it("sends a signed-in climber to the staff-only page, not to log in", async () => {
    signedIn.user = CLIMBER;
    await expect(requireStaff()).rejects.toThrow("redirect /staff-only");
  });

  it("sends a demo climber session to the staff-only page", async () => {
    signedIn.demoClimberId = "c9";
    await expect(requireStaff()).rejects.toThrow("redirect /staff-only");
  });

  it("sends a login with no staff row or climber to the staff-only page", async () => {
    signedIn.user = { authUserId: "u3", staff: null, climberIds: [] };
    await expect(requireStaff()).rejects.toThrow("redirect /staff-only");
  });

  it("sends a logged-out visitor to log in", async () => {
    await expect(requireStaff()).rejects.toThrow("redirect /login");
  });
});

describe("isStaff", () => {
  it("is false for a climber", async () => {
    signedIn.user = CLIMBER;
    expect(await isStaff()).toBe(false);
  });
});
