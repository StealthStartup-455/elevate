"use client";

import Button from "@mui/material/Button";
import Link from "next/link";

// A MUI button that navigates with next/link. Client component so server pages
// can use it without passing a component across the boundary.
export default function LinkButton({
  href,
  children,
  variant = "contained",
  size,
  color,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "contained" | "outlined" | "text";
  size?: "small" | "medium" | "large";
  /** Only for a renew link (warning); leave out for the usual action color. */
  color?: "warning";
}) {
  return (
    <Button component={Link} href={href} variant={variant} size={size} color={color}>
      {children}
    </Button>
  );
}
