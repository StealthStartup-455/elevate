"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import { saveOpeningHours } from "../../actions";
import type { DeskWeekday } from "../../queries";

const OFFLINE = "Couldn't reach the server. Check the connection and try again.";

// The gym's regular week. All seven days save together, so the week climbers
// see is never half changed.
export default function OpeningHoursForm({ week, hoursSet }: { week: DeskWeekday[]; hoursSet: boolean }) {
  const [days, setDays] = useState(week);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function change(weekday: number, patch: Partial<DeskWeekday>) {
    setMessage(null);
    setDays((current) => current.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await saveOpeningHours(
          days.map(({ weekday, closed, opensAt, closesAt }) => ({ weekday, closed, opensAt, closesAt })),
        );
        setMessage(result.ok ? { ok: true, text: "Hours saved. Climbers see them now." } : { ok: false, text: result.message });
      } catch {
        setMessage({ ok: false, text: OFFLINE });
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {hoursSet ? null : (
        <Alert severity="info">Not set yet. Climbers don&apos;t see any hours until you save them.</Alert>
      )}
      <ul className="flex flex-col">
        {days.map((day) => (
          <li key={day.weekday} className="flex flex-wrap items-center gap-2 border-b border-line py-2 last:border-b-0">
            <Typography variant="body" component="span" className="w-10" sx={{ fontWeight: 600 }}>
              {day.name}
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={day.closed}
                  onChange={(e) => change(day.weekday, { closed: e.target.checked })}
                  slotProps={{ input: { "aria-label": `${day.name}: closed` } }}
                />
              }
              label="Closed"
            />
            {/* Each field names its day, so a screen reader can tell the seven apart. */}
            <TextField
              type="time"
              size="small"
              label="Opens"
              value={day.opensAt}
              disabled={day.closed}
              onChange={(e) => change(day.weekday, { opensAt: e.target.value })}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { "aria-label": `${day.name} opens` } }}
            />
            <TextField
              type="time"
              size="small"
              label="Closes"
              value={day.closesAt}
              disabled={day.closed}
              onChange={(e) => change(day.weekday, { closesAt: e.target.value })}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { "aria-label": `${day.name} closes` } }}
            />
          </li>
        ))}
      </ul>
      <Typography variant="secondary">A closing time of 12:00 AM means midnight.</Typography>
      {message ? <Alert severity={message.ok ? "success" : "error"}>{message.text}</Alert> : null}
      <div>
        <Button variant="contained" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save hours"}
        </Button>
      </div>
    </div>
  );
}
