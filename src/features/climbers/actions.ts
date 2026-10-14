"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { climberStore } from "./mock-data";
import type { FormState } from "./types";
import { parseClimberInput, type ParsedClimberInput } from "./validate";

// TODO(auth): createClimberAtDesk and updateClimber are staff-only. Check the
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

// /join: a new customer registers themselves.
export async function joinAsCustomer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseClimberInput(formData);
  if (!parsed.ok) return invalid(parsed);

  climberStore().push({
    id: `climber-${randomUUID()}`,
    ...parsed.value,
    waiverStatus: "missing",
  });
  revalidatePath("/desk/climbers");
  return {
    status: "success",
    message: "You're registered. Head to the front desk to check in.",
  };
}

// /desk/climbers/new: staff add a climber with the same fields.
export async function createClimberAtDesk(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseClimberInput(formData);
  if (!parsed.ok) return invalid(parsed);

  climberStore().push({
    id: `climber-${randomUUID()}`,
    ...parsed.value,
    waiverStatus: "missing",
  });
  revalidatePath("/desk/climbers");
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
  revalidatePath("/desk/climbers");
  revalidatePath(`/desk/climbers/${climberId}`);
  return { status: "success", message: "Saved." };
}
