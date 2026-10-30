import { connection } from "next/server";
import { formatTime } from "@/features/analytics/components/format";
import { DEMO_GYM_ID } from "@/features/analytics/config";
import { getFrontDeskBusyness } from "@/features/analytics/queries";
import { getStaffContext, requireStaff } from "@/features/auth/staff";
import { getCheckInClimbers } from "@/features/climbers/queries";
import type { Climber } from "@/features/climbers/types";
import { formatPhone } from "@/features/climbers/phone";
import { isoDay } from "@/features/climbers/status";
import { db } from "@/lib/db";
import { getGymById } from "@/lib/gym";
import { startOfGymDay } from "./day";
import type { PosClimber, Product, RecentCheckIn, RenewalDue, SaleSummary, TaxRates } from "./types";

// Reads for the POS tab. Staff only, and limited to the gym like every query
// (see prisma/DATABASE.md, "Gym isolation").

// The POS sells passes that live in Elevate. A gym that sells through Rock
// Gym Pro or Redpoint already has a POS there, and a sale here would never
// reach it, so the tab is hidden.
export function sellsInElevate(gym: { system: string }): boolean {
  return gym.system === "ELEVATE";
}

/**
 * The signed-in staff member's gym (#34), never one from the browser. Null if
 * they aren't staff or the gym is gone. Callers check requireStaff first.
 */
export async function getStaffGym() {
  const staff = await getStaffContext();
  return staff ? getGymById(staff.gymId) : null;
}

/** Whether the desk shows the POS tab. Staff only. */
export async function isPosEnabled(): Promise<boolean> {
  await connection();
  await requireStaff();
  const gym = await getStaffGym();
  return !!gym && sellsInElevate(gym);
}

/** A climber as the POS shows them. */
export function toPosClimber(c: Climber): PosClimber {
  return {
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
    phone: c.phone,
    waiverStatus: c.waiverStatus,
    waiverExpiresOn: c.waiverExpiresOn,
    membershipStatus: c.membershipStatus,
    membershipRenewsOn: c.membershipRenewsOn,
    hasDayPass: c.hasDayPass,
    punchesLeft: c.punchesLeft,
  };
}

export type PosData = {
  checkedInToday: RecentCheckIn[];
  products: Product[];
  taxRates: TaxRates;
  sales: SaleSummary[];
  renewalsDue: RenewalDue[];
};

/** Everything the POS tab shows. Null when this gym doesn't sell in Elevate. */
export async function getPosData(): Promise<PosData | null> {
  await connection();
  await requireStaff();
  const gym = await getStaffGym();
  if (!gym || !sellsInElevate(gym)) return null;

  const now = new Date();
  const since = startOfGymDay(now, gym.timeZone);
  const [checkedInToday, products, sales, renewalsDue] = await Promise.all([
    getCheckedInToday(gym.id, since, gym.timeZone),
    listProducts(gym.id),
    listSales(gym.id, since, gym.timeZone),
    getRenewalsDue(gym.id, now),
  ]);

  return {
    checkedInToday,
    products,
    taxRates: { gstRateBps: gym.gstRateBps, pstRateBps: gym.pstRateBps },
    sales,
    renewalsDue,
  };
}

// What's for sale, in tile order.
async function listProducts(gymId: string): Promise<Product[]> {
  return db.product.findMany({
    where: { gymId, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      kind: true,
      priceCents: true,
      punches: true,
      durationMonths: true,
      recurring: true,
      chargesPst: true,
    },
  });
}

/**
 * The climbers checked in today, newest first, once each: the visits the
 * desk saved today, then the busyness mock's check-ins (the same ones the
 * front desk list shows), linked to the real climbers.
 */
async function getCheckedInToday(
  gymId: string,
  since: Date,
  timeZone: string,
): Promise<RecentCheckIn[]> {
  const [saved, busyness] = await Promise.all([
    db.checkIn.findMany({
      where: { gymId, checkedInAt: { gte: since } },
      orderBy: { checkedInAt: "desc" },
      select: {
        climberId: true,
        checkedInAt: true,
        climber: { select: { firstName: true, lastName: true, phone: true } },
      },
      take: 100,
    }),
    getFrontDeskBusyness(DEMO_GYM_ID),
  ]);
  // Only the climbers behind the mock's check-ins (#85).
  const mockClimbers = await getCheckInClimbers(busyness.checkIns.map((c) => c.climberId));

  const seen = new Set<string>();
  const list: RecentCheckIn[] = [];
  const add = (climberId: string | undefined, name: string, phone: string, at: Date) => {
    if (!climberId || seen.has(climberId)) return;
    seen.add(climberId);
    list.push({ climberId, name, phone, time: formatTime(at, timeZone) });
  };
  for (const c of saved) {
    const { firstName, lastName, phone } = c.climber;
    add(c.climberId, `${firstName} ${lastName}`, phone ? formatPhone(phone) : "", c.checkedInAt);
  }
  // The mock's names and phones, already formatted.
  for (const c of busyness.checkIns) {
    const { firstName, lastName, phone } = c.climber;
    add(mockClimbers.get(c.climberId)?.id, `${firstName} ${lastName}`, phone, c.timestamp);
  }
  return list;
}

// Today's sales, newest first, voided ones included.
async function listSales(gymId: string, since: Date, timeZone: string): Promise<SaleSummary[]> {
  const rows = await db.sale.findMany({
    where: { gymId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    include: {
      climber: { select: { firstName: true, lastName: true } },
      lines: { select: { name: true, quantity: true } },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    climberId: s.climberId,
    climberName: `${s.climber.firstName} ${s.climber.lastName}`,
    time: formatTime(s.createdAt, timeZone),
    items: s.lines.map((l) => (l.quantity > 1 ? `${l.name} ×${l.quantity}` : l.name)).join(", "),
    totalCents: s.totalCents,
    tender: s.tender,
    status: s.status,
    voidReason: s.voidReason ?? undefined,
  }));
}

const DAY_MS = 24 * 60 * 60 * 1000;
// Shown from a week before the month ends until two weeks after.
const RENEWAL_LEAD_DAYS = 7;
const RENEWAL_GRACE_DAYS = 14;

/**
 * Monthly recurring members whose latest month ends within a week, or ended
 * in the last two weeks, soonest first. Someone who already has a later
 * membership (renewed early, or switched plan) isn't due.
 */
async function getRenewalsDue(gymId: string, now: Date): Promise<RenewalDue[]> {
  const due = await db.pass.findMany({
    where: {
      gymId,
      kind: "MEMBERSHIP",
      renews: true,
      expiresAt: {
        gte: new Date(now.getTime() - RENEWAL_GRACE_DAYS * DAY_MS),
        lte: new Date(now.getTime() + RENEWAL_LEAD_DAYS * DAY_MS),
      },
    },
    select: { climberId: true, climber: { select: { firstName: true, lastName: true } } },
  });
  if (due.length === 0) return [];
  const names = new Map(due.map((p) => [p.climberId, `${p.climber.firstName} ${p.climber.lastName}`]));

  const memberships = await db.pass.findMany({
    where: { gymId, kind: "MEMBERSHIP", climberId: { in: [...new Set(due.map((p) => p.climberId))] } },
    select: {
      climberId: true,
      expiresAt: true,
      renews: true,
      saleLine: { select: { productId: true, sale: { select: { status: true } } } },
    },
  });
  const products = await db.product.findMany({
    where: { gymId, active: true, recurring: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  const forSale = new Set(products.map((p) => p.id));

  // Each climber's membership that ends last, leaving out voided sales.
  const latest = new Map<string, (typeof memberships)[number]>();
  for (const m of memberships) {
    if (m.saleLine?.sale.status === "VOIDED" || !m.expiresAt) continue;
    const current = latest.get(m.climberId);
    if (!current || m.expiresAt > current.expiresAt!) latest.set(m.climberId, m);
  }

  return [...latest.values()]
    .filter((m) => m.renews && m.expiresAt!.getTime() <= now.getTime() + RENEWAL_LEAD_DAYS * DAY_MS)
    .sort((a, b) => a.expiresAt!.getTime() - b.expiresAt!.getTime())
    .map((m) => {
      const productId = m.saleLine?.productId;
      return {
        climberId: m.climberId,
        name: names.get(m.climberId) ?? "",
        // Same date as "Renews" on the climber (isoDay in status.ts).
        dueOn: isoDay(m.expiresAt!),
        overdue: m.expiresAt! <= now,
        productId: productId && forSale.has(productId) ? productId : (products[0]?.id ?? null),
      };
    });
}
