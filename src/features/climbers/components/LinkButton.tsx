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
  fullWidth,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "contained" | "outlined" | "text";
  size?: "small" | "medium" | "large";
  /** warning: a renew link. error: a button staff must notice (POS in the Check in dialog). */
  color?: "warning" | "error";
  fullWidth?: boolean;
}) {
  return (
    <Button component={Link} href={href} variant={variant} size={size} color={color} fullWidth={fullWidth}>
      {children}
    </Button>
  );
}
