"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState, type ReactNode } from "react";
import { updateClimber } from "../actions";
import { formatDate } from "../format";
import type { ClimberInput, FormState } from "../types";
import ClimberForm from "./ClimberForm";

type Props = {
  climberId: string;
  details: ClimberInput;
  /** Open in the form, e.g. from the climber table's Edit link (?edit=1). */
  startEditing?: boolean;
  /** Shown under the details when not editing: the waiver row and step. */
  children?: ReactNode;
};

// A climber's details on the desk (#89): read-only, with an Edit button that
// swaps in the form. Editing hides the waiver step, so the card never has two
// contained buttons.
export default function ClimberDetails({ climberId, details, startEditing = false, children }: Props) {
  const [editing, setEditing] = useState(startEditing);
  const [saved, setSaved] = useState(false);

  async function save(prev: FormState, formData: FormData): Promise<FormState> {
    const result = await updateClimber(climberId, prev, formData);
    if (result.status === "success") {
      setEditing(false);
      setSaved(true);
    }
    return result;
  }

  if (editing) {
    return (
      <Stack spacing={4}>
        <ClimberForm action={save} defaults={details} submitLabel="Save changes" />
        <Button variant="outlined" size="large" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </Stack>
    );
  }

  const rows: [string, string][] = [
    ["Phone", details.phone],
    ["Email", details.email || "None"],
    ["Born", details.dateOfBirth ? formatDate(details.dateOfBirth, true) : "Unknown"],
  ];

  return (
    <Stack spacing={4}>
      {saved ? <Alert severity="success">Saved.</Alert> : null}
      <Box
        component="dl"
        sx={{ display: "grid", gridTemplateColumns: "max-content 1fr", alignItems: "baseline", columnGap: 4, rowGap: 2, m: 0 }}
      >
        {rows.map(([label, value]) => (
          <Box key={label} sx={{ display: "contents" }}>
            <Typography variant="secondary" component="dt">
              {label}
            </Typography>
            <Typography variant="body" component="dd" sx={{ m: 0 }}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box>
        <Button
          variant="outlined"
          onClick={() => {
            setSaved(false);
            setEditing(true);
          }}
        >
          Edit
        </Button>
      </Box>
      {children}
    </Stack>
  );
}
