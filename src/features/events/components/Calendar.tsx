import { describeHours } from "../hours";
import { getMyCalendarEvents, getMyCalendarHours, getMyClasses, getMyGymToday } from "../queries";
import CalendarView from "./CalendarView";

// The Classes tab's Calendar view (#101): a year ahead of the gym's hours (special days and
// closures included) and events, and the next two weeks of classes, by day.
export default async function Calendar() {
  const [today, classes, events, hours] = await Promise.all([
    getMyGymToday(),
    getMyClasses(),
    getMyCalendarEvents(),
    getMyCalendarHours(),
  ]);
  if (!today) return null;
  const days = (hours ?? []).map((d) => ({
    day: d.day,
    hours: d.hours ? describeHours(d.hours) : null,
    special: d.special,
    note: d.note,
  }));
  return <CalendarView today={today} classes={classes} events={events} hours={days} />;
}
