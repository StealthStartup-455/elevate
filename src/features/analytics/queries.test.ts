import { describe, expect, it, vi } from "vitest";
import { getFrontDeskBusyness } from "./queries";

// The front desk list has names and phone numbers, so it checks for staff
// itself rather than relying on whoever calls it.
const getSavedCheckIns = vi.hoisted(() => vi.fn(async () => []));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/features/climbers/queries", () => ({ getSavedCheckIns }));
vi.mock("@/features/auth/staff", () => ({
  requireStaff: async () => {
    throw new Error("redirect /login");
  },
}));

describe("getFrontDeskBusyness", () => {
  it("sends anyone who isn't staff to log in before reading check-ins", async () => {
    await expect(getFrontDeskBusyness("gym")).rejects.toThrow("redirect /login");
    expect(getSavedCheckIns).not.toHaveBeenCalled();
  });
});
