import Announcement from "@/components/climber/Announcement";
import { ArrowIcon } from "@/components/climber/icons";
import { getMyAnnouncements } from "../queries";
import ClimberLink from "@/components/climber/ClimberLink";

// The event the gym announces at the top of Home (a competition, a film night): the soonest one
// still on, as the climber app's one dark card. Only there while an event starts in the next 30
// days; with none, nothing renders. The rest are on the Classes tab, under Events.
export default async function EventBanner() {
  const [event, ...more] = await getMyAnnouncements();
  if (!event) return null;

  return (
    <Announcement
      testId="event-banner"
      tag={event.canceled ? "Canceled" : event.startsIn}
      title={event.canceled ? `Canceled: ${event.title}` : event.title}
      when={event.when}
      details={event.canceled ? null : event.details}
    >
      <ClimberLink href="/me/classes?view=events" tone="inverse">
        {more.length > 0 ? `See all events (${more.length + 1})` : "See all events"} <ArrowIcon size={20} />
      </ClimberLink>
    </Announcement>
  );
}
