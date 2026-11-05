"use client";

import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

export const EVENTS_TABS = [
  { href: "/desk/events/hours", label: "Hours" },
  { href: "/desk/events/class-types", label: "Class types" },
  { href: "/desk/events/classes", label: "Classes" },
  { href: "/desk/events/set-changes", label: "Set changes" },
  { href: "/desk/events/announcements", label: "Events" },
] as const;

// The sub-tabs of the desk's Events page. Each is its own page, so a tab can be linked to and
// reloads where it was. Navigation, so slate blue (STYLE_GUIDE.md, Navigation and settings).
// Reading the URL makes it dynamic: the layout wraps it in <Suspense> with `current={false}`.
export default function EventsTabs({ current }: { current?: string | false }) {
  const pathname = usePathname();
  return <EventsTabsView current={current ?? EVENTS_TABS.find((t) => pathname.startsWith(t.href))?.href ?? false} />;
}

export function EventsTabsView({ current }: { current: string | false }) {
  return (
    <Tabs value={current} aria-label="Events sections" variant="scrollable" scrollButtons={false}>
      {EVENTS_TABS.map((t) => (
        <Tab key={t.href} value={t.href} label={t.label} component={NextLink} href={t.href} />
      ))}
    </Tabs>
  );
}
