import { connection } from "next/server";
import { getStaffContext } from "@/features/auth/staff";
import { formatPhone } from "@/features/climbers/phone";
import { summarizeWaiver, type WaiverSummary } from "@/features/climbers/status";
import { db } from "@/lib/db";
import { getGym, getGymById } from "@/lib/gym";
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
  const summary = summarizeWaiver(latest ?? undefined, gym.waiverVersion, new Date(), gym.timeZone);
  return { ...summary, waiverId: latest?.id };
}

export type SignedWaiverView = {
  id: string;
  climberId: string;
  climberName: string;
  version: string;
  signedAt: Date;
  signedByName: string;
  signerRelation: "SELF" | "PARENT" | "GUARDIAN";
  signatureText: string | null;
  signatureImage: string | null;
  emergencyContact: { name: string; phone: string } | null;
  /** The exact wording they signed; null for imported or placeholder waivers. */
  template: { title: string; paragraphs: string[]; clauses: string[] } | null;
  /** The wording's SHA-256 saved when they signed; null for imported or placeholder waivers. */
  bodyHash: string | null;
  /** False if the wording no longer matches the hash saved when they signed. */
  wordingIntact: boolean;
};

/** One signed waiver, only for the climber, their parent's login, or staff. */
export async function getSignedWaiver(id: string): Promise<SignedWaiverView | null> {
  await connection();
  const gym = await getGym();
  return findSignedWaiver(id, gym.id, canActForClimber);
}

/**
 * One signed waiver for the desk (#147). Staff only, and only a waiver from
 * the staff member's own gym (#34), never the default gym.
 */
export async function getSignedWaiverForStaff(id: string): Promise<SignedWaiverView | null> {
  await connection();
  const staff = await getStaffContext();
  if (!staff) return null;
  return findSignedWaiver(id, staff.gymId, async () => true);
}

export type StaffWaiverPanel = WaiverSummary & {
  waiverId?: string;
  /** When the latest waiver was signed, as a date in the gym's time zone. */
  signedOn?: string;
  version?: string;
};

/**
 * A climber's waiver as the desk's climber page shows it: valid, expired or
 * missing, with the latest waiver's id, signed date and wording version. Staff
 * only, limited to the staff member's gym; anyone else sees it as missing.
 */
export async function getStaffWaiverPanel(climberId: string): Promise<StaffWaiverPanel> {
  await connection();
  const staff = await getStaffContext();
  if (!staff || !UUID.test(climberId)) return { status: "missing" };
  const gym = await getGymById(staff.gymId);
  if (!gym) return { status: "missing" };
  const latest = await db.waiver.findFirst({
    where: { gymId: gym.id, climberId },
    orderBy: { signedAt: "desc" },
    select: { id: true, signedAt: true, version: true },
  });
  return {
    ...summarizeWaiver(latest ?? undefined, gym.waiverVersion, new Date(), gym.timeZone),
    waiverId: latest?.id,
    signedOn: latest
      ? new Intl.DateTimeFormat("en-CA", { dateStyle: "long", timeZone: gym.timeZone }).format(latest.signedAt)
      : undefined,
    version: latest?.version,
  };
}

async function findSignedWaiver(
  id: string,
  gymId: string,
  mayRead: (climberId: string) => Promise<boolean>,
): Promise<SignedWaiverView | null> {
  if (!UUID.test(id)) return null;
  const waiver = await db.waiver.findFirst({
    where: { id, gymId },
    include: {
      template: true,
      climber: { select: { firstName: true, lastName: true } },
    },
  });
  if (!waiver || !(await mayRead(waiver.climberId))) return null;

  const { template } = waiver;
  return {
    id: waiver.id,
    climberId: waiver.climberId,
    climberName: `${waiver.climber.firstName} ${waiver.climber.lastName}`,
    version: waiver.version,
    signedAt: waiver.signedAt,
    signedByName: waiver.signedByName,
    signerRelation: waiver.signerRelation,
    signatureText: waiver.signatureText,
    signatureImage: waiver.signatureImage,
    emergencyContact:
      waiver.emergencyContactName && waiver.emergencyContactPhone
        ? { name: waiver.emergencyContactName, phone: formatPhone(waiver.emergencyContactPhone) }
        : null,
    template: template
      ? { title: template.title, paragraphs: paragraphsOf(template.body), clauses: template.clauses }
      : null,
    bodyHash: waiver.bodyHash,
    // Hash the text again rather than trusting the template's stored hash.
    wordingIntact: !template || hashWaiver(template) === waiver.bodyHash,
  };
}

export type WaiverVersionRow = {
  id: string;
  version: string;
  title: string;
  publishedAt: Date;
  /** How many waivers were signed on this wording. */
  signatures: number;
  /** The one climbers must sign now (Gym.waiverVersion). */
  current: boolean;
};

export type StaffWaiverWording = {
  /** The current wording, as stored, to start the editor from; null if there is none. */
  current: { version: string; title: string; body: string; clauses: string[] } | null;
  /** Every published version, newest first. */
  versions: WaiverVersionRow[];
  timeZone: string;
};

/**
 * The gym's waiver wording for the desk's Waivers page (#110): the current
 * version and every earlier one with its number of signatures. Staff only,
 * limited to the staff member's own gym; anyone else gets null.
 */
export async function getStaffWaiverWording(): Promise<StaffWaiverWording | null> {
  await connection();
  const staff = await getStaffContext();
  if (!staff) return null;
  const gym = await getGymById(staff.gymId);
  if (!gym) return null;

  const [templates, counts] = await Promise.all([
    db.waiverTemplate.findMany({ where: { gymId: gym.id }, orderBy: { publishedAt: "desc" } }),
    // By version, not templateId: waivers from before online signing only have the version.
    db.waiver.groupBy({ by: ["version"], where: { gymId: gym.id }, _count: { _all: true } }),
  ]);
  const signed = new Map(counts.map((c) => [c.version, c._count._all]));
  const current = templates.find((t) => t.version === gym.waiverVersion);

  return {
    current: current
      ? { version: current.version, title: current.title, body: current.body, clauses: current.clauses }
      : null,
    versions: templates.map((t) => ({
      id: t.id,
      version: t.version,
      title: t.title,
      publishedAt: t.publishedAt,
      signatures: signed.get(t.version) ?? 0,
      current: t.version === gym.waiverVersion,
    })),
    timeZone: gym.timeZone,
  };
}
