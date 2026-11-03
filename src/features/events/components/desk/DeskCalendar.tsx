import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import StatusPill from "@/components/ui/StatusPill";
import { getDeskCalendar } from "../../queries";
import AddCalendarItem, { type AddKind } from "./AddCalendarItem";
import CancelCalendarItem from "./CancelCalendarItem";
import OpeningHoursForm from "./OpeningHoursForm";

type Item = {
  id: string;
  name: string;
  lines: (string | null)[];
  canceled?: boolean;
};

// The gym calendar staff keep: hours, special days, events, set changes and
// classes. What they save here is what climbers see on their dashboard.
export default async function DeskCalendar() {
  const calendar = await getDeskCalendar();
  if (!calendar) return <Typography variant="body">Log in again to see the calendar.</Typography>;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardContent className="flex flex-col gap-2">
          <Typography variant="cardTitle">Opening hours</Typography>
          <Typography variant="secondary">The regular week. Climbers see the next seven days, today first.</Typography>
          <OpeningHoursForm week={calendar.week} hoursSet={calendar.hoursSet} />
        </CardContent>
      </Card>

      <CalendarCard
        title="Special days"
        about="Holidays and other days with different hours. They replace the regular hours for that date."
        kind="specialDay"
        empty="No special days coming up."
        items={calendar.specialDays.map((d) => ({ id: d.id, name: d.date, lines: [d.hours, d.note] }))}
      />

      <CalendarCard
        title="Events"
        about="Competitions, film nights, meetups. Climbers see them at the top of their dashboard for the 30 days before."
        kind="event"
        empty="No events coming up."
        items={calendar.events.map((e) => ({ id: e.id, name: e.title, lines: [e.when, e.details], canceled: e.canceled }))}
      />

      <CalendarCard
        title="Set changes"
        about="Walls closing for a reset. Climbers see them coming up, then as new routes for two weeks."
        kind="setChange"
        empty="No set changes planned."
        items={calendar.setChanges.map((s) => ({ id: s.id, name: s.wall, lines: [s.when, s.note], canceled: s.canceled }))}
      />

      <div className="lg:col-span-2">
        <CalendarCard
          title="Classes"
          about="Free classes climbers sign up for in the app, for the two weeks ahead."
          kind="class"
          empty="No classes coming up."
          items={calendar.classes.map((c) => ({
            id: c.id,
            name: c.title,
            lines: [
              [c.when, c.instructor ? `with ${c.instructor}` : null].filter(Boolean).join(" · "),
              `${c.signedUp.length} of ${c.capacity} signed up${c.signedUp.length ? `: ${c.signedUp.join(", ")}` : ""}`,
            ],
            canceled: c.canceled,
          }))}
        />
      </div>
    </div>
  );
}

function CalendarCard({
  title,
  about,
  kind,
  empty,
  items,
}: {
  title: string;
  about: string;
  kind: AddKind;
  empty: string;
  items: Item[];
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Typography variant="cardTitle">{title}</Typography>
          <AddCalendarItem kind={kind} />
        </div>
        <Typography variant="secondary">{about}</Typography>
        {items.length === 0 ? (
          <Typography variant="body">{empty}</Typography>
        ) : (
          <ul className="flex flex-col" aria-label={title}>
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-2 border-b border-line py-2 last:border-b-0"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <Typography variant="body" sx={{ fontWeight: 600 }}>
                    {item.name}
                  </Typography>
                  {item.lines.filter(Boolean).map((line, i) => (
                    <Typography key={i} variant="secondary">
                      {line}
                    </Typography>
                  ))}
                </div>
                {item.canceled ? (
                  <StatusPill status="bad" label="Canceled" />
                ) : (
                  <CancelCalendarItem kind={kind} id={item.id} name={item.name} />
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
