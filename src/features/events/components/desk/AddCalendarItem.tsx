"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useId, useState, useTransition } from "react";
import { useDeskDialogOpen } from "@/features/check-ins/desk-dialogs";
import {
  addClass,
  addClassType,
  addEvent,
  addSetChange,
  addSpecialHours,
  updateClassType,
  type CalendarResult,
} from "../../actions";

const OFFLINE = "Couldn't reach the server. Check the connection and try again.";

type Field = {
  name: string;
  label: string;
  type?: "text" | "multiline" | "datetime-local" | "date" | "time" | "number" | "checkbox" | "select";
  required?: boolean;
  helper?: string;
  defaultValue?: string;
  /** Hidden while this checkbox is ticked. */
  hiddenWhen?: string;
};

type Values = Record<string, string | boolean>;

type Form = {
  button: string;
  title: string;
  submit: string;
  fields: Field[];
  save: (values: Values, id?: string) => Promise<CalendarResult>;
};

const str = (v: string | boolean | undefined) => (typeof v === "string" ? v : "");

const CLASS_TYPE_FIELDS: Field[] = [
  { name: "name", label: "Name", required: true, helper: "Like \"Intro to bouldering\"" },
  { name: "durationMinutes", label: "Length in minutes", type: "number", required: true, defaultValue: "60" },
  { name: "capacity", label: "Places", type: "number", required: true, defaultValue: "8" },
  { name: "instructor", label: "Usual instructor" },
  { name: "details", label: "Details for climbers", type: "multiline" },
];

const classType = (v: Values) => ({
  name: str(v.name),
  durationMinutes: str(v.durationMinutes),
  capacity: str(v.capacity),
  instructor: str(v.instructor),
  details: str(v.details),
});

// One form per kind of calendar item. The actions check everything again on
// the server; these fields only shape what is sent.
const FORMS = {
  specialDay: {
    button: "Add special day",
    title: "Special hours for one day",
    submit: "Save day",
    fields: [
      { name: "date", label: "Date", type: "date", required: true },
      { name: "closed", label: "Closed all day", type: "checkbox" },
      { name: "opensAt", label: "Opens", type: "time", hiddenWhen: "closed" },
      { name: "closesAt", label: "Closes", type: "time", hiddenWhen: "closed", helper: "12:00 AM means midnight" },
      { name: "note", label: "Note for climbers", helper: "Like \"Remembrance Day\"" },
    ],
    save: (v) =>
      addSpecialHours({
        date: str(v.date),
        closed: v.closed === true,
        opensAt: str(v.opensAt),
        closesAt: str(v.closesAt),
        note: str(v.note),
      }),
  },
  event: {
    button: "Announce event",
    title: "Announce an event",
    submit: "Announce",
    fields: [
      { name: "title", label: "Name", required: true, helper: "Like \"Fall bouldering comp\"" },
      { name: "startsAt", label: "Starts", type: "datetime-local", required: true },
      { name: "endsAt", label: "Ends", type: "datetime-local" },
      { name: "details", label: "Details", type: "multiline" },
    ],
    save: (v) =>
      addEvent({ title: str(v.title), startsAt: str(v.startsAt), endsAt: str(v.endsAt), details: str(v.details) }),
  },
  setChange: {
    button: "Add set change",
    title: "Plan a set change",
    submit: "Save set change",
    fields: [
      { name: "wall", label: "Wall", required: true, helper: "Like \"Cave\" or \"Slab\"" },
      { name: "startsAt", label: "Wall closes", type: "datetime-local", required: true },
      { name: "endsAt", label: "New routes open", type: "datetime-local", required: true },
      { name: "note", label: "Note for climbers", helper: "Like \"New V0 to V6 circuit\"" },
    ],
    save: (v) =>
      addSetChange({ wall: str(v.wall), startsAt: str(v.startsAt), endsAt: str(v.endsAt), note: str(v.note) }),
  },
  classType: {
    button: "Add class type",
    title: "Add a class type",
    submit: "Add class type",
    fields: CLASS_TYPE_FIELDS,
    save: (v) => addClassType(classType(v)),
  },
  editClassType: {
    button: "Edit",
    title: "Edit class type",
    submit: "Save changes",
    fields: CLASS_TYPE_FIELDS,
    save: (v, id) => updateClassType(id ?? "", classType(v)),
  },
  class: {
    button: "Schedule a class",
    title: "Schedule a class",
    submit: "Schedule",
    fields: [
      { name: "classTypeId", label: "Class type", type: "select", required: true },
      { name: "startsAt", label: "Starts", type: "datetime-local", required: true },
      { name: "instructor", label: "Instructor", helper: "Leave empty for the usual instructor" },
      { name: "capacity", label: "Places", type: "number", helper: "Leave empty for the class type's places" },
    ],
    save: (v) =>
      addClass({
        classTypeId: str(v.classTypeId),
        startsAt: str(v.startsAt),
        instructor: str(v.instructor),
        capacity: str(v.capacity),
      }),
  },
} satisfies Record<string, Form>;

export type AddKind = keyof typeof FORMS;

function initialValues(fields: Field[], initial?: Record<string, string>): Values {
  return Object.fromEntries(
    fields.map((f) => [f.name, f.type === "checkbox" ? false : (initial?.[f.name] ?? f.defaultValue ?? "")]),
  );
}

type Props = {
  kind: AddKind;
  /** The item being edited (editClassType). */
  id?: string;
  /** Values to start the form with, like the class type being edited. */
  initial?: Record<string, string>;
  /** Choices for a select field, like the class types to schedule. */
  options?: { value: string; label: string }[];
  /** `outlined` for a row's own button; the card's main "Add" button is contained. */
  variant?: "contained" | "outlined";
  /** Names the button for screen readers when its text alone is ambiguous ("Edit"). */
  ariaLabel?: string;
};

// The "Add …" button on each calendar card (or a row's "Edit"), and its form.
export default function AddCalendarItem({ kind, id, initial, options = [], variant = "contained", ariaLabel }: Props) {
  const form: Form = FORMS[kind];
  const [open, setOpen] = useState(false);
  // Hold the scan popup while the form is open (#92, #127).
  useDeskDialogOpen(open);
  const [values, setValues] = useState<Values>(() => initialValues(form.fields, initial));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const titleId = useId();

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
    setValues(initialValues(form.fields, initial));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await form.save(values, id);
        if (result.ok) {
          setOpen(false);
          setValues(initialValues(form.fields, initial));
        } else setError(result.message);
      } catch {
        setError(OFFLINE);
      }
    });
  }

  return (
    <>
      <Button variant={variant} size="small" onClick={() => setOpen(true)} aria-label={ariaLabel}>
        {form.button}
      </Button>
      <Dialog open={open} onClose={close} fullWidth maxWidth="xs" aria-labelledby={titleId}>
        <form onSubmit={submit} noValidate>
          <DialogTitle id={titleId}>{form.title}</DialogTitle>
          <DialogContent className="flex flex-col gap-3">
            {form.fields.map((field) => {
              if (field.hiddenWhen && values[field.hiddenWhen] === true) return null;
              if (field.type === "checkbox") {
                return (
                  <FormControlLabel
                    key={field.name}
                    label={field.label}
                    control={
                      <Checkbox
                        checked={values[field.name] === true}
                        onChange={(e) => setValues({ ...values, [field.name]: e.target.checked })}
                      />
                    }
                  />
                );
              }
              if (field.type === "select") {
                return (
                  <TextField
                    key={field.name}
                    select
                    name={field.name}
                    label={field.label}
                    required={field.required}
                    value={str(values[field.name])}
                    onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                    helperText={options.length === 0 ? "Add a class type first, on the Class types tab." : field.helper}
                  >
                    {options.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </TextField>
                );
              }
              const multiline = field.type === "multiline";
              return (
                <TextField
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  type={multiline ? "text" : (field.type ?? "text")}
                  multiline={multiline}
                  minRows={multiline ? 2 : undefined}
                  required={field.required}
                  helperText={field.helper}
                  value={str(values[field.name])}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                  slotProps={field.type && !multiline ? { inputLabel: { shrink: true } } : undefined}
                />
              );
            })}
            {error ? <Alert severity="error">{error}</Alert> : null}
          </DialogContent>
          <DialogActions>
            <Button disabled={pending} onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={pending}>
              {pending ? "Saving…" : form.submit}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
