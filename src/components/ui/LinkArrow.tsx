"use client";

import MuiLink from "@mui/material/Link";
import NextLink from "next/link";

// A link that opens another page: slate blue, semibold, with an arrow that nudges on hover.
// Use it for "View all", "Open schedule" and similar. Not for actions (use Button).
export default function LinkArrow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <MuiLink
      component={NextLink}
      href={href}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        whiteSpace: "nowrap",
        "& .arrow": { transition: "transform 120ms" },
        "&:hover .arrow": { transform: "translateX(2px)" },
      }}
    >
      {children}
      <span className="arrow" aria-hidden="true">
        →
      </span>
    </MuiLink>
  );
}
