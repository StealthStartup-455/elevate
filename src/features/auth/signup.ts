import { toStoredPhone } from "@/features/climbers/phone";
import type { ClimberInput, FieldErrors } from "@/features/climbers/types";
import { parseClimberInput } from "@/features/climbers/validate";

export type CustomerSignup = {
  email: string;
  password: string;
  profile: ClimberInput;
};

export type SignupFieldErrors = FieldErrors & {
  password?: string;
  gymName?: string;
  ownerName?: string;
};

export function signupCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const errors: SignupFieldErrors = {};
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!password) errors.password = "Enter a password.";
  return { email, password, errors };
}

export function parseCustomerSignup(formData: FormData):
  | { ok: true; value: CustomerSignup }
  | { ok: false; errors: SignupFieldErrors; values: ClimberInput } {
  const { email, password, errors: credentialErrors } = signupCredentials(formData);
  const parsed = parseClimberInput(formData);
  const errors = { ...(!parsed.ok ? parsed.errors : {}), ...credentialErrors };
  if (!parsed.ok || Object.keys(errors).length > 0) {
    return { ok: false, errors, values: parsed.ok ? parsed.value : parsed.values };
  }
  return {
    ok: true,
    value: {
      email,
      password,
      profile: { ...parsed.value, phone: toStoredPhone(parsed.value.phone) },
    },
  };
}
