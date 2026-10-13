import Chip from "@mui/material/Chip";
import type { WaiverStatus } from "../types";

// Same colours and wording as the waiver column in the check-in table.
const COLOR = {
  valid: "success",
  expired: "warning",
  missing: "error",
} as const satisfies Record<WaiverStatus, string>;

export default function WaiverBadge({ status }: { status: WaiverStatus }) {
  return (
    <Chip size="small" variant="outlined" label={status} color={COLOR[status]} />
  );
}
