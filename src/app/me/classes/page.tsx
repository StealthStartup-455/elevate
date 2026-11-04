import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import Calendar from "@/features/events/components/Calendar";
import Classes from "@/features/events/components/Classes";
import ClassesOrEvents from "@/features/events/components/ClassesOrEvents";
import EventsList from "@/features/events/components/EventsList";

// Classes & events tab: sign up for classes, see what the gym has announced, or see both by
// day on a calendar (#101).
export default function ClassesPage({ searchParams }: PageProps<"/me/classes">) {
  return (
    <>
      <Typography variant="pageTitle">Classes &amp; events</Typography>
      <Suspense fallback={<Typography variant="secondary">Loading classes…</Typography>}>
        <Views searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Views({ searchParams }: Pick<PageProps<"/me/classes">, "searchParams">) {
  const { view } = await searchParams;
  return (
    <ClassesOrEvents
      initial={view === "events" || view === "calendar" ? view : "classes"}
      classes={<Classes />}
      events={<EventsList />}
      calendar={<Calendar />}
    />
  );
}
