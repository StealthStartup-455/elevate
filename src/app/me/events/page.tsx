import { redirect } from "next/navigation";

// Events live on the Classes tab (#101).
export default function MyEventsPage() {
  redirect("/me/classes?view=events");
}
