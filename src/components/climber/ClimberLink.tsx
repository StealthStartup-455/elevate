"use client";

import MuiLink from "@mui/material/Link";
import NextLink from "next/link";

// A link inside a climber card: bold, at least 44px tall to tap. `inverse` for the dark
// announcement card. Client component so server cards can use next/link through MUI.
export default function ClimberLink({
  href,
  tone = "plain",
  children,
}: {
  href: string;
  tone?: "plain" | "inverse";
  children: React.ReactNode;
}) {
  return (
    <MuiLink
      component={NextLink}
      href={href}
      underline="hover"
      sx={{
        alignSelf: "flex-start",
        minHeight: 44,
        display: "inline-flex",
        alignItems: "center",
        gap: 1.5,
        typography: "body",
        fontWeight: 700,
        color: tone === "inverse" ? "inverse.text" : "primary.main",
      }}
    >
      {children}
    </MuiLink>
  );
}
