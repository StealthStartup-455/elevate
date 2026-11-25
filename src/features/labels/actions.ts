"use server";

import { revalidatePath } from "next/cache";
import { getStaffContext, requireStaff } from "@/features/auth/staff";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/log";
import { listGymLabels } from "./queries";
import type { LabelResult, LabelView } from "./types";
import { MAX_GYM_LABELS, normalizeLabelName } from "./validate";

// Changing customer labels at the desk (#157). Server actions are public POST
// endpoints, so each one checks the caller itself and trusts no id it is sent:
// every read and write is limited to the staff member's gym. Any staff role
// may do both. Logs carry ids only, never a label's words: a label can be
// personal ("Banned: theft").

// A "use server" file may only export async functions, so the limits live in validate.ts.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOT_STAFF: LabelResult = { ok: false, message: "You need to be signed in as staff." };

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

// Not /me: climbers never see labels.
function refreshLabelPages(climberId?: string) {
  revalidatePath("/desk");
  revalidatePath("/desk/customers");
  if (climberId) revalidatePath(`/desk/customers/${climberId}`);
}

// labelId is the existing label, so a screen that wanted it on a climber can
// add that one instead (another desk may have just created it).
function taken(label: { id: string; name: string }): LabelResult {
  return { ok: false, message: `There's already a label called "${label.name}".`, labelId: label.id };
}

/**
 * The gym's labels for the "Add label" picker, read when it opens so a label
 * another desk just made is there. Staff only (listGymLabels checks), and only
 * the staff member's gym.
 */
export async function labelsToPick(): Promise<LabelView[]> {
  return listGymLabels();
}

/**
 * Adds a label to the gym's list. "  ask FOR id " is refused where "Ask for
 * ID" exists. A label that was switched off comes back on instead, since its
 * name is still taken.
 */
export async function createLabel(rawName: string): Promise<LabelResult> {
  await requireStaff();
  const staff = await getStaffContext();
  if (!staff) return NOT_STAFF;
  const parsed = normalizeLabelName(rawName);
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const gymId = staff.gymId;

  const existing = await db.gymLabel.findUnique({
    where: { gymId_key: { gymId, key: parsed.key } },
    select: { id: true, name: true, active: true },
  });
  if (existing?.active) return taken(existing);

  const count = await db.gymLabel.count({ where: { gymId, active: true } });
  if (count >= MAX_GYM_LABELS) {
    return { ok: false, message: `Your gym already has ${MAX_GYM_LABELS} labels, the most it can have.` };
  }

  if (existing) {
    await db.gymLabel.updateMany({ where: { id: existing.id, gymId }, data: { active: true } });
    logEvent("label_created", { gymId, labelId: existing.id, reactivated: true });
    refreshLabelPages();
    return { ok: true, labelId: existing.id };
  }

  const label = await db.gymLabel
    .create({
      data: { gymId, name: parsed.name, key: parsed.key, createdById: staff.id },
      select: { id: true },
    })
    .catch((error: unknown) => {
      // Two desks typed the same name at once: the unique index let one in.
      if (isUniqueViolation(error)) return null;
      throw error;
    });
  if (!label) {
    const winner = await db.gymLabel.findUnique({
      where: { gymId_key: { gymId, key: parsed.key } },
      select: { id: true, name: true },
    });
    return winner ? taken(winner) : { ok: false, message: "Something went wrong. Please try again." };
  }
  logEvent("label_created", { gymId, labelId: label.id });
  refreshLabelPages();
  return { ok: true, labelId: label.id };
}

/**
 * Puts a label on a climber (`on`) or takes it off. Both must be at the staff
 * member's gym, and the label active. Taking it off sets removedAt and who;
 * putting it back clears them on the same row (one row per climber and label).
 * Pressing either twice is fine: the second press changes nothing.
 */
export async function setClimberLabel(climberId: string, labelId: string, on: boolean): Promise<LabelResult> {
  await requireStaff();
  const staff = await getStaffContext();
  if (!staff) return NOT_STAFF;
  if (!UUID.test(String(climberId ?? "")) || !UUID.test(String(labelId ?? "")) || typeof on !== "boolean") {
    return { ok: false, message: "Climber or label not found." };
  }
  const gymId = staff.gymId;

  const [climber, label] = await Promise.all([
    db.climber.findFirst({ where: { id: climberId, gymId }, select: { id: true } }),
    db.gymLabel.findFirst({ where: { id: labelId, gymId, active: true }, select: { id: true } }),
  ]);
  if (!climber) return { ok: false, message: "Climber not found." };
  if (!label) return { ok: false, message: "Label not found." };

  const now = new Date();
  let changed: boolean;
  if (on) {
    // Back on: the row from last time, if it was taken off.
    const { count } = await db.climberLabel.updateMany({
      where: { gymId, climberId, labelId, removedAt: { not: null } },
      data: { removedAt: null, removedById: null, addedAt: now, addedById: staff.id },
    });
    changed = count > 0;
    if (!changed) {
      // First time on. If the row already exists it's on already (or another
      // desk just added it): the unique index refuses a second one, and that's fine.
      changed = await db.climberLabel
        .create({ data: { gymId, climberId, labelId, addedAt: now, addedById: staff.id } })
        .then(() => true)
        .catch((error: unknown) => {
          if (isUniqueViolation(error)) return false;
          throw error;
        });
    }
  } else {
    const { count } = await db.climberLabel.updateMany({
      where: { gymId, climberId, labelId, removedAt: null },
      data: { removedAt: now, removedById: staff.id },
    });
    changed = count > 0;
  }

  if (changed) {
    logEvent(on ? "climber_label_added" : "climber_label_removed", { gymId, climberId, labelId });
    refreshLabelPages(climberId);
  }
  return { ok: true };
}
