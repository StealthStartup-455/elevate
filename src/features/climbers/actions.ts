"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { setSession } from "@/features/auth/session";
import { db } from "@/lib/db";
import { getGym } from "@/lib/gym";
import { getClimber } from "./queries";
import { toStoredPhone } from "./phone";
import type { ClimberInput, FormState } from "./types";
import { parseClimberInput, type ParsedClimberInput } from "./validate";

// TODO(auth): createClimberAtDesk and updateClimber are staff-only, and
// signWaiver must only accept the caller's own id (or staff). Check the
// caller's role here once features/auth exists; a page guard is not enough.
// joinAsCustomer is intentionally public: it only creates a new record.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function invalid(
  parsed: Extract<ParsedClimberInput, { ok: false }>,
): FormState {
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
  if (!parsed.ok) return invalid(parsed);

  const gym = await getGym();
  const climber = await db.climber.create({
    data: { gymId: gym.id, ...toColumns(parsed.value) },
    select: { id: true },
  });
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
  const parsed = parseClimberInput(formData);
  if (!parsed.ok) return invalid(parsed);

  const gym = await getGym();
  // TODO(auth): set createdByStaffId from the logged-in staff member.
  await db.climber.create({ data: { gymId: gym.id, ...toColumns(parsed.value) } });
  refreshClimberPages();
  redirect("/desk/climbers");
}

// /desk/climbers/[climberId]: staff edit an existing climber's details.
export async function updateClimber(
  climberId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseClimberInput(formData);
  if (!parsed.ok) return invalid(parsed);
  if (!UUID.test(climberId)) return { status: "error", message: "Climber not found." };

  const gym = await getGym();
  const { count } = await db.climber.updateMany({
    where: { id: climberId, gymId: gym.id },
    data: toColumns(parsed.value),
  });
  if (count === 0) return { status: "error", message: "Climber not found." };

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
  // TODO(auth): staff only; set staffId from the logged-in staff member.
  if (!UUID.test(climberId)) return { ok: false, message: "Climber not found." };

  const climber = await getClimber(climberId);
  if (!climber) return { ok: false, message: "Climber not found." };
  if (climber.waiverStatus !== "valid") {
    return { ok: false, message: "Waiver is not valid. Sign a waiver first." };
  }
  if (climber.membershipStatus !== "active") {
    return { ok: false, message: "No active membership." };
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
  if (recent) return { ok: false, message: "Already checked in in the last 2 hours." };

  await db.checkIn.create({
    data: { gymId: gym.id, climberId, method: "FRONT_DESK" },
  });
  revalidatePath("/desk");
  revalidatePath("/me");
  return { ok: true };
}
