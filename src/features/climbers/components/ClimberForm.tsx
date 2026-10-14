"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useActionState } from "react";
import type { ClimberInput, FormState } from "../types";
import WaiverStep from "./WaiverStep";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: ClimberInput;
  submitLabel: string;
  /** Replace the form with the success message once it submits (customer flow). */
  hideOnSuccess?: boolean;
};

const EMPTY: ClimberInput = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
};

// The same fields on /join and in the front desk. Follows the MUI theme, so it
// matches the busyness and membership cards.
export default function ClimberForm({
  action,
  defaults = EMPTY,
  submitLabel,
  hideOnSuccess = false,
}: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    { status: "idle" },
  );

  if (hideOnSuccess && state.status === "success") {
    return (
      <Stack spacing={2}>
        <Alert severity="success">{state.message}</Alert>
        {state.climberId ? (
          <WaiverStep climberId={state.climberId} nextHref="/me" />
        ) : null}
      </Stack>
    );
  }

  const values = state.values ?? defaults;
  const errors = state.errors ?? {};

  return (
    <Box component="form" action={formAction} noValidate>
      <Stack spacing={2}>
        <Stack spacing={2} direction={{ xs: "column", sm: "row" }}>
          <TextField
            name="firstName"
            label="First name"
            required
            fullWidth
            defaultValue={values.firstName}
            error={Boolean(errors.firstName)}
            helperText={errors.firstName}
            slotProps={{ htmlInput: { autoComplete: "given-name" } }}
          />
          <TextField
            name="lastName"
            label="Last name"
            required
            fullWidth
            defaultValue={values.lastName}
            error={Boolean(errors.lastName)}
            helperText={errors.lastName}
            slotProps={{ htmlInput: { autoComplete: "family-name" } }}
          />
        </Stack>
        <TextField
          name="phone"
          label="Phone number"
          type="tel"
          required
          fullWidth
          defaultValue={values.phone}
          error={Boolean(errors.phone)}
          helperText={errors.phone}
          slotProps={{ htmlInput: { autoComplete: "tel", inputMode: "tel" } }}
        />
        <TextField
          name="email"
          label="Email (optional)"
          type="email"
          fullWidth
          defaultValue={values.email}
          error={Boolean(errors.email)}
          helperText={errors.email}
          slotProps={{ htmlInput: { autoComplete: "email", inputMode: "email" } }}
        />
        <TextField
          name="dateOfBirth"
          label="Date of birth"
          type="date"
          required
          fullWidth
          defaultValue={values.dateOfBirth}
          error={Boolean(errors.dateOfBirth)}
          helperText={errors.dateOfBirth}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { autoComplete: "bday" },
          }}
        />

        {state.status === "error" && state.message ? (
          <Alert severity="error">{state.message}</Alert>
        ) : null}
        {state.status === "success" && state.message ? (
          <Alert severity="success">{state.message}</Alert>
        ) : null}

        <Button type="submit" variant="contained" size="large" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </Stack>
    </Box>
  );
}
