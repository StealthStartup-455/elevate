"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionClimberId } from "@/features/auth/queries";
import { setSession } from "@/features/auth/session";
import { isStaff, requireStaff } from "@/features/auth/staff";
import { db } from "@/lib/db";
import { getGym } from "@/lib/gym";
import { logEvent } from "@/lib/log";
import { getClimber } from "./queries";
import { toStoredPhone } from "./phone";
import { endOfGymDay } from "./status";
import type { ClimberInput, FormState } from "./types";
import { parseClimberInput, type ParsedClimberInput } from "./validate";

// Server actions are public POST endpoints, so each one checks the caller
// itself; a page guard is not enough. createClimberAtDesk, updateClimber and
// checkInClimber are staff only, and signWaiver takes the caller's own id (or
// staff). joinAsCustomer is intentionally public: it only creates a new record.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Logs which fields failed (names only, never what was typed), so we can see
// which parts of the form trip people up.
function invalid(
  parsed: Extract<ParsedClimberInput, { ok: false }>,
  form: "join" | "desk_add" | "desk_edit",
): FormState {
  logEvent("climber_form_invalid", { form, fields: Object.keys(parsed.errors).sort().join(",") });
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    errors: parsed.errors,
    values: parsed.values,
  };
}

function refreshClimberPages(climberId?: string) {
  revalidatePath("/desk");
  revalidatePath("/desk/climbers");
  revalidatePath("/me");
  if (climberId) revalidatePath(`/desk/climbers/${climberId}`);
}

// The columns for the fields the form edits. Waiver and membership are not
// part of the form, so a new climber has neither until they sign / buy.
function toColumns(input: ClimberInput) {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    phone: toStoredPhone(input.phone),
    email: input.email || null,
    dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00Z`),
  };
}

// /join: a new customer registers themselves.
export async function joinAsCustomer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseClimberInput(formData);
  if (!parsed.ok) return invalid(parsed, "join");

  const gym = await getGym();
  const climber = await db.climber.create({
    data: { gymId: gym.id, ...toColumns(parsed.value) },
    select: { id: true },
  });
  logEvent("climber_created", { gymId: gym.id, climberId: climber.id, source: "self" });
  // Demo only: "sign in" as the new climber so /me shows their account.
  await setSession(climber.id);
  refreshClimberPages();
  return {
    status: "success",
    message: "You're registered. Head to the front desk to check in.",
    climberId: climber.id,
  };
}

// /desk/climbers/new: staff add a climber with the same fields.
export async function createClimberAtDesk(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();
  const parsed = parseClimberInput(formData);
  if (!parsed.ok) return invalid(parsed, "desk_add");

  const gym = await getGym();
  // TODO(auth): set createdByStaffId from the logged-in staff member.
  const climber = await db.climber.create({
    data: { gymId: gym.id, ...toColumns(parsed.value) },
    select: { id: true },
  });
  logEvent("climber_created", { gymId: gym.id, climberId: climber.id, source: "desk" });
  refreshClimberPages();
  redirect("/desk/climbers");
}

// /desk/climbers/[climberId]: staff edit an existing climber's details.
export async function updateClimber(
  climberId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();
  const parsed = parseClimberInput(formData);
  if (!parsed.ok) return invalid(parsed, "desk_edit");
  if (!UUID.test(climberId)) return { status: "error", message: "Climber not found." };

  const gym = await getGym();
  const { count } = await db.climber.updateMany({
    where: { id: climberId, gymId: gym.id },
    data: toColumns(parsed.value),
  });
  if (count === 0) return { status: "error", message: "Climber not found." };

  logEvent("climber_updated", { gymId: gym.id, climberId });
  refreshClimberPages(climberId);
  return { status: "success", message: "Saved." };
}

// Records a signed waiver for the climber, valid for a year. The signing
// itself is a placeholder until the waivers feature exists: it saves a new
// Waiver row (old ones are kept, they are legal records).
export async function signWaiver(
  climberId: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!UUID.test(climberId)) return { ok: false, message: "Climber not found." };
  // The climber signs on /join or /me, staff sign for them on the desk.
  if (climberId !== (await getSessionClimberId()) && !(await isStaff())) {
    return { ok: false, message: "Log in to sign the waiver." };
  }

  const gym = await getGym();
  const climber = await db.climber.findFirst({
    where: { id: climberId, gymId: gym.id },
    select: { firstName: true, lastName: true },
  });
  if (!climber) return { ok: false, message: "Climber not found." };

  await db.waiver.create({
    data: {
      gymId: gym.id,
      climberId,
      version: gym.waiverVersion ?? "v1",
      signedByName: `${climber.firstName} ${climber.lastName}`,
    },
  });
  logEvent("waiver_signed", { gymId: gym.id, climberId, version: gym.waiverVersion ?? "v1" });
  refreshClimberPages(climberId);
  return { ok: true };
}

// STOPGAP(#62): staff give a climber with a valid waiver and no active
// membership a no-charge day pass, so a new sign-up can climb today. Saves a
// DAY Pass row that ends at midnight in the gym's time zone. Replace with real
// day-pass purchases (#44 to #46).
export async function giveDayPass(
  climberId: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireStaff();
  // TODO(auth): record which staff member gave the pass.
  const refuse = (reason: string, message: string) => {
    logEvent("day_pass_refused", { climberId, reason });
    return { ok: false, message };
  };
  if (!UUID.test(climberId)) return refuse("invalid_id", "Climber not found.");

  const climber = await getClimber(climberId);
  if (!climber) return refuse("not_found", "Climber not found.");
  if (climber.waiverStatus !== "valid") {
    return refuse(`waiver_${climber.waiverStatus}`, "Waiver is not valid. Sign a waiver first.");
  }
  if (climber.membershipStatus === "active") {
    return refuse("membership_active", "Already has an active membership.");
  }
  // Pressing it twice is fine: today's pass is already there.
  if (climber.hasDayPass) return { ok: true };

  const gym = await getGym();
  const now = new Date();
  await db.pass.create({
    data: {
      gymId: gym.id,
      climberId,
      kind: "DAY",
      startsAt: now,
      expiresAt: endOfGymDay(now, gym.timeZone),
    },
  });
  logEvent("day_pass_given", { gymId: gym.id, climberId, charge: "none" });
  refreshClimberPages(climberId);
  return { ok: true };
}

// Front desk "manual check in" (the desk dialog). Follows the rules in
// prisma/DATABASE.md: a current waiver and an active membership. Turned-away
// visits are not saved. Saves a CheckIn row, so the desk list and the busyness
// count pick it up.
export async function checkInClimber(
  climberId: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireStaff();
  // TODO(auth): set staffId from the logged-in staff member.
  // Every refusal is logged with a reason code: which rule turns people away
  // (missing waiver, no membership, already in) is evidence for the pilot.
  const refuse = (reason: string, message: string) => {
    logEvent("check_in_refused", { climberId, reason });
    return { ok: false, message };
  };
  if (!UUID.test(climberId)) return refuse("invalid_id", "Climber not found.");

  const climber = await getClimber(climberId);
  if (!climber) return refuse("not_found", "Climber not found.");
  if (climber.waiverStatus !== "valid") {
    return refuse(`waiver_${climber.waiverStatus}`, "Waiver is not valid. Sign a waiver first.");
  }
  // STOPGAP(#62): a no-charge day pass stands in for a membership until
  // purchases exist (#44 to #46).
  if (climber.membershipStatus !== "active" && !climber.hasDayPass) {
    return refuse(`membership_${climber.membershipStatus}`, "No active membership or day pass.");
  }

  const gym = await getGym();
  // The same visit isn't saved twice: busyness counts a climber for two hours.
  const recent = await db.checkIn.findFirst({
    where: {
      gymId: gym.id,
      climberId,
      checkedInAt: { gt: new Date(Date.now() - 120 * 60 * 1000) },
    },
    select: { id: true },
  });
  if (recent) return refuse("already_checked_in", "Already checked in in the last 2 hours.");

  await db.checkIn.create({
    data: { gymId: gym.id, climberId, method: "FRONT_DESK" },
  });
  logEvent("check_in_saved", { gymId: gym.id, climberId, method: "FRONT_DESK" });
  revalidatePath("/desk");
  revalidatePath("/me");
  return { ok: true };
}
