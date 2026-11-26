import Chip from "@mui/material/Chip";
import type { LabelView } from "../types";

// A customer's labels, read only (#157): plain neutral chips, not StatusPills,
// because a label is information, not a status. For the Check-in table and the
// arrival toasts. Nothing when there are none. A long name is cut short with
// "…" rather than widening its column; the chips wrap onto more lines.
//
// `max` keeps a busy row short: the first `max` labels, then "+N more". Screen
// readers hear the hidden names instead of the count, and a pointer gets them
// as a hint; every label is always on the climber's panel.
export default function LabelChips({ labels, max }: { labels: LabelView[]; max?: number }) {
  if (labels.length === 0) return null;
  const shown = max === undefined ? labels : labels.slice(0, max);
  const hidden = labels.slice(shown.length).map((l) => l.name);
  return (
    <ul aria-label="Labels" className="flex min-w-0 flex-wrap gap-1">
      {shown.map((label) => (
        <li key={label.id} className="flex min-w-0 max-w-full">
          <Chip label={label.name} title={label.name} />
        </li>
      ))}
      {hidden.length > 0 ? (
        <li className="flex">
          <Chip
            data-chip-more=""
            title={hidden.join(", ")}
            label={
              <>
                <span aria-hidden="true">+{hidden.length} more</span>
                <span className="sr-only">{hidden.join(", ")}</span>
              </>
            }
          />
        </li>
      ) : null}
    </ul>
  );
}
