"use client";

// Client component: MUI's Chip clones its icon, which fails for elements passed in from a
// Server Component and causes a hydration error.
import Chip from "@mui/material/Chip";

export type Status = "ok" | "warn" | "bad" | "neutral";

// Green, amber and red only describe state, and always come with ✓, ! or ✕,
// so status never depends on color alone.
const STATUS = {
  ok: { color: "success", icon: "✓" },
  warn: { color: "warning", icon: "!" },
  bad: { color: "error", icon: "✕" },
  neutral: { color: "default", icon: null },
} as const;

export default function StatusPill({
  status,
  label,
  // For the exceptions in STYLE_GUIDE.md (Valid and Expired in the Check-in table).
  showIcon = true,
}: {
  status: Status;
  label: string;
  showIcon?: boolean;
}) {
  const { color, icon } = STATUS[status];
  return (
    <Chip
      color={color}
      label={label}
      icon={icon && showIcon ? <span aria-hidden="true">{icon}</span> : undefined}
    />
  );
}
