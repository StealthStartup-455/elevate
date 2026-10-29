import { redirect } from "next/navigation";
import { getCurrentUser, getSessionClimberId } from "./queries";
import { hasDemoDeskSession } from "./session";

// The staff check for everything under /desk. The proxy only checks that
// someone is signed in, and a check in the desk layout alone isn't enough: a
// layout doesn't re-run on navigation, and a page can render without it (the
// Next.js auth guide, "Layouts and auth checks"). So desk-only queries, desk
// pages and staff actions each call this, next to the data.

export async function isStaff(): Promise<boolean> {
  if (await hasDemoDeskSession()) return true;
  return !!(await getCurrentUser())?.staff;
}

// Where a signed-in person who isn't staff lands (#87): a page that says the
// desk is for staff, instead of a login page that looks like being logged out.
export const STAFF_ONLY_PATH = "/staff-only";

// Signed in at all: the demo climber cookie or a real Supabase login.
async function isSignedIn(): Promise<boolean> {
  if (await getSessionClimberId()) return true;
  return (await getCurrentUser()) !== null;
}

// Lets staff through. Anyone else goes to the staff-only page if they're
// signed in (a climber), or to log in if they aren't.
export async function requireStaff(): Promise<void> {
  if (await isStaff()) return;
  redirect((await isSignedIn()) ? STAFF_ONLY_PATH : "/login");
}
