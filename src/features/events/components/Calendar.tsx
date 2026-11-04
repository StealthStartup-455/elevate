import { getMyClasses, getMyEvents, getMyGymToday, getMyGymWeek } from "../queries";
import CalendarView from "./CalendarView";

// The Classes tab's Calendar view (#101): the same classes and events as the two lists, by
// day, plus the days in the coming week the gym is closed.
export default async function Calendar() {
  const [today, classes, events, week] = await Promise.all([
    getMyGymToday(),
    getMyClasses(),
    getMyEvents(),
    getMyGymWeek(),
  ]);
  if (!today) return null;
  const closed = (week?.days ?? []).filter((d) => d.hours === null).map((d) => ({ day: d.day, note: d.note }));
  return <CalendarView today={today} classes={classes} events={events} closed={closed} />;
}
