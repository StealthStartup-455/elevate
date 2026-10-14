"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { MOCK_USER_COOKIE } from "@/features/auth/mock-users";
import { addMockClimber, climberStore } from "./mock-data";
import type { FormState } from "./types";
import { parseClimberInput, type ParsedClimberInput } from "./validate";

// TODO(auth): createClimberAtDesk and updateClimber are staff-only, and
// signWaiver must only accept the caller's own id (or staff). Check the
// caller's role here once features/auth exists; a page guard is not enough.
// joinAsCustomer is intentionally public: it only creates a new record.

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

// /join: a new customer registers themselves.
export async function joinAsCustomer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseClimberInput(formData);
  if (!parsed.ok) return invalid(parsed);

  const climber = addMockClimber(parsed.value);
  // Demo only: "sign in" as the new climber so /me shows their account.
  if (process.env.NODE_ENV !== "production") {
    (await cookies()).set(MOCK_USER_COOKIE, climber.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
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

  addMockClimber(parsed.value);
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

  const climber = climberStore().find((c) => c.id === climberId);
  if (!climber) return { status: "error", message: "Climber not found." };

  Object.assign(climber, parsed.value);
  refreshClimberPages(climberId);
  return { status: "success", message: "Saved." };
}

// Marks the climber's waiver as signed today, valid for a year. The signing
// itself is a placeholder until the waivers feature exists.
export async function signWaiver(
  climberId: string,
): Promise<{ ok: boolean; message?: string }> {
  const climber = climberStore().find((c) => c.id === climberId);
  if (!climber) return { ok: false, message: "Climber not found." };

  const now = new Date();
  const expires = new Date(
    Date.UTC(now.getUTCFullYear() + 1, now.getUTCMonth(), now.getUTCDate()),
  );
  climber.waiverStatus = "valid";
  climber.waiverExpiresOn = expires.toISOString().slice(0, 10);
  refreshClimberPages(climberId);
  return { ok: true };
}
