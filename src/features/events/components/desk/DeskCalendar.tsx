import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import StatusPill from "@/components/ui/StatusPill";
import { isManager } from "@/features/auth/staff";
import {
  getDeskClasses,
  getDeskClassTypes,
  getDeskEvents,
  getDeskHours,
  getDeskSetChanges,
} from "../../queries";
import AddCalendarItem, { type AddKind } from "./AddCalendarItem";
import CancelCalendarItem from "./CancelCalendarItem";
import OpeningHoursForm from "./OpeningHoursForm";

// The tabs of the desk's Events page (/desk/events/...). What staff save here is what climbers
// see in their app. Hours, class types and events are managers' and owners' to change (#254):
// desk staff see them without the Add, Edit and Cancel buttons. Each action checks too.

const MANAGERS_ONLY = "Only managers and owners can change these.";

type Item = {
  id: string;
  name: string;
  lines: (string | null)[];
  canceled?: boolean;
  /** Extra buttons before Cancel, like Edit on a class type. */
  actions?: React.ReactNode;
};

export async function HoursTab() {
  // The query first: it opens the request (connection()) before anything reads the session.
  const hours = await getDeskHours();
  const canEdit = await isManager();
  if (!hours) return <LoggedOut />;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardContent className="flex flex-col gap-2">
          <Typography variant="cardTitle">Opening hours</Typography>
          <Typography variant="secondary">The regular week. Climbers see the next seven days, today first.</Typography>
          {canEdit ? (
            <OpeningHoursForm week={hours.week} hoursSet={hours.hoursSet} />
          ) : (
            <>
              <ul className="flex flex-col" aria-label="Opening hours">
                {hours.week.map((day) => (
                  <li key={day.weekday} className="flex gap-2 border-b border-line py-2 last:border-b-0">
                    <Typography variant="body" component="span" className="w-10" sx={{ fontWeight: 600 }}>
                      {day.name}
                    </Typography>
                    <Typography variant="body" component="span">
                      {hours.hoursSet ? day.hours : "Not set yet"}
                    </Typography>
                  </li>
                ))}
              </ul>
              <Typography variant="secondary">{MANAGERS_ONLY}</Typography>
            </>
          )}
        </CardContent>
      </Card>
      <CalendarCard
        canEdit={canEdit}
        title="Special days"
        about="Holidays and other days with different hours. They replace the regular hours for that date."
        add="specialDay"
        cancel="specialDay"
        empty="No special days coming up."
        items={hours.specialDays.map((d) => ({ id: d.id, name: d.date, lines: [d.hours, d.note] }))}
      />
    </div>
  );
}

export async function ClassTypesTab() {
  const types = await getDeskClassTypes();
  const canEdit = await isManager();
  return (
    <CalendarCard
      canEdit={canEdit}
      title="Class types"
      about="The classes the gym runs. Schedule sessions of them on the Classes tab. Editing a type doesn't change classes already scheduled."
      add="classType"
      cancel="classType"
      empty="No class types yet. Add one, then schedule it on the Classes tab."
      items={types.map((t) => ({
        id: t.id,
        name: t.name,
        lines: [t.summary, t.details, t.upcoming ? `${t.upcoming} coming up` : "Nothing scheduled"],
        actions: (
          <AddCalendarItem
            kind="editClassType"
            id={t.id}
            variant="outlined"
            ariaLabel={`Edit ${t.name}`}
            initial={{
              name: t.name,
              durationMinutes: String(t.durationMinutes),
              capacity: String(t.capacity),
              instructor: t.instructor ?? "",
              details: t.details ?? "",
            }}
          />
        ),
      }))}
    />
  );
}

export async function ClassesTab() {
  const [classes, types] = await Promise.all([getDeskClasses(), getDeskClassTypes()]);
  return (
    <CalendarCard
      title="Classes"
      about="Sessions climbers sign up for in the app, for the two weeks ahead. Free; each one starts from its class type."
      add="class"
      addOptions={types.map((t) => ({ value: t.id, label: `${t.name} (${t.summary})` }))}
      cancel="class"
      empty="No classes scheduled."
      items={classes.map((c) => ({
        id: c.id,
        name: c.title,
        lines: [
          [c.when, c.instructor ? `with ${c.instructor}` : null].filter(Boolean).join(" · "),
          `${c.signedUp.length} of ${c.capacity} signed up${c.signedUp.length ? `: ${c.signedUp.join(", ")}` : ""}`,
        ],
        canceled: c.canceled,
      }))}
    />
  );
}

export async function SetChangesTab() {
  const changes = await getDeskSetChanges();
  return (
    <CalendarCard
      title="Set changes"
      about="Walls closing for a reset. Climbers see them coming up, then as new routes for two weeks."
      add="setChange"
      cancel="setChange"
      empty="No set changes planned."
      items={changes.map((s) => ({ id: s.id, name: s.wall, lines: [s.when, s.note], canceled: s.canceled }))}
    />
  );
}

export async function EventsTab() {
  const events = await getDeskEvents();
  const canEdit = await isManager();
  return (
    <CalendarCard
      canEdit={canEdit}
      title="Events"
      about="Competitions, film nights, meetups. Climbers see the next one at the top of their Home tab for the 30 days before."
      add="event"
      cancel="event"
      empty="No events coming up."
      items={events.map((e) => ({ id: e.id, name: e.title, lines: [e.when, e.details], canceled: e.canceled }))}
    />
  );
}

function LoggedOut() {
  return <Typography variant="body">Log in again to see the calendar.</Typography>;
}

function CalendarCard({
  canEdit = true,
  title,
  about,
  add,
  addOptions,
  cancel,
  empty,
  items,
}: {
  /** False for desk staff on a manager-only card (#254): no Add, Edit or Cancel. */
  canEdit?: boolean;
  title: string;
  about: string;
  add: AddKind;
  addOptions?: { value: string; label: string }[];
  cancel: "event" | "setChange" | "class" | "classType" | "specialDay";
  empty: string;
  items: Item[];
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Typography variant="cardTitle">{title}</Typography>
          {canEdit ? <AddCalendarItem kind={add} options={addOptions} /> : null}
        </div>
        <Typography variant="secondary">{about}</Typography>
        {canEdit ? null : <Typography variant="secondary">{MANAGERS_ONLY}</Typography>}
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
                ) : !canEdit ? null : (
                  <div className="flex flex-wrap gap-2">
                    {item.actions}
                    <CancelCalendarItem kind={cancel} id={item.id} name={item.name} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
