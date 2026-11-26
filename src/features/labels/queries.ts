import { connection } from "next/server";
import { getStaffContext, requireStaff } from "@/features/auth/staff";
import { db } from "@/lib/db";
import type { LabelView } from "./types";

// Reads for customer labels (#157), from the GymLabel and ClimberLabel tables.
// Staff only, and only the signed-in staff member's gym. Not a "use server"
// file on purpose: these are called from the server, never from the browser.
// A label is on a climber while its ClimberLabel row has no removedAt and the
// GymLabel is active.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ON = { removedAt: null, label: { active: true } } as const;
// A to Z, ignoring case ("ask for ID" next to "Ask for ID").
const BY_NAME = { label: { key: "asc" } } as const;
const VIEW = { label: { select: { id: true, name: true } } } as const;

/** The gym's labels staff can pick from, A to Z. */
export async function listGymLabels(): Promise<LabelView[]> {
  await connection();
  await requireStaff();
  const staff = await getStaffContext();
  if (!staff) return [];
  return db.gymLabel.findMany({
    where: { gymId: staff.gymId, active: true },
    orderBy: { key: "asc" },
    select: { id: true, name: true },
  });
}

/**
 * The labels on one climber, A to Z. Null when the id isn't one, or the
 * climber isn't at the staff member's gym, so callers can tell "no labels"
 * from "no such climber". One query.
 */
export async function getClimberLabels(climberId: string): Promise<LabelView[] | null> {
  await connection();
  await requireStaff();
  const staff = await getStaffContext();
  if (!staff || !UUID.test(String(climberId ?? ""))) return null;
  const climber = await db.climber.findFirst({
    where: { id: climberId, gymId: staff.gymId },
    select: { labels: { where: ON, orderBy: BY_NAME, select: VIEW } },
  });
  return climber ? climber.labels.map((l) => l.label) : null;
}

/**
 * The labels on each of `climberIds`, in ONE query, for lists: the Check-in
 * table and the arrival toasts (polled every few seconds, so never a query per
 * climber). Every asked-for id is in the map, with [] when it has none. Only
 * `gymId`'s labels, and only when that is the staff member's own gym.
 */
export async function getLabelsForClimbers(
  gymId: string,
  climberIds: string[],
): Promise<Map<string, LabelView[]>> {
  await requireStaff();
  const staff = await getStaffContext();
  const ids = [...new Set(climberIds)].filter((id) => UUID.test(String(id)));
  const map = new Map<string, LabelView[]>(ids.map((id) => [id, []]));
  if (!staff || staff.gymId !== gymId || ids.length === 0) return map;
  const rows = await db.climberLabel.findMany({
    where: { gymId: staff.gymId, climberId: { in: ids }, ...ON },
    orderBy: BY_NAME,
    select: { climberId: true, ...VIEW },
  });
  for (const row of rows) map.get(row.climberId)?.push(row.label);
  return map;
}
