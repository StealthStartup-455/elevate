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
import { type SignupState } from "@/features/auth/actions";
import { signUpGym } from "../actions";

export default function GymSignupForm() {
  const [state, formAction, pending] = useActionState<SignupState, FormData>(signUpGym, {});

  return (
    <Card variant="outlined" sx={{ width: "100%", maxWidth: 560, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="pageTitle">Create your gym</Typography>
        <Typography variant="secondary" sx={{ mt: 1, mb: 4 }}>
          Set up your Elevate gym and invite your customers to join it.
        </Typography>
        <Box component="form" action={formAction} noValidate>
          <Stack spacing={3}>
            <TextField name="gymName" label="Gym name" required fullWidth autoComplete="organization" />
            <TextField name="ownerName" label="Your name" required fullWidth autoComplete="name" />
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
              {pending ? "Creating gym…" : "Create gym"}
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
