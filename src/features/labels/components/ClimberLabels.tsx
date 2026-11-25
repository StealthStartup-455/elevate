"use client";

import Alert from "@mui/material/Alert";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { createLabel, labelsToPick, setClimberLabel } from "../actions";
import type { LabelResult, LabelView } from "../types";
import { labelKey, normalizeLabelName } from "../validate";

// A customer's labels where staff open them (#157): the Check-in climber
// panel and their page under Customers. Each chip has a ✕ to take it off, and
// "Add label" opens a picker of the gym's labels they don't have yet, or makes
// a new one from what was typed. Staff only, like everything in this feature.

const OFFLINE = "Couldn't reach the server. Check the connection and try again.";

type Option = { kind: "label"; label: LabelView } | { kind: "create"; name: string };

const filter = createFilterOptions<Option>({
  stringify: (o) => (o.kind === "label" ? o.label.name : o.name),
});

export default function ClimberLabels({
  climberId,
  labels,
  onChanged,
}: {
  climberId: string;
  labels: LabelView[];
  /** The climber panel reads the climber again; the customer page doesn't need to. */
  onChanged?: () => Promise<void>;
}) {
  const router = useRouter();
  const titleId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // The gym's labels while the picker is open; null while it's closed.
  const [gymLabels, setGymLabels] = useState<LabelView[] | null>(null);
  const [input, setInput] = useState("");
  const addRef = useRef<HTMLButtonElement>(null);

  // Back to "Add label" after the picker closes or a chip goes, so the
  // keyboard isn't left on nothing.
  const focusAdd = () => requestAnimationFrame(() => addRef.current?.focus());

  function closePicker() {
    setGymLabels(null);
    setInput("");
    focusAdd();
  }

  // Saves, then shows the change: router.refresh() for the page (and the
  // table behind the panel), onChanged() for the panel. A refusal says why; a
  // dropped connection says so.
  function save(work: () => Promise<LabelResult>, done?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await work();
        if (!result.ok) {
          setError(result.message ?? "Couldn't save the label. Try again.");
          return;
        }
        router.refresh();
        await onChanged?.();
        // Only now, so the picker doesn't close a moment before the new chip shows.
        done?.();
      } catch {
        setError(OFFLINE);
      }
    });
  }

  function openPicker() {
    setError(null);
    startTransition(async () => {
      try {
        setGymLabels(await labelsToPick());
      } catch {
        setError(OFFLINE);
      }
    });
  }

  function remove(label: LabelView) {
    save(() => setClimberLabel(climberId, label.id, false), focusAdd);
  }

  function pick(option: Option) {
    if (option.kind === "label") {
      save(() => setClimberLabel(climberId, option.label.id, true), closePicker);
      return;
    }
    save(async () => {
      const created = await createLabel(option.name);
      // Refused as a duplicate: another desk may have just made it. Add that one.
      if (!created.labelId) return created;
      return setClimberLabel(climberId, created.labelId, true);
    }, closePicker);
  }

  // The picker: the gym's labels they don't have yet, and what was typed.
  const known = gymLabels ?? [];
  const onIds = new Set(labels.map((l) => l.id));
  const options: Option[] = known.filter((l) => !onIds.has(l.id)).map((label) => ({ kind: "label", label }));
  const typed = normalizeLabelName(input);
  // Saved names are already tidy, so their key is just lower case.
  const sameName = (l: LabelView) => typed.ok && labelKey(l.name) === typed.key;
  const alreadyOn = labels.find(sameName);

  // What the picker says when nothing in it matches.
  function emptyMessage(): string {
    if (alreadyOn) return `"${alreadyOn.name}" is already on.`;
    if (!typed.ok && input.trim() !== "") return typed.message;
    if (options.length === 0 && known.length > 0) return "They have every label. Type a new one.";
    return "No labels yet. Type one to make it.";
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      {/* Names the section, like "Membership" beside it; not a heading, which
          would skip a level on the customer page (h1, then this). */}
      <Typography variant="secondary" id={titleId}>
        Labels
      </Typography>
      {labels.length === 0 ? (
        <Typography variant="body">None</Typography>
      ) : (
        <ul className="flex min-w-0 flex-wrap gap-1">
          {labels.map((label) => (
            <li key={label.id} className="flex min-w-0 max-w-full">
              <Chip
                title={label.name}
                label={
                  <>
                    <span className="truncate">{label.name}</span>
                    <ButtonBase
                      data-chip-remove=""
                      aria-label={`Remove label ${label.name}`}
                      disabled={pending}
                      onClick={() => remove(label)}
                    >
                      <span aria-hidden="true">✕</span>
                    </ButtonBase>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}

      {gymLabels === null ? (
        <div>
          <Button ref={addRef} variant="outlined" size="small" onClick={openPicker} disabled={pending}>
            Add label
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Autocomplete<Option>
            className="min-w-0 flex-1"
            openOnFocus
            disabled={pending}
            options={options}
            value={null}
            inputValue={input}
            onInputChange={(_, value, reason) => {
              // "reset" is MUI putting the picked option's name in the box; keep
              // what was typed, so a refused save can be tried again.
              if (reason !== "reset") setInput(value);
            }}
            onChange={(_, option) => {
              if (option) pick(option);
            }}
            onKeyDown={(e) => {
              // Escape with nothing typed closes the picker (with text, MUI clears it first).
              if (e.key === "Escape" && input === "") closePicker();
            }}
            filterOptions={(list, state) => {
              const shown = filter(list, state);
              // Offer to make it, unless it exists (in the list, or already on them).
              if (typed.ok && !alreadyOn && !known.some(sameName)) {
                shown.push({ kind: "create", name: typed.name });
              }
              return shown;
            }}
            getOptionLabel={(o) => (o.kind === "label" ? o.label.name : `Create "${o.name}"`)}
            isOptionEqualToValue={(a, b) =>
              a.kind === "label" && b.kind === "label" ? a.label.id === b.label.id : a.kind === b.kind
            }
            noOptionsText={emptyMessage()}
            renderInput={(params) => <TextField {...params} label="Add label" autoFocus />}
          />
          <Button variant="text" size="small" onClick={closePicker} disabled={pending}>
            Cancel
          </Button>
        </div>
      )}

      {error ? <Alert severity="error">{error}</Alert> : null}
    </section>
  );
}
