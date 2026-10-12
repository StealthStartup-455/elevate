import Chip from "@mui/material/Chip";
import type { BusynessLevel } from "../types";

export const LEVEL_LABEL: Record<BusynessLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const LEVEL_COLOR = {
  low: "success",
  medium: "warning",
  high: "error",
} as const satisfies Record<BusynessLevel, string>;

export default function BusynessLevelChip({ level }: { level: BusynessLevel }) {
  return <Chip label={LEVEL_LABEL[level]} color={LEVEL_COLOR[level]} />;
}
