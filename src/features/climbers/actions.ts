"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { setSession } from "@/features/auth/session";
import { ACTIVE_WINDOW_MINUTES } from "@/features/analytics/config";
import { getStaffContext, requireStaff } from "@/features/auth/staff";
import { db } from "@/lib/db";
import { getGym, getGymById } from "@/lib/gym";
import { logEvent, logWarning } from "@/lib/log";
import { finishScansForClimber } from "@/features/check-ins/scan-store";
import { isPosEnabled } from "@/features/pos/queries";
import { recordCheckInAttempt } from "@/features/metrics/record";
import { parseCheckInTiming, type CheckInTiming } from "@/features/metrics/timing";
import { findPossibleDuplicates, getClimber, searchClimbers } from "./queries";
import { storedStudentId } from "./student-id";
import { toStoredPhone } from "./phone";
import { endOfGymDay } from "./status";
import type { CheckInCandidate, ClimberInput, FormState } from "./types";
import { parseClimberInput, type ParsedClimberInput } from "./validate";

// Server actions are public POST endpoints, so each one checks the caller
// itself; a page guard is not enough. createClimberAtDesk, updateClimber and
// checkInClimber are staff only. joinAsCustomer is intentionally public: it only creates a new record.

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

// One student ID belongs to one climber in a gym, so the barcode finds one
// person (#38). Checked first for a friendly message; the database's unique
// index still has the last word if two sign-ups race.
async function studentIdTaken(
  gymId: string,
  parsed: Extract<ParsedClimberInput, { ok: true }>,
  exceptClimberId?: string,
): Promise<FormState | null> {
  if (!parsed.value.studentId) return null;
  const other = await db.climber.findFirst({
    where: { gymId, studentId: parsed.value.studentId, id: exceptClimberId ? { not: exceptClimberId } : undefined },
    select: { id: true },
  });
  if (!other) return null;
  logEvent("climber_form_invalid", { form: exceptClimberId ? "desk_edit" : "join", fields: "studentId_taken" });
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    errors: { studentId: "Another climber already has this student ID. Check it and try again." },
    values: parsed.value,
  };
}

const RETRY: FormState = { status: "error", message: "Something went wrong. Please try again." };

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

// #129: before adding a climber, look for someone who may already be them. A
// match returns "duplicate" without saving; the form sends `confirmKey` back
// as `confirmDuplicate` to add them anyway. On the desk the key is the matched
// ids, so a changed form that matches someone else warns again.
async function duplicateWarning(
  gymId: string,
  input: ClimberInput,
  formData: FormData,
  rule: "desk" | "join",
): Promise<FormState | null> {
  const columns = toColumns(input);
  const matches = await findPossibleDuplicates(gymId, columns, rule);
  if (matches.length === 0) return null;
  const confirmKey =
    rule === "desk"
      ? matches
          .map((m) => m.id)
          .sort()
          .join(",")
      : "new-person";
  if (formData.get("confirmDuplicate") === confirmKey) return null;
  logEvent("climber_possible_duplicate", { gymId, form: rule, matches: matches.length });
  if (rule === "join") {
    // Nothing about the other person: /join is public.
    return {
      status: "duplicate",
      message:
        "You may already have an account here. Ask the front desk to find it, or create a new account if this is someone else.",
      values: input,
      confirmKey,
    };
  }
  return {
    status: "duplicate",
    message: "This person may already exist. Open them instead, or add a new customer anyway.",
    values: input,
    duplicates: matches,
    confirmKey,
  };
}

function refreshClimberPages(climberId?: string) {
  revalidatePath("/desk");
  revalidatePath("/desk/customers");
  revalidatePath("/me", "layout");
  if (climberId) revalidatePath(`/desk/customers/${climberId}`);
}

// The columns for the fields the form edits. Waiver and membership are not
// part of the form, so a new climber has neither until they sign / buy.
function toColumns(input: ClimberInput) {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    studentId: storedStudentId(input.studentId),
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
  const taken = await studentIdTaken(gym.id, parsed);
  if (taken) return taken;
  const warning = await duplicateWarning(gym.id, parsed.value, formData, "join");
  if (warning) return warning;
  const climber = await db.climber
    .create({ data: { gymId: gym.id, ...toColumns(parsed.value) }, select: { id: true } })
    .catch((error: unknown) => {
      if (isUniqueViolation(error)) return null;
      throw error;
    });
  if (!climber) return (await studentIdTaken(gym.id, parsed)) ?? RETRY;
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

// /desk/customers/new: staff add a climber with the same fields, then land on
// their page with the waiver step, as /join does (#88).
export async function createClimberAtDesk(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();
  const staff = await getStaffContext();
  if (!staff) return { status: "error", message: "You need to be signed in as staff." };
  const parsed = parseClimberInput(formData);
  if (!parsed.ok) return invalid(parsed, "desk_add");

  const gymId = staff.gymId;
  const taken = await studentIdTaken(gymId, parsed);
  if (taken) return taken;
  const warning = await duplicateWarning(gymId, parsed.value, formData, "desk");
  if (warning) return warning;
  // TODO(auth): set createdByStaffId from the logged-in staff member.
  const climber = await db.climber
    .create({ data: { gymId, ...toColumns(parsed.value) }, select: { id: true } })
    .catch((error: unknown) => {
      if (isUniqueViolation(error)) return null;
      throw error;
    });
  if (!climber) return (await studentIdTaken(gymId, parsed)) ?? RETRY;
  logEvent("climber_created", { gymId, climberId: climber.id, source: "desk" });
  refreshClimberPages();
  redirect(`/desk/customers/${climber.id}?added=1`);
}

// /desk/customers/[climberId]: staff edit an existing climber's details.
export async function updateClimber(
  climberId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();
  const staff = await getStaffContext();
  if (!staff) return { status: "error", message: "You need to be signed in as staff." };
  const parsed = parseClimberInput(formData);
  if (!parsed.ok) return invalid(parsed, "desk_edit");
  if (!UUID.test(climberId)) return { status: "error", message: "Climber not found." };

  const taken = await studentIdTaken(staff.gymId, parsed, climberId);
  if (taken) return taken;
  const { count } = await db.climber
    .updateMany({ where: { id: climberId, gymId: staff.gymId }, data: toColumns(parsed.value) })
    .catch((error: unknown) => {
      if (isUniqueViolation(error)) return { count: -1 };
      throw error;
    });
  if (count === -1) return (await studentIdTaken(staff.gymId, parsed, climberId)) ?? RETRY;
  if (count === 0) return { status: "error", message: "Climber not found." };

  logEvent("climber_updated", { gymId: staff.gymId, climberId });
  refreshClimberPages(climberId);
  return { status: "success", message: "Saved." };
}

// STOPGAP(#62): staff give a climber with a valid waiver and no active
// membership a no-charge day pass, so a new sign-up can climb today. Saves a
// DAY Pass row that ends at midnight in the gym's time zone. Replace with real
// day-pass purchases (#44 to #46).
export async function giveDayPass(
  climberId: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireStaff();
  const staff = await getStaffContext();
  if (!staff) return { ok: false, message: "You need to be signed in as staff." };
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

  const gym = await getGymById(staff.gymId);
  if (!gym) return refuse("not_found", "Climber not found.");
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
// prisma/DATABASE.md: a current waiver, and an active membership, a day pass
// or a punch card with visits left (which loses one punch). Turned-away visits
// are not saved. Saves a CheckIn row, so the desk list and the busyness count
// pick it up.
//
// `timing` is what the Check in dialog measured (how staff found the climber,
// how long it took, what blocked them); every outcome is saved as a
// CheckInAttempt for the value proposition metrics (#251).
export async function checkInClimber(
  climberId: string,
  timing?: CheckInTiming,
): Promise<{ ok: boolean; message?: string }> {
  await requireStaff();
  const staff = await getStaffContext();
  if (!staff) return { ok: false, message: "You need to be signed in as staff." };
  const measured = parseCheckInTiming(timing);
  const attempt = { ...measured, gymId: staff.gymId, climberId: UUID.test(climberId) ? climberId : null };
  // TODO(auth): set staffId from the logged-in staff member.
  // Every refusal is logged with a reason code: which rule turns people away
  // (missing waiver, no membership, already in) is evidence for the pilot.
  const refuse = async (reason: string, message: string) => {
    logEvent("check_in_refused", { climberId, reason });
    await recordCheckInAttempt({ ...attempt, outcome: "REFUSED", reason, wasBlocked: true });
    return { ok: false, message };
  };
  if (!UUID.test(climberId)) return refuse("invalid_id", "Climber not found.");

  const climber = await getClimber(climberId);
  if (!climber) return refuse("not_found", "Climber not found.");
  if (climber.waiverStatus !== "valid") {
    return refuse(`waiver_${climber.waiverStatus}`, "Waiver is not valid. Sign a waiver first.");
  }
  // A membership or day pass comes first; a punch card is only used without.
  const usePunch = climber.membershipStatus !== "active" && !climber.hasDayPass;
  if (usePunch && climber.punchesLeft === 0) {
    return refuse(
      `membership_${climber.membershipStatus}`,
      "No active membership, day pass or punch card.",
    );
  }

  // Staff cannot check in a climber from another gym.
  const target = await db.climber.findFirst({
    where: { id: climberId, gymId: staff.gymId },
    select: { id: true },
  });
  if (!target) return refuse("not_found", "Climber not found.");

  // The same visit isn't saved twice: busyness counts a climber for two hours.
  const recent = await db.checkIn.findFirst({
    where: {
      gymId: staff.gymId,
      climberId,
      checkedInAt: { gt: new Date(Date.now() - ACTIVE_WINDOW_MINUTES * 60_000) },
    },
    select: { id: true },
  });
  if (recent) return refuse("already_checked_in", "Already checked in in the last 2 hours.");

  const now = new Date();
  const saved = await db.$transaction(async (tx) => {
    if (usePunch) {
      // The oldest card first. `gt: 0` stops two desks using the last punch.
      const card = await tx.pass.findFirst({
        where: {
          gymId: staff.gymId,
          climberId,
          kind: "PUNCH",
          visitsLeft: { gt: 0 },
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { startsAt: "asc" },
        select: { id: true },
      });
      if (!card) return false;
      const { count } = await tx.pass.updateMany({
        where: { id: card.id, visitsLeft: { gt: 0 } },
        data: { visitsLeft: { decrement: 1 } },
      });
      if (count === 0) return false;
    }
    await tx.checkIn.create({
      data: { gymId: staff.gymId, climberId, method: "FRONT_DESK" },
    });
    return true;
  });
  if (!saved) return refuse("no_punches_left", "No punches left on their card.");
  logEvent("check_in_saved", {
    gymId: staff.gymId,
    climberId,
    method: "FRONT_DESK",
    pass: usePunch ? "punch" : "membership_or_day",
  });
  await recordCheckInAttempt({ ...attempt, outcome: "CHECKED_IN" });
  // However staff checked them in, their waiting scans are dealt with, so the
  // arrival leaves Arrivals on every desk (#225). Logged like Close (scan_taken).
  // The check-in is saved: a failure here must not report it as failed (a
  // retry would then say "Already checked in"). The scan just waits in
  // Arrivals until it expires or someone clears it.
  try {
    for (const scan of await finishScansForClimber(staff.gymId, climberId, now)) {
      logEvent("scan_taken", {
        gymId: staff.gymId,
        climberId,
        waitMs: now.getTime() - scan.scannedAt.getTime(),
        outcome: "checked_in",
      });
    }
  } catch (error) {
    logWarning("scan_finish_failed", {
      gymId: staff.gymId,
      climberId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  revalidatePath("/desk");
  revalidatePath("/me", "layout");
  return { ok: true };
}

// Manual check in search (#85): the best few matches for what staff typed,
// found on the server, so the desk page doesn't carry every climber. Staff
// only (searchClimbers checks).
const MAX_CANDIDATES = 8;

export async function findClimbersToCheckIn(query: string): Promise<CheckInCandidate[]> {
  const [climbers, posEnabled] = await Promise.all([
    searchClimbers(String(query ?? ""), MAX_CANDIDATES),
    isPosEnabled(),
  ]);
  return climbers.map((c) => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
    studentId: c.studentId,
    phone: c.phone,
    dateOfBirth: c.dateOfBirth,
    waiverStatus: c.waiverStatus,
    waiverExpiresOn: c.waiverExpiresOn,
    membershipStatus: c.membershipStatus,
    membershipRenewsOn: c.membershipRenewsOn,
    membershipRecurring: c.membershipRecurring,
    hasDayPass: c.hasDayPass,
    punchesLeft: c.punchesLeft,
    posEnabled,
  }));
}
