import { connection } from "next/server";
import { getMyMembership, type Membership } from "@/features/climbers/queries";
import { sellsInElevate } from "@/features/pos/queries";
import type { Product, Tender } from "@/features/pos/types";
import { db } from "@/lib/db";
import { getGym } from "@/lib/gym";
import { isSoldOnline } from "./catalog";

// Reads for the climber's Membership tab (/me/membership). Everything is for
// the signed-in climber only: the id comes from the session, never from the
// page, and every query is limited to the gym (prisma/DATABASE.md).

/** Whether the Membership tab shows. A gym on Rock Gym Pro or Redpoint sells there instead. */
export async function isOnlinePurchaseEnabled(): Promise<boolean> {
  await connection();
  return sellsInElevate(await getGym());
}

export type MyPass = {
  name: string;
  /** ISO calendar dates. */
  startsOn: string;
  endsOn: string | null;
};

export type MyPurchase = {
  id: string;
  /** "Oct 30, 2026", in the gym's time zone. */
  date: string;
  items: string;
  totalCents: number;
  tender: Tender;
  status: "PAID" | "VOIDED";
};

export type MembershipPageData = {
  membership: Membership;
  /** The membership in effect today, with the name it was bought under. */
  current: MyPass | null;
  /** One bought early that hasn't started yet. */
  upcoming: MyPass | null;
  /** The last day they're covered, counting one bought early. */
  coveredUntil?: string;
  products: Product[];
  taxRateBps: number;
  purchases: MyPurchase[];
};

const day = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Everything the Membership tab shows. Null when this gym doesn't sell in
 * Elevate. A visitor who isn't signed in is sent away by getMyMembership.
 */
export async function getMembershipPage(): Promise<MembershipPageData | null> {
  await connection();
  const membership = await getMyMembership();
  const gym = await getGym();
  if (!sellsInElevate(gym)) return null;

  const now = new Date();
  const [products, passes, sales] = await Promise.all([
    db.product.findMany({
      where: { gymId: gym.id, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        kind: true,
        priceCents: true,
        punches: true,
        durationMonths: true,
        recurring: true,
      },
    }),
    db.pass.findMany({
      where: { gymId: gym.id, climberId: membership.climberId, kind: "MEMBERSHIP", expiresAt: { gt: now } },
      orderBy: { startsAt: "asc" },
      select: { startsAt: true, expiresAt: true, saleLine: { select: { name: true } } },
    }),
    db.sale.findMany({
      where: { gymId: gym.id, climberId: membership.climberId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        totalCents: true,
        tender: true,
        status: true,
        lines: { select: { name: true, quantity: true } },
      },
    }),
  ]);

  const toPass = (p: (typeof passes)[number]): MyPass => ({
    // Passes from before the POS or another system have no sale line.
    name: p.saleLine?.name ?? "Membership",
    startsOn: day(p.startsAt),
    endsOn: p.expiresAt ? day(p.expiresAt) : null,
  });
  const started = passes.filter((p) => p.startsAt <= now);
  const queued = passes.filter((p) => p.startsAt > now);
  const lastEnd = passes.at(-1)?.expiresAt;

  const date = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeZone: gym.timeZone });
  return {
    membership,
    current: started.length > 0 ? toPass(started.at(-1)!) : null,
    upcoming: queued.length > 0 ? toPass(queued[0]) : null,
    coveredUntil: lastEnd ? day(lastEnd) : undefined,
    products: products.filter((p) => isSoldOnline(p.kind)),
    taxRateBps: gym.taxRateBps,
    purchases: sales.map((s) => ({
      id: s.id,
      date: date.format(s.createdAt),
      items: s.lines.map((l) => (l.quantity > 1 ? `${l.name} ×${l.quantity}` : l.name)).join(", "),
      totalCents: s.totalCents,
      tender: s.tender,
      status: s.status,
    })),
  };
}
