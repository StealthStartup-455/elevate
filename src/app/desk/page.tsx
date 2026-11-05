import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import { formatWindow } from "@/features/analytics/busyness";
import AutoRefresh from "@/features/analytics/components/AutoRefresh";
import BusynessHeatMap from "@/features/analytics/components/BusynessHeatMap";
import BusynessLevelChip from "@/features/analytics/components/BusynessLevelChip";
import { formatTime } from "@/features/analytics/components/format";
import { DEMO_GYM_ID, DESK_BUSYNESS_REFRESH_MS } from "@/features/analytics/config";
import { getFrontDeskBusyness } from "@/features/analytics/queries";
import BusyTimesDialog from "@/features/check-ins/components/BusyTimesDialog";
import DayNav from "@/features/check-ins/components/DayNav";
import DeskDayTable, { type DeskTableRow } from "@/features/check-ins/components/DeskDayTable";
import FindClimber from "@/features/check-ins/components/FindClimber";
import HourlyBars from "@/features/check-ins/components/HourlyBars";
import { deskHref, gymHour } from "@/features/check-ins/day";
import { DESK_PAGE_SIZE, getDeskDay } from "@/features/check-ins/queries";
import LinkButton from "@/features/climbers/components/LinkButton";
import ManualCheckInButton from "@/features/climbers/components/ManualCheckInButton";
import { formatDate } from "@/features/climbers/format";

// The front desk's Check-in page (#168): the day's check-ins from the
// database, with busyness in the header. ?date=YYYY-MM-DD&page=N hold the
// state; bad values show today and page 1 (getDeskDay). QR scans pop up from
// the desk layout (ScanWatcher), on this page and every other.
//
// The title and toolbar don't wait for data, so they show at once; the day's
// navigation, busyness and table stream in as their data arrives.

type SearchParams = PageProps<"/desk">["searchParams"];

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

// One read of the day per request, shared by the header and the table.
const loadDay = cache(async (date: string | undefined, page: string | undefined) => {
  await connection();
  const now = new Date();
  return { desk: await getDeskDay({ date, page }, now), now };
});

async function load(searchParams: SearchParams) {
  const { date, page } = await searchParams;
  return loadDay(one(date), one(page));
}

const checkIns = (n: number) => `${n} check-in${n === 1 ? "" : "s"}`;

export default function DeskPage({ searchParams }: PageProps<"/desk">) {
  return (
    <div className="flex flex-col gap-3">
      <AutoRefresh intervalMs={DESK_BUSYNESS_REFRESH_MS} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Typography variant="pageTitle">Check-in</Typography>
          <Suspense fallback={null}>
            <DayPicker searchParams={searchParams} />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <Busyness searchParams={searchParams} />
        </Suspense>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FindClimber />
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <ManualCheckInButton />
          </Suspense>
          <LinkButton href="/desk/customers/new" variant="outlined">
            New customer
          </LinkButton>
        </div>
      </div>

      <Suspense
        fallback={
          <Card>
            <CardContent>
              <Typography variant="secondary" role="status">
                Loading check-ins...
              </Typography>
            </CardContent>
          </Card>
        }
      >
        <DayTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function DayPicker({ searchParams }: { searchParams: SearchParams }) {
  const { desk } = await load(searchParams);
  return <DayNav day={desk.day} today={desk.today} />;
}

async function Busyness({ searchParams }: { searchParams: SearchParams }) {
  const [{ desk, now }, busyness] = await Promise.all([load(searchParams), getFrontDeskBusyness(DEMO_GYM_ID)]);
  const isToday = desk.day === desk.today;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-4">
        {/* The day's hours, then how busy it is right now: two readings, kept apart. */}
        <HourlyBars hourly={desk.hourly} currentHour={isToday ? gymHour(now, desk.timeZone) : null} />
        <Divider orientation="vertical" flexItem />
        <div className="flex items-center gap-2">
          <BusynessLevelChip level={busyness.level} />
          <Typography variant="body" component="p" sx={{ fontWeight: 600 }} data-testid="busyness-count">
            {checkIns(busyness.count)} in the last {formatWindow(busyness.windowMinutes)}
          </Typography>
        </div>
        <BusyTimesDialog>
          <BusynessHeatMap gymId={DEMO_GYM_ID} />
        </BusyTimesDialog>
      </div>
      {busyness.sampleCount > 0 && (
        // Stopgap until #39: say plainly what is generated (#64).
        <Typography variant="secondary" data-testid="sample-check-ins">
          Demo data: {busyness.sampleCount} of these {busyness.count} check-ins are samples, not real visits.
        </Typography>
      )}
    </div>
  );
}

async function DayTable({ searchParams }: { searchParams: SearchParams }) {
  const { desk } = await load(searchParams);
  const first = (desk.page - 1) * DESK_PAGE_SIZE;
  const rows: DeskTableRow[] = desk.rows.map((r) => ({
    id: r.id,
    climberId: r.climberId,
    name: `${r.firstName} ${r.lastName}`,
    time: formatTime(r.checkedInAt, desk.timeZone),
    badge: r.badge,
    waiver: r.waiver,
    message: r.message,
  }));
  const count = checkIns(desk.total);

  return (
    <DeskDayTable
      title={desk.day === desk.today ? `${count} today` : `${count} on ${formatDate(desk.day, true)}`}
      rows={rows}
      paging={{
        range: desk.total === 0 ? "0 of 0" : `${first + 1}–${first + rows.length} of ${desk.total}`,
        page: desk.page,
        pageCount: desk.pageCount,
        prevHref: desk.page > 1 ? deskHref(desk.day, desk.today, desk.page - 1) : null,
        nextHref: desk.page < desk.pageCount ? deskHref(desk.day, desk.today, desk.page + 1) : null,
      }}
    />
  );
}
