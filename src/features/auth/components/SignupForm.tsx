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

export default function SignupForm() {
  const [state, formAction, pending] = useActionState<SignupState, FormData>(signUpCustomer, {});

  return (
    <Card variant="outlined" sx={{ width: "100%", maxWidth: 420, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="pageTitle">Sign up</Typography>
        <Typography variant="secondary" sx={{ mt: 1, mb: 4 }}>
          Create your Elevate account, then find the gyms you want to join.
        </Typography>
        <Box component="form" action={formAction} noValidate>
          <Stack spacing={3}>
            <Stack spacing={3} direction={{ xs: "column", sm: "row" }}>
              <TextField
                name="firstName"
                label="First name"
                required
                fullWidth
                autoComplete="given-name"
              />
              <TextField
                name="lastName"
                label="Last name"
                required
                fullWidth
                autoComplete="family-name"
              />
            </Stack>
            <TextField
              name="phone"
              label="Phone number"
              type="tel"
              required
              fullWidth
              autoComplete="tel"
              slotProps={{ htmlInput: { inputMode: "tel" } }}
            />
            <TextField
              name="email"
              label="Email"
              type="email"
              required
              fullWidth
              autoComplete="email"
              slotProps={{ htmlInput: { autoCapitalize: "none", spellCheck: false } }}
            />
            <TextField
              name="dateOfBirth"
              label="Date of birth"
              type="date"
              required
              fullWidth
              autoComplete="bday"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              name="password"
              label="Password"
              type="password"
              required
              fullWidth
              autoComplete="new-password"
            />
            {state.error ? <Alert severity="error">{state.error}</Alert> : null}
            {state.success ? <Alert severity="success">{state.success}</Alert> : null}
            <Button type="submit" variant="contained" size="large" disabled={pending}>
              {pending ? "Creating account…" : "Create account"}
            </Button>
            <Button component={Link} href="/login" variant="outlined" size="large">
              Log in instead
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
