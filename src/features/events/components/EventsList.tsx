import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ClimberCard from "@/components/climber/ClimberCard";
import StatusPill from "@/components/ui/StatusPill";
import { getMyEvents } from "../queries";

// Every event on now or in the next 60 days, soonest first: competitions, socials, and ones
// the gym canceled, marked so nobody turns up for them.
export default async function EventsList() {
  const events = await getMyEvents();
  if (events.length === 0) {
    return (
      <ClimberCard label="Events">
        <Typography variant="body">Nothing on the calendar yet. The gym announces events here.</Typography>
      </ClimberCard>
    );
  }

  return (
    <ul aria-label="Events" className="m-0 flex list-none flex-col gap-3 p-0">
      {events.map((event) => (
        <Box
          component="li"
          key={event.id}
          data-testid="event-row"
          sx={{ bgcolor: "background.paper", borderRadius: 5, p: 5, display: "flex", flexDirection: "column", gap: 2 }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {event.canceled ? (
              <StatusPill status="bad" label="Canceled" />
            ) : (
              <Box
                component="span"
                sx={{ bgcolor: "highlight.bg", color: "highlight.text", typography: "label", px: 2.5, py: 1, borderRadius: 999 }}
              >
                {event.startsIn}
              </Box>
            )}
          </div>
          <Typography
            variant="cardTitle"
            component="h2"
            sx={event.canceled ? { color: "text.secondary", textDecoration: "line-through" } : undefined}
          >
            {event.title}
          </Typography>
          <Typography variant="body" sx={{ color: "text.secondary" }}>
            {event.when}
          </Typography>
          {event.details && !event.canceled ? <Typography variant="secondary">{event.details}</Typography> : null}
        </Box>
      ))}
    </ul>
  );
}
