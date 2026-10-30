import type { StaffRole } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { getGym } from "@/lib/gym";
import { getCurrentUser } from "./queries";
import { hasDemoDeskSession } from "./session";

// The staff check for everything under /desk. The proxy only checks that
// someone is signed in, and a check in the desk layout alone isn't enough: a
// layout doesn't re-run on navigation, and a page can render without it (the
// Next.js auth guide, "Layouts and auth checks"). So desk-only queries, desk
// pages and staff actions each call this, next to the data.

export type StaffContext = {
  id: string | null;
  gymId: string;
  role: StaffRole;
};

export async function getStaffContext(): Promise<StaffContext | null> {
  if (await hasDemoDeskSession()) {
    const gym = await getGym();
    return { id: null, gymId: gym.id, role: "DESK" };
  }
  const user = await getCurrentUser();
  if (user?.staff) return user.staff;
  return null;
}

export async function hasStaffRole(...roles: StaffRole[]): Promise<boolean> {
  const staff = await getStaffContext();
  return !!staff && (roles.length === 0 || roles.includes(staff.role));
}

export async function requireStaffRole(...roles: StaffRole[]): Promise<void> {
  if (!(await hasStaffRole(...roles))) redirect("/login");
}

export async function isStaff(): Promise<boolean> {
  return hasStaffRole("DESK", "MANAGER", "OWNER");
}

// Sends anyone who isn't staff to log in, signed in or not.
export async function requireStaff(): Promise<void> {
  return requireStaffRole("DESK", "MANAGER", "OWNER");
}
