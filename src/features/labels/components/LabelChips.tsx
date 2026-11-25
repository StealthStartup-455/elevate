import Chip from "@mui/material/Chip";
import type { LabelView } from "../types";

// A customer's labels, read only (#157): plain neutral chips, not StatusPills,
// because a label is information, not a status. For the Check-in table and the
// arrival toasts. Nothing when there are none. A long name is cut short with
// "…" rather than widening its column; the chips wrap onto more lines.
export default function LabelChips({ labels }: { labels: LabelView[] }) {
  if (labels.length === 0) return null;
  return (
    <ul aria-label="Labels" className="flex min-w-0 flex-wrap gap-1">
      {labels.map((label) => (
        <li key={label.id} className="flex min-w-0 max-w-full">
          <Chip label={label.name} title={label.name} />
        </li>
      ))}
    </ul>
  );
}
