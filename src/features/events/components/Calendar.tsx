import { describeHours } from "../hours";
import { getMyCalendarHours, getMyClasses, getMyEvents, getMyGymToday } from "../queries";
import CalendarView from "./CalendarView";

// The Classes tab's Calendar view (#101): the same classes and events as the two lists, by
// day, with the gym's hours for each day (special days and closures included).
export default async function Calendar() {
  const [today, classes, events, hours] = await Promise.all([
    getMyGymToday(),
    getMyClasses(),
    getMyEvents(),
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
