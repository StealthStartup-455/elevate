import Typography from "@mui/material/Typography";
import ClimberCard from "@/components/climber/ClimberCard";
import IconTile, { type IconTone } from "@/components/climber/IconTile";
import { SparkleIcon, WrenchIcon } from "@/components/climber/icons";
import StatusPill, { type Status } from "@/components/ui/StatusPill";
import { getMySetChanges } from "../queries";
import type { SetChangeState } from "../schedule";

const STATE: Record<SetChangeState, { status: Status; label: string; tone: IconTone }> = {
  now: { status: "warn", label: "Closed now", tone: "warn" },
  coming: { status: "neutral", label: "Coming up", tone: "warn" },
  new: { status: "ok", label: "New", tone: "ok" },
};

// Which walls are closed for setting, now or soon, and which have new routes. Hidden when
// nothing is being reset and nothing is new.
export default async function SetChanges() {
  const changes = await getMySetChanges();
  if (changes.length === 0) return null;

  return (
    <ClimberCard title="Set changes">
      <ul aria-label="Set changes" className="m-0 flex list-none flex-col gap-4 p-0">
        {changes.map((change) => {
          const state = STATE[change.state];
          return (
            <li key={change.id} className="flex items-start gap-3">
              <IconTile tone={state.tone}>{change.state === "new" ? <SparkleIcon /> : <WrenchIcon />}</IconTile>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Typography variant="body" component="span" sx={{ fontWeight: 700 }}>
                    {change.wall}
                  </Typography>
                  <StatusPill status={state.status} label={state.label} />
                </div>
                <Typography variant="secondary">{change.text}</Typography>
                {change.note ? <Typography variant="secondary">{change.note}</Typography> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </ClimberCard>
  );
}
