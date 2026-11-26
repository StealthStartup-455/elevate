import Typography from "@mui/material/Typography";
import { getDeskCalendar } from "../../queries";
import DeskMonthView from "./DeskMonthView";

// Reads the month of the day in the address for the desk's Calendar tab (#249).
export default async function DeskMonth({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const calendar = await getDeskCalendar((await searchParams).day);
  if (!calendar) return <Typography variant="body">Log in again to see the calendar.</Typography>;
  return <DeskMonthView calendar={calendar} />;
}
