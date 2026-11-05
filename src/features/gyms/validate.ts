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
