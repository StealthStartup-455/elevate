import { redirect } from "next/navigation";
import { getCurrentUser } from "./queries";
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

// Sends anyone who isn't staff to log in, signed in or not.
export async function requireStaff(): Promise<void> {
  if (!(await isStaff())) redirect("/login");
}
