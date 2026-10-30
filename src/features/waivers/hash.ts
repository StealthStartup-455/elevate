import { createHash } from "node:crypto";

export type WaiverWording = { title: string; body: string; clauses: string[] };

// A fingerprint of the waiver wording. Saved on the template when it's
// published and copied onto every signed waiver, so we can later prove the
// text a climber agreed to is the text we still show. JSON keeps the parts
// apart, so moving words between the title and the body changes the hash.
export function hashWaiver({ title, body, clauses }: WaiverWording): string {
  return createHash("sha256").update(JSON.stringify([title, body, clauses])).digest("hex");
}
