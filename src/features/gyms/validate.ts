import { signupCredentials } from "@/features/auth/signup";

export type GymInput = {
  gymName: string;
  ownerName: string;
  timeZone: string;
};

export function slugFromGymName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function parseGymInput(formData: FormData): GymInput | null {
  const gymName = String(formData.get("gymName") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const timeZone = "America/Vancouver";
  if (!gymName || gymName.length > 100 || !ownerName || ownerName.length > 120 || !slugFromGymName(gymName)) {
    return null;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
  } catch {
    return null;
  }
  return { gymName, ownerName, timeZone };
}

export function parseGymSignup(formData: FormData) {
  const credentials = signupCredentials(formData);
  const gymName = String(formData.get("gymName") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const errors = { ...credentials.errors };
  if (!gymName || gymName.length > 100 || !slugFromGymName(gymName)) {
    errors.gymName = "Enter a gym name of 100 characters or fewer, including letters or numbers.";
  }
  if (!ownerName || ownerName.length > 120) {
    errors.ownerName = "Enter your name using 120 characters or fewer.";
  }
  return {
    gym: parseGymInput(formData),
    ...credentials,
    errors,
    values: { gymName, ownerName, email: credentials.email },
  };
}

export function pendingGymInput(value: unknown): GymInput | null {
  if (!value || typeof value !== "object" || !("gymName" in value) || !("ownerName" in value)) {
    return null;
  }
  if (typeof value.gymName !== "string" || typeof value.ownerName !== "string") return null;
  const form = new FormData();
  form.set("gymName", value.gymName);
  form.set("ownerName", value.ownerName);
  return parseGymInput(form);
}
