import type { WaiverStatus } from "../types";

const LABEL: Record<WaiverStatus, string> = {
  valid: "Waiver valid",
  expired: "Waiver expired",
  missing: "No waiver",
};

export default function WaiverBadge({ status }: { status: WaiverStatus }) {
  return (
    <span className="whitespace-nowrap rounded-full border border-foreground/30 px-2 py-0.5 text-sm">
      {LABEL[status]}
    </span>
  );
}
