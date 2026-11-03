import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import Classes from "@/features/events/components/Classes";
import ClassesOrEvents from "@/features/events/components/ClassesOrEvents";
import EventsList from "@/features/events/components/EventsList";

// Classes & events tab: sign up for classes, and see what the gym has announced (#101).
export default function ClassesPage({ searchParams }: PageProps<"/me/classes">) {
  return (
    <>
      <Typography variant="pageTitle">Classes &amp; events</Typography>
      <Suspense fallback={<Typography variant="secondary">Loading classes…</Typography>}>
        <Calendar searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Calendar({ searchParams }: Pick<PageProps<"/me/classes">, "searchParams">) {
  const { view } = await searchParams;
  return (
    <ClassesOrEvents
      initial={view === "events" ? "events" : "classes"}
      classes={<Classes />}
      events={<EventsList />}
    />
  );
}
