import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import KpiTile from "@/components/ui/KpiTile";
import { formatDateTime } from "@/features/analytics/components/format";
import { formatDate } from "@/features/climbers/format";
import { isoDayIn } from "@/features/climbers/status";
import { formatDuration, formatShare, plural, reasonLabel } from "../format";
import type { MetricsPageData } from "../queries";

// The value proposition metrics (#251): is Elevate making the front desk fast
// and seamless, and are the other promises holding? Front desk first, the rest
// lighter. Every number has its definition written under its section, since
// nothing essential may live only in a tooltip (STYLE_GUIDE.md).

// The front desk target: a valid member checked in within 5 seconds.
export const TARGET_MS = 5000;

function Section({ title, subtitle, children, definitions }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  definitions: string[];
}) {
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <div className="flex flex-wrap items-baseline gap-2">
        <Typography variant="cardTitle" component="h2">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="secondary" component="span">
            {subtitle}
          </Typography>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
      <ul className="flex flex-col gap-1 pl-4">
        {definitions.map((d) => (
          <Typography key={d} variant="secondary" component="li" sx={{ listStyleType: "disc" }}>
            {d}
          </Typography>
        ))}
      </ul>
    </section>
  );
}

export default function MetricsDashboard({ data, demo }: { data: MetricsPageData; demo: boolean }) {
  const desk = data.frontDesk;
  const median = desk.timeToCheckIn.median;
  const onTarget = median !== null && median <= TARGET_MS;
  const topReason = desk.topReasons[0];

  return (
    <div className="flex flex-col gap-6">
      {demo && (
        <Alert severity="info">
          Demo data. These numbers come from testing and the seeded demo gym, not real visits.
        </Alert>
      )}
      <Typography variant="secondary">
        {/* The date only: a time ends in "a.m." and doubled the full stop (Khanh's review). */}
        {data.gymName}: the last 14 days, starting {formatDate(isoDayIn(data.since, data.timeZone))}.
      </Typography>

      <Section
        title="Fast, seamless front desk"
        subtitle="The main value proposition"
        definitions={[
          "Time to check in: from opening Check in to the climber being checked in, for climbers with nothing in the way. The target is under 5 seconds.",
          "Arrival wait: from a climber scanning on their phone to staff dealing with it.",
          "Blocked: tries where the climber couldn't be checked in when picked (no waiver, no pass, already in). Sorting out: how long those took when they ended in a check in.",
          "Sent away: blocked climbers staff closed the dialog on. Lost scans: phone scans nobody dealt with in 5 minutes; this should be zero.",
        ]}
      >
        <KpiTile
          label="Time to check in (typical)"
          value={formatDuration(median)}
          detail={
            median === null
              ? "No timed check ins yet"
              : `${onTarget ? "On target" : "Slower than the 5 s target"}. Slowest 10%: ${formatDuration(desk.timeToCheckIn.p90)}`
          }
          tone={median === null ? undefined : onTarget ? "up" : "warn"}
        />
        <KpiTile
          label="Camera vs typed search"
          value={formatShare(desk.cameraShare)}
          detail={`By camera. Typical: camera ${formatDuration(desk.byCamera.median)}, search ${formatDuration(desk.bySearch.median)}`}
        />
        <KpiTile
          label="Arrival wait (typical)"
          value={formatDuration(desk.arrivalWait.median)}
          detail={`${plural(desk.arrivalWait.count, "phone scan", "phone scans")}. Slowest 10%: ${formatDuration(desk.arrivalWait.p90)}`}
        />
        <KpiTile
          label="Check ins"
          value={desk.checkIns}
          detail={`${plural(desk.attempts, "try", "tries")} at the desk recorded`}
        />
        <KpiTile
          label="Blocked"
          value={formatShare(desk.blockedShare)}
          detail={topReason ? `Most often: ${reasonLabel(topReason.reason)} (${topReason.count})` : "Nothing blocked yet"}
        />
        <KpiTile
          label="Sorting out a block (typical)"
          value={formatDuration(desk.sortOut.median)}
          detail={`${plural(desk.sortOut.count, "blocked climber", "blocked climbers")} checked in`}
        />
        <KpiTile
          label="Sent away"
          value={desk.sentAway}
          detail={desk.sentAway ? "Blocked and not checked in" : "Nobody sent away"}
          tone={desk.sentAway ? "warn" : undefined}
        />
        <KpiTile
          label="Lost scans"
          value={desk.lostScans}
          detail={desk.lostScans ? "Scans nobody dealt with" : "None lost"}
          tone={desk.lostScans ? "bad" : "up"}
        />
      </Section>

      <Card>
        <CardContent className="flex flex-col gap-2">
          <Typography variant="cardTitle" component="h2">
            Day by day
          </Typography>
          <TableContainer>
            <Table size="small" aria-label="Front desk day by day">
              <TableHead>
                <TableRow>
                  <TableCell>Day</TableCell>
                  <TableCell align="right">Check ins</TableCell>
                  <TableCell align="right">Time to check in</TableCell>
                  <TableCell align="right">Blocked</TableCell>
                  <TableCell align="right">Sent away</TableCell>
                  <TableCell align="right">Lost scans</TableCell>
                  <TableCell align="right">Voided sales</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.daily.map((d) => (
                  <TableRow key={d.day}>
                    <TableCell>{formatDate(d.day)}</TableCell>
                    <TableCell align="right">{d.checkIns}</TableCell>
                    <TableCell align="right">{d.medianMs === null ? "None" : formatDuration(d.medianMs)}</TableCell>
                    <TableCell align="right">{d.blocked}</TableCell>
                    <TableCell align="right">{d.sentAway}</TableCell>
                    <TableCell align="right">{d.lostScans}</TableCell>
                    <TableCell align="right">{d.voidedSales}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Section
        title="Reliable waivers"
        definitions={[
          "Signed before arriving: climbers on their first visit whose waiver was signed before that day, so the desk didn't have to wait for it.",
          "Blocked by a waiver: desk tries blocked by a missing or expired waiver.",
        ]}
      >
        <KpiTile
          label="Signed before arriving"
          value={formatShare(data.waivers.share)}
          detail={`${data.waivers.signedBefore} of ${plural(data.waivers.firstVisits, "first visit", "first visits")}`}
        />
        <KpiTile label="Blocked by a waiver" value={data.waivers.blockedByWaiver} detail="Desk tries" />
      </Section>

      <Section
        title="Member self service"
        definitions={[
          "Signed up themselves: new climbers who made their own account, rather than being added at the desk.",
          "Bought online: passes and memberships climbers bought in the app, out of all paid sales.",
        ]}
      >
        <KpiTile
          label="Signed up themselves"
          value={formatShare(data.selfService.signupShare)}
          detail={`${data.selfService.ownLogin} of ${plural(data.selfService.newClimbers, "new climber", "new climbers")}`}
        />
        <KpiTile
          label="Bought online"
          value={formatShare(data.selfService.onlineShare)}
          detail={`${data.selfService.onlineSales} of ${plural(data.selfService.sales, "paid sale", "paid sales")}`}
        />
      </Section>

      <Section
        title="Easy switch"
        definitions={[
          "Days to the first check in: from the gym being set up in Elevate to its first check in.",
          "Voided sales: sales staff had to undo, a sign of mistakes while learning the POS.",
        ]}
      >
        <KpiTile
          label="Days to the first check in"
          value={data.switching.daysToFirstCheckIn ?? "None yet"}
          detail={`Set up ${formatDateTime(data.switching.gymCreatedAt, data.timeZone)}`}
        />
        <KpiTile label="Voided sales" value={data.switching.voidedSales} detail="In the last 14 days" />
      </Section>

      <Typography variant="secondary">
        Not on this page yet: the staff rating after each shift (asked in person during the pilot), and server
        errors and downtime (in the Vercel logs, as server_error).
      </Typography>
    </div>
  );
}
