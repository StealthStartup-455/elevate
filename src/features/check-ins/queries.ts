import { connection } from "next/server";
import { getStaffContext, requireStaff } from "@/features/auth/staff";
import { getClimberStatuses } from "@/features/climbers/queries";
import type { WaiverSummary } from "@/features/climbers/status";
import type { CheckInMethod } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getGymById } from "@/lib/gym";
import {
  badgeAt,
  countByHour,
  gymDay,
  gymDayBounds,
  parseDay,
  parsePage,
  rowMessage,
  waiverLabel,
  type Badge,
  type Label,
} from "./day";

// Reads for the desk's Check-in page (#168), from the CheckIn table. Staff
// only, and always the signed-in staff member's gym (prisma/DATABASE.md,
// "Gym isolation").

export const DESK_PAGE_SIZE = 25;

export type DeskRow = {
  id: string;
  climberId: string;
  firstName: string;
  lastName: string;
  checkedInAt: Date;
  method: CheckInMethod;
  /** The pass that let them in at the time. */
  badge: Badge;
  /** Their waiver now. */
  waiver: Label;
  message: Label;
};

export type DeskDay = {
  /** The day shown, YYYY-MM-DD in the gym's time zone. */
  day: string;
  /** Today in the gym's time zone, for the "Today" link and the › arrow. */
  today: string;
  timeZone: string;
  rows: DeskRow[];
  /** Every check-in that day, for "N check-ins today" and paging. */
  total: number;
  page: number;
  pageCount: number;
  /** Check-ins per hour of the gym's clock, 0 to 23. */
  hourly: number[];
};

type SearchParam = string | string[] | undefined;

function emptyDay(now: Date, timeZone: string): DeskDay {
  const today = gymDay(now, timeZone);
  return { day: today, today, timeZone, rows: [], total: 0, page: 1, pageCount: 1, hourly: Array(24).fill(0) };
}

/**
 * One day of check-ins at the desk's gym, newest first, DESK_PAGE_SIZE a
 * page. `date` and `page` come straight from the URL; anything that
 * isn't a real day up to today, or a page that exists, falls back to today and
 * page 1. A fixed number of queries whatever the page size.
 */
export async function getDeskDay(
  input: { date?: SearchParam; page?: SearchParam },
  now: Date = new Date(),
): Promise<DeskDay> {
  await connection();
  await requireStaff();
  const staff = await getStaffContext();
  if (!staff) return emptyDay(now, "UTC");
  const gym = await getGymById(staff.gymId);
  if (!gym) return emptyDay(now, "UTC");

  const today = gymDay(now, gym.timeZone);
  const day = parseDay(input.date, today);
  const { start, end } = gymDayBounds(day, gym.timeZone);
  const where = { gymId: gym.id, checkedInAt: { gte: start, lt: end } };

  const pageOf = (n: number) =>
    db.checkIn.findMany({
      where,
      // The id breaks ties, so two check-ins in the same second stay on their page.
      orderBy: [{ checkedInAt: "desc" }, { id: "desc" }],
      skip: (n - 1) * DESK_PAGE_SIZE,
      take: DESK_PAGE_SIZE,
      select: {
        id: true,
        climberId: true,
        checkedInAt: true,
        method: true,
        climber: { select: { firstName: true, lastName: true } },
      },
    });

  // The asked-for page loads alongside the day's times (the count and the bar
  // chart) rather than after them: one round trip to the database fewer. Only
  // a page past the end needs a second try.
  const asked = parsePage(input.page);
  const [times, askedRows] = await Promise.all([
    db.checkIn.findMany({ where, select: { checkedInAt: true } }),
    pageOf(asked),
  ]);
  const total = times.length;
  const pageCount = Math.max(1, Math.ceil(total / DESK_PAGE_SIZE));
  const page = asked <= pageCount ? asked : 1;
  const checkIns = page === asked ? askedRows : await pageOf(1);

  const ids = [...new Set(checkIns.map((c) => c.climberId))];
  const [statuses, passes, visits] = ids.length
    ? await Promise.all([
        // Waiver and punches now, the same as everywhere else on the desk.
        getClimberStatuses(gym, ids, now),
        // Passes that could have let them in that day, for the badge.
        // Every membership, as summarizeMembership expects.
        db.pass.findMany({
          where: {
            gymId: gym.id,
            climberId: { in: ids },
            startsAt: { lt: end },
            OR: [{ kind: "MEMBERSHIP" }, { expiresAt: null }, { expiresAt: { gt: start } }],
          },
          select: { climberId: true, kind: true, startsAt: true, expiresAt: true, pausedAt: true, visitsLeft: true },
        }),
        // Their first and latest check-in ever at this gym.
        db.checkIn.groupBy({
          by: ["climberId"],
          where: { gymId: gym.id, climberId: { in: ids } },
          _min: { checkedInAt: true },
          _max: { checkedInAt: true },
        }),
      ])
    : [new Map(), [], []];

  const visitsBy = new Map(visits.map((v) => [v.climberId, v]));
  const rows = checkIns.map((c): DeskRow => {
    const status = statuses.get(c.climberId);
    const waiver: WaiverSummary = status
      ? { status: status.waiverStatus, expiresOn: status.waiverExpiresOn }
      : { status: "missing" };
    const badge = badgeAt(
      passes.filter((p) => p.climberId === c.climberId),
      c.checkedInAt,
    );
    const v = visitsBy.get(c.climberId);
    const time = c.checkedInAt.getTime();
    return {
      id: c.id,
      climberId: c.climberId,
      firstName: c.climber.firstName,
      lastName: c.climber.lastName,
      checkedInAt: c.checkedInAt,
      method: c.method,
      badge,
      waiver: waiverLabel(waiver, today),
      message: rowMessage({
        badge,
        punchesLeft: status?.punchesLeft ?? 0,
        waiver,
        today,
        firstVisit: v?._min.checkedInAt?.getTime() === time,
        latestVisit: v?._max.checkedInAt?.getTime() === time,
      }),
    };
  });

  return {
    day,
    today,
    timeZone: gym.timeZone,
    rows,
    total,
    page,
    pageCount,
    hourly: countByHour(times.map((t) => t.checkedInAt), gym.timeZone),
  };
}
