"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { type ReactNode, useActionState } from "react";
import { formatDate } from "../format";
import type { ClimberInput, FormState, PossibleDuplicate } from "../types";
import LinkButton from "./LinkButton";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: ClimberInput;
  submitLabel: string;
  /** The submit button after a possible-duplicate warning (#129): it adds them anyway. */
  confirmLabel?: string;
  /** Replace the form with the success message once it submits (customer flow). */
  hideOnSuccess?: boolean;
  /** Shown above the form, but not once it has submitted (the join page's "signed in as", #133). */
  notice?: ReactNode;
};

const EMPTY: ClimberInput = {
  firstName: "",
  lastName: "",
  studentId: "",
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
  confirmLabel = "Add anyway",
  hideOnSuccess = false,
  notice,
}: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {
    status: "idle",
  });

  if (hideOnSuccess && state.status === "success") {
    return (
      <Stack spacing={4}>
        <Alert severity="success">{state.message}</Alert>
        {state.climberId ? (
          <LinkButton href="/me/waiver?next=/me">Sign the waiver</LinkButton>
        ) : null}
        {/* Always a way to the account, so nobody is left on the join page (#133). */}
        <LinkButton href="/me" variant="outlined">
          Go to your dashboard
        </LinkButton>
      </Stack>
    );
  }

  const values = state.values ?? defaults;
  const errors = state.errors ?? {};

  return (
    <>
      {notice}
      <Box component="form" action={formAction} noValidate>
        <Stack spacing={4}>
          <Stack spacing={4} direction={{ xs: "column", sm: "row" }}>
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
            name="studentId"
            label="Student ID (optional)"
            fullWidth
            defaultValue={values.studentId}
            error={Boolean(errors.studentId)}
            helperText={errors.studentId ?? "A V and 8 digits, like V00123456. Leave empty for climbers who aren't students. The check-in barcode is made from it."}
            slotProps={{ htmlInput: { autoComplete: "off", autoCapitalize: "characters", maxLength: 12 } }}
          />
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
            slotProps={{
              htmlInput: { autoComplete: "email", inputMode: "email" },
            }}
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
          {state.status === "duplicate" ? (
            <Alert severity="warning">
              <Stack spacing={3}>
                <span>{state.message}</span>
                {state.duplicates?.map((d) => <Duplicate key={d.id} person={d} />)}
              </Stack>
            </Alert>
          ) : null}
          {state.status === "duplicate" && state.confirmKey ? (
            <input type="hidden" name="confirmDuplicate" value={state.confirmKey} />
          ) : null}
          {state.status === "success" && state.message ? (
            <Alert severity="success">{state.message}</Alert>
          ) : null}

          <Button type="submit" variant="contained" size="large" disabled={pending}>
            {pending ? "Saving…" : state.status === "duplicate" ? confirmLabel : submitLabel}
          </Button>
        </Stack>
      </Box>
    </>
  );
}

// One possible match on the desk: enough to tell who it is, and a way to open them.
function Duplicate({ person }: { person: PossibleDuplicate }) {
  const details = [
    person.phone,
    person.dateOfBirth ? `Born ${formatDate(person.dateOfBirth, true)}` : "",
  ].filter(Boolean);
  return (
    <Stack direction="row" spacing={3} sx={{ alignItems: "center", justifyContent: "space-between" }}>
      <Box>
        <Typography variant="body" component="p" sx={{ fontWeight: 600 }}>
          {person.name}
        </Typography>
        <Typography variant="secondary" component="p">
          {details.join(" · ")}
        </Typography>
      </Box>
      <LinkButton href={`/desk/customers/${person.id}`} variant="outlined" size="small">
        Open
      </LinkButton>
    </Stack>
  );
}
