"use client";

// Client component, like StatusPill: MUI's Chip can't take props from a Server Component
// that it clones.
import Chip from "@mui/material/Chip";
import StatusPill from "@/components/ui/StatusPill";
import type { Badge } from "../day";

// The pass that let a climber in. Its look is the Chip's `badge` variant in theme.ts.
const BADGE = {
  MEMBER: { label: "Member", color: "secondary" },
  PUNCH_CARD: { label: "Punch card", color: "default" },
  DAY_PASS: { label: "Day pass", color: "primary" },
} as const;

export default function BadgePill({ badge }: { badge: Badge }) {
  // No pass is a problem, not a kind of pass, so it reads as a status.
  if (badge === "NO_PASS") return <StatusPill status="bad" label="No pass" />;
  const { label, color } = BADGE[badge];
  return <Chip variant="badge" color={color} label={label} />;
}
