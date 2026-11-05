"use client";

import Box from "@mui/material/Box";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { tabBar } from "@/components/ui/theme/climber/tokens";
import { CalendarIcon, CardIcon, CompassIcon, HomeIcon, QrIcon } from "./icons";

export const CLIMBER_TABS = [
  { href: "/me", label: "Home", Icon: HomeIcon },
  { href: "/me/check-in", label: "Check in", Icon: QrIcon },
  { href: "/me/membership", label: "Membership", Icon: CardIcon },
  { href: "/me/classes", label: "Classes", Icon: CalendarIcon },
  { href: "/me/explore", label: "Explore", Icon: CompassIcon },
] as const;

export type ClimberTab = (typeof CLIMBER_TABS)[number]["href"];

// Which tab a path belongs to: its own, or Home for /me and anything not under another tab.
export function tabFor(pathname: string): ClimberTab {
  const match = CLIMBER_TABS.filter((t) => t.href !== "/me").find(
    (t) => pathname === t.href || pathname.startsWith(`${t.href}/`),
  );
  return match?.href ?? "/me";
}

// The climber app's bottom tab bar, finding the current tab from the URL. Reading the URL makes
// it dynamic, so the layout wraps it in <Suspense> with <TabBarView active={null} /> as the
// fallback: the same bar, nothing selected yet.
export default function TabBar({ current, sticky = true }: { current?: ClimberTab; sticky?: boolean }) {
  const pathname = usePathname();
  return <TabBarView active={current ?? tabFor(pathname)} sticky={sticky} />;
}

// The bar itself, like most phone apps: five tabs, an icon over a label, the current one in teal
// and marked aria-current. It stays at the bottom of the screen (`sticky={false}` for the style
// guide) and clears the phone's home indicator.
export function TabBarView({ active, sticky = true }: { active: ClimberTab | null; sticky?: boolean }) {
  return (
    <Box
      component="nav"
      aria-label="Main"
      sx={{
        position: sticky ? "sticky" : "static",
        bottom: 0,
        zIndex: 10,
        bgcolor: "background.paper",
        borderTop: 1,
        borderColor: "divider",
        pb: "env(safe-area-inset-bottom)",
      }}
    >
      <Box
        component="ul"
        sx={{
          listStyle: "none",
          m: 0,
          mx: "auto",
          px: 2,
          maxWidth: 560,
          height: tabBar.height,
          display: "grid",
          gridTemplateColumns: `repeat(${CLIMBER_TABS.length}, minmax(0, 1fr))`,
        }}
      >
        {CLIMBER_TABS.map(({ href, label, Icon }) => {
          const on = href === active;
          return (
            <li key={href} className="flex">
              <Box
                component={NextLink}
                href={href}
                aria-current={on ? "page" : undefined}
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  borderRadius: 3.5,
                  color: on ? "primary.main" : "text.secondary",
                  typography: "label",
                  fontWeight: on ? 800 : 600,
                  textDecoration: "none",
                  transition: "color 120ms",
                  "&:hover": { color: on ? "primary.main" : "text.primary" },
                  "&:focus-visible": { outline: 2, outlineColor: "primary.main", outlineOffset: -2 },
                }}
              >
                <Icon size={26} strokeWidth={on ? 2.3 : 2} />
                {label}
              </Box>
            </li>
          );
        })}
      </Box>
    </Box>
  );
}
