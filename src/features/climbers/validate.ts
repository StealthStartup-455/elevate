import type { ClimberInput, FieldErrors } from "./types";

const MAX_NAME_LENGTH = 60;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function field(formData: FormData, name: keyof ClimberInput): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isRealPastDate(value: string, now: Date): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  // Rejects overflow such as 2024-02-31, which Date rolls into March.
  if (date.toISOString().slice(0, 10) !== value) return false;
  return value >= "1900-01-01" && value <= now.toISOString().slice(0, 10);
}

export type ParsedClimberInput =
  | { ok: true; value: ClimberInput }
  | { ok: false; errors: FieldErrors; values: ClimberInput };

export function parseClimberInput(
  formData: FormData,
  now: Date = new Date(),
): ParsedClimberInput {
  const values: ClimberInput = {
    firstName: field(formData, "firstName"),
    lastName: field(formData, "lastName"),
    phone: field(formData, "phone"),
    dateOfBirth: field(formData, "dateOfBirth"),
  };

  const errors: FieldErrors = {};
  if (!values.firstName) errors.firstName = "Enter a first name.";
  else if (values.firstName.length > MAX_NAME_LENGTH)
    errors.firstName = `Use ${MAX_NAME_LENGTH} characters or fewer.`;

  if (!values.lastName) errors.lastName = "Enter a last name.";
  else if (values.lastName.length > MAX_NAME_LENGTH)
    errors.lastName = `Use ${MAX_NAME_LENGTH} characters or fewer.`;

  const digits = values.phone.replace(/\D/g, "");
  if (!values.phone) errors.phone = "Enter a phone number.";
  else if (digits.length < 10 || digits.length > 15)
    errors.phone = "Enter a valid phone number, including area code.";

  if (!values.dateOfBirth) errors.dateOfBirth = "Enter a date of birth.";
  else if (!isRealPastDate(values.dateOfBirth, now))
    errors.dateOfBirth = "Enter a valid date of birth.";

  return Object.keys(errors).length > 0
    ? { ok: false, errors, values }
    : { ok: true, value: values };
}
