import Chip from "@mui/material/Chip";
import type { BusynessLevel } from "../types";

// Matches the heat map legend (Quiet to Busy) from the dashboard mock.
export const LEVEL_LABEL: Record<BusynessLevel, string> = {
  low: "Quiet",
  medium: "Moderate",
  high: "Busy",
};

export const LEVEL_COLOR = {
  low: "success",
  medium: "warning",
  high: "error",
} as const satisfies Record<BusynessLevel, string>;

export default function BusynessLevelChip({ level }: { level: BusynessLevel }) {
  return <Chip label={LEVEL_LABEL[level]} color={LEVEL_COLOR[level]} />;
}
