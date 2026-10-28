// Checks the waiver form. Plain functions, like features/climbers/validate.ts,
// so the rules can be unit tested without a database or a browser.

// Under this age a parent or guardian signs. 19 is the age of majority in
// British Columbia, where the pilot gyms are.
export const ADULT_AGE = 19;

const MAX_NAME_LENGTH = 120;
// A drawn signature is a small PNG; anything bigger isn't one.
const MAX_SIGNATURE_IMAGE_LENGTH = 200_000;
const PNG_DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/;

export type SignerRelation = "SELF" | "PARENT" | "GUARDIAN";

export type WaiverFieldErrors = Partial<
  Record<"clauses" | "guardianName" | "signerRelation" | "signatureText" | "agree" | "signatureImage", string>
>;

export type WaiverSignature = {
  signedByName: string;
  signerRelation: SignerRelation;
  signatureText: string;
  signatureImage: string | null;
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

// "  josé  DE la Cruz " and "Jose de la Cruz" are the same name, and so are
// "Mary-Jane" and "Mary Jane".
export function sameName(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[\s-]+/g, " ")
      .trim();
  return norm(a) === norm(b);
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

  const signatureText = text(formData, "signatureText");
  if (!signatureText) errors.signatureText = "Type your full name to sign.";
  else if (signedByName && !sameName(signatureText, signedByName))
    errors.signatureText = minor
      ? "Type the parent or guardian's name exactly as entered above."
      : `Type your full name as shown above: ${climber.fullName}.`;

  if (formData.get("agree") !== "on")
    errors.agree = "Tick the box to agree that this is your electronic signature.";

  // Optional for now: the drawn signature pad comes in a later change.
  const image = text(formData, "signatureImage");
  if (image && (image.length > MAX_SIGNATURE_IMAGE_LENGTH || !PNG_DATA_URL.test(image)))
    errors.signatureImage = "The drawn signature couldn't be read. Clear it and draw it again.";

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : {
        ok: true,
        value: { signedByName, signerRelation, signatureText, signatureImage: image || null },
      };
}
