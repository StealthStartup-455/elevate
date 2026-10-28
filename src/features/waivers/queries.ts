import { connection } from "next/server";
import { summarizeWaiver, type WaiverSummary } from "@/features/climbers/status";
import { db } from "@/lib/db";
import { getGym } from "@/lib/gym";
import { canActForClimber } from "./access";
import { hashWaiver } from "./hash";

// Reads for the waivers feature. Other features ask here instead of reading
// the Waiver and WaiverTemplate tables themselves (see README.md).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type WaiverTemplateView = {
  id: string;
  version: string;
  title: string;
  /** The body split on blank lines. */
  paragraphs: string[];
  clauses: string[];
  bodyHash: string;
};

function paragraphsOf(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** The wording climbers must sign now, or null if the gym hasn't set one up. */
export async function getCurrentWaiverTemplate(): Promise<WaiverTemplateView | null> {
  await connection();
  const gym = await getGym();
  if (!gym.waiverVersion) return null;
  const template = await db.waiverTemplate.findUnique({
    where: { gymId_version: { gymId: gym.id, version: gym.waiverVersion } },
  });
  if (!template) return null;
  return {
    id: template.id,
    version: template.version,
    title: template.title,
    paragraphs: paragraphsOf(template.body),
    clauses: template.clauses,
    bodyHash: template.bodyHash,
  };
}

/**
 * A climber's waiver status (valid, expired or missing) and the latest
 * waiver's id, for a "View waiver" link. Like getClimber, it doesn't check
 * who is asking: call it from a page or action that already has.
 */
export async function getWaiverStatus(
  climberId: string,
): Promise<WaiverSummary & { waiverId?: string }> {
  await connection();
  if (!UUID.test(climberId)) return { status: "missing" };
  const gym = await getGym();
  const latest = await db.waiver.findFirst({
    where: { gymId: gym.id, climberId },
    orderBy: { signedAt: "desc" },
    select: { id: true, signedAt: true, version: true },
  });
  const summary = summarizeWaiver(latest ?? undefined, gym.waiverVersion, new Date());
  return { ...summary, waiverId: latest?.id };
}

export type SignedWaiverView = {
  id: string;
  climberName: string;
  version: string;
  signedAt: Date;
  signedByName: string;
  signerRelation: "SELF" | "PARENT" | "GUARDIAN";
  signatureText: string | null;
  signatureImage: string | null;
  /** The exact wording they signed; null for imported or placeholder waivers. */
  template: { title: string; paragraphs: string[]; clauses: string[] } | null;
  /** False if the wording no longer matches the hash saved when they signed. */
  wordingIntact: boolean;
};

/** One signed waiver, only for the climber, their parent's login, or staff. */
export async function getSignedWaiver(id: string): Promise<SignedWaiverView | null> {
  await connection();
  if (!UUID.test(id)) return null;
  const gym = await getGym();
  const waiver = await db.waiver.findFirst({
    where: { id, gymId: gym.id },
    include: {
      template: true,
      climber: { select: { firstName: true, lastName: true } },
    },
  });
  if (!waiver || !(await canActForClimber(waiver.climberId))) return null;

  const { template } = waiver;
  return {
    id: waiver.id,
    climberName: `${waiver.climber.firstName} ${waiver.climber.lastName}`,
    version: waiver.version,
    signedAt: waiver.signedAt,
    signedByName: waiver.signedByName,
    signerRelation: waiver.signerRelation,
    signatureText: waiver.signatureText,
    signatureImage: waiver.signatureImage,
    template: template
      ? { title: template.title, paragraphs: paragraphsOf(template.body), clauses: template.clauses }
      : null,
    // Hash the text again rather than trusting the template's stored hash.
    wordingIntact: !template || hashWaiver(template) === waiver.bodyHash,
  };
}
