"use client";

import Box from "@mui/material/Box";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// A link in a page's top nav bar (the desk's Check-in, POS, Climbers). The page you're on is
// marked: slate blue, a navigation tint and a bar underneath, plus aria-current for screen
// readers. A clicked link takes that look straight away, while the next page loads.
//
// `exact` for a section's home (/desk), so it isn't marked on every page under it.
export default function NavLink({ href, exact = false, children }: { href: string; exact?: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const current = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav"
    >
      <NavLabel current={current}>{children}</NavLabel>
    </Link>
  );
}

// useLinkStatus only works inside the Link, so the look lives here.
function NavLabel({ current, children }: { current: boolean; children: ReactNode }) {
  const { pending } = useLinkStatus();
  const on = current || pending;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        px: 2,
        py: 1,
        borderRadius: 1,
        typography: "body",
        // The same weight either way, so marking a link never shifts the bar.
        fontWeight: 600,
        color: on ? "secondary.main" : "text.secondary",
        bgcolor: on ? "secondary.soft" : "transparent",
        borderBottom: 2,
        borderColor: on ? "secondary.main" : "transparent",
        transition: "background-color 120ms, color 120ms",
        "a:hover > &": { bgcolor: on ? "secondary.softHover" : "background.subtle", color: on ? "secondary.main" : "text.primary" },
      }}
    >
      {children}
    </Box>
  );
}
