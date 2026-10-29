// Checks the waiver form. Plain functions, like features/climbers/validate.ts,
// so the rules can be unit tested without a database or a browser.
import { toStoredPhone } from "@/features/climbers/phone";

// Under this age a parent or guardian signs. 19 is the age of majority in
// British Columbia, where the pilot gyms are.
export const ADULT_AGE = 19;

const MAX_NAME_LENGTH = 120;
// A drawn signature is a small PNG; anything bigger isn't one.
const MAX_SIGNATURE_IMAGE_LENGTH = 200_000;
const PNG_DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/;

export type SignerRelation = "SELF" | "PARENT" | "GUARDIAN";

export type WaiverFieldErrors = Partial<
  Record<
    | "clauses"
    | "guardianName"
    | "signerRelation"
    | "emergencyContactName"
    | "emergencyContactPhone"
    | "signatureImage"
    | "agree",
    string
  >
>;

export type WaiverSignature = {
  signedByName: string;
  signerRelation: SignerRelation;
  signatureImage: string;
  emergencyContactName: string;
  /** Stored like +12505551234. */
  emergencyContactPhone: string;
};

export type ParsedWaiverSignature =
  | { ok: true; value: WaiverSignature }
  | { ok: false; errors: WaiverFieldErrors };

/** Whole years between a YYYY-MM-DD birthday and `now`. */
export function ageOn(dateOfBirth: string, now: Date): number {
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  const today = now.toISOString().slice(0, 10);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function parseWaiverSignature(
  formData: FormData,
  climber: { fullName: string; dateOfBirth: string },
  clauseCount: number,
  now: Date = new Date(),
): ParsedWaiverSignature {
  const errors: WaiverFieldErrors = {};
  const minor = ageOn(climber.dateOfBirth, now) < ADULT_AGE;

  const ticked = new Set(formData.getAll("clause").map(String));
  for (let i = 0; i < clauseCount; i++) {
    if (!ticked.has(String(i))) {
      errors.clauses = "Tick every box to agree to each rule.";
      break;
    }
  }

  let signedByName = climber.fullName;
  let signerRelation: SignerRelation = "SELF";
  if (minor) {
    signedByName = text(formData, "guardianName");
    if (!signedByName) errors.guardianName = "Enter the parent or guardian's full name.";
    else if (signedByName.length > MAX_NAME_LENGTH)
      errors.guardianName = `Use ${MAX_NAME_LENGTH} characters or fewer.`;

    const relation = text(formData, "signerRelation");
    if (relation === "PARENT" || relation === "GUARDIAN") signerRelation = relation;
    else errors.signerRelation = "Choose parent or guardian.";
  }

  const emergencyContactName = text(formData, "emergencyContactName");
  if (!emergencyContactName) errors.emergencyContactName = "Enter an emergency contact's name.";
  else if (emergencyContactName.length > MAX_NAME_LENGTH)
    errors.emergencyContactName = `Use ${MAX_NAME_LENGTH} characters or fewer.`;

  const phone = text(formData, "emergencyContactPhone");
  const digits = phone.replace(/\D/g, "");
  if (!phone) errors.emergencyContactPhone = "Enter an emergency contact's phone number.";
  else if (digits.length < 10 || digits.length > 15)
    errors.emergencyContactPhone = "Enter a valid phone number, including area code.";

  // The signature pad puts the drawing in this hidden field as a PNG.
  const signatureImage = text(formData, "signatureImage");
  if (!signatureImage)
    errors.signatureImage = minor
      ? "The parent or guardian needs to sign in the box."
      : "Sign in the box with your finger or mouse.";
  else if (signatureImage.length > MAX_SIGNATURE_IMAGE_LENGTH || !PNG_DATA_URL.test(signatureImage))
    errors.signatureImage = "The signature couldn't be read. Clear it and sign again.";

  if (formData.get("agree") !== "on")
    errors.agree = "Tick the box to agree that this is your electronic signature.";

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : {
        ok: true,
        value: {
          signedByName,
          signerRelation,
          signatureImage,
          emergencyContactName,
          emergencyContactPhone: toStoredPhone(phone),
        },
      };
}
