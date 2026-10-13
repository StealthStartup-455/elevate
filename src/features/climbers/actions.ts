"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { climberStore } from "./mock-data";
import type { FormState } from "./types";
import { parseClimberInput } from "./validate";

// /join: a new customer registers themselves. Intentionally public: it only
// creates a new record and never reads or changes existing ones.
export async function joinAsCustomer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseClimberInput(formData);
  if (!parsed.ok) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      errors: parsed.errors,
      values: parsed.values,
    };
  }

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
