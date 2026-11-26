"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useActionState } from "react";
import { signUpCustomer, type SignupState } from "../actions";
import DisabledReason from "@/components/ui/DisabledReason";

export default function SignupForm() {
  const [state, formAction, pending] = useActionState<SignupState, FormData>(signUpCustomer, {});
  const errors = state.errors ?? {};
  const values = state.values ?? {};
  const submitButton = (
    <Button type="submit" variant="contained" size="large" disabled={pending}>
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );

  return (
    <Card variant="outlined" sx={{ width: "100%", maxWidth: 420, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="pageTitle">Sign up</Typography>
        <Typography variant="secondary" sx={{ mt: 1, mb: 4 }}>
          Create your Elevate account, then find the gyms you want to join.
        </Typography>
        <Box component="form" action={formAction} noValidate key={JSON.stringify(values)}>
          <Stack spacing={3}>
            <Stack spacing={3} direction={{ xs: "column", sm: "row" }}>
              <TextField
                name="firstName"
                label="First name"
                required
                fullWidth
                autoComplete="given-name"
                defaultValue={values.firstName}
                error={Boolean(errors.firstName)}
                helperText={errors.firstName}
              />
              <TextField
                name="lastName"
                label="Last name"
                required
                fullWidth
                autoComplete="family-name"
                defaultValue={values.lastName}
                error={Boolean(errors.lastName)}
                helperText={errors.lastName}
              />
            </Stack>
            <TextField
              name="studentId"
              label="Student ID (optional)"
              fullWidth
              defaultValue={values.studentId}
              error={Boolean(errors.studentId)}
              helperText={errors.studentId ?? "A V and 8 digits. Leave empty if you aren't a student. The check-in barcode is made from it."}
              slotProps={{ htmlInput: { autoCapitalize: "characters", spellCheck: false } }}
            />
            <TextField
              name="phone"
              label="Phone number"
              type="tel"
              required
              fullWidth
              autoComplete="tel"
              defaultValue={values.phone}
              error={Boolean(errors.phone)}
              helperText={errors.phone}
              slotProps={{ htmlInput: { inputMode: "tel" } }}
            />
            <TextField
              name="email"
              label="Email"
              type="email"
              required
              fullWidth
              autoComplete="email"
              defaultValue={values.email}
              error={Boolean(errors.email)}
              helperText={errors.email}
              slotProps={{ htmlInput: { autoCapitalize: "none", spellCheck: false } }}
            />
            <TextField
              name="dateOfBirth"
              label="Date of birth"
              type="date"
              required
              fullWidth
              autoComplete="bday"
              defaultValue={values.dateOfBirth}
              error={Boolean(errors.dateOfBirth)}
              helperText={errors.dateOfBirth}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              name="password"
              label="Password"
              type="password"
              required
              fullWidth
              autoComplete="new-password"
              error={Boolean(errors.password)}
              helperText={errors.password}
            />
            {state.error ? <Alert severity="error">{state.error}</Alert> : null}
            {state.success ? <Alert severity="success">{state.success}</Alert> : null}
            {pending ? <DisabledReason reason="Creating your account.">{submitButton}</DisabledReason> : submitButton}
            <Button component={Link} href="/login" variant="outlined" size="large">
              Log in instead
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
