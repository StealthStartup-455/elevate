import type { StaffRole } from "@/generated/prisma/client";

// Who runs the gym rather than the desk (#254): only managers and owners
// revoke memberships and set the hours, events and class types. Desk staff
// can still see all of it.
export function isManagerRole(role: StaffRole | null | undefined): boolean {
  return role === "MANAGER" || role === "OWNER";
}
