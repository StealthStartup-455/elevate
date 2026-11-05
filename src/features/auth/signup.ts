import { toStoredPhone } from "@/features/climbers/phone";
import type { ClimberInput } from "@/features/climbers/types";
import { parseClimberInput } from "@/features/climbers/validate";

export type CustomerSignup = {
  email: string;
  password: string;
  profile: ClimberInput;
};

export function parseCustomerSignup(formData: FormData): CustomerSignup | null {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const parsed = parseClimberInput(formData);
  if (!email || !password || !parsed.ok) return null;
  return {
    email,
    password,
    profile: { ...parsed.value, phone: toStoredPhone(parsed.value.phone) },
  };
}
