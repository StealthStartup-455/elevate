"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useActionState } from "react";
import { type LoginState, mockLogin } from "../actions";

export type DemoLogin = {
  username: string;
  waiver?: string;
  membership?: string;
  // Shown instead of the waiver and membership columns, for example for staff.
  note?: string;
};

function DemoAccountsHint({ accounts }: { accounts: DemoLogin[] }) {
  return (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Demo accounts
      </Typography>
      <Typography variant="caption" component="p" sx={{ mb: 1 }}>
        Use the username as the password too.
      </Typography>
      <Box component="table" sx={{ borderCollapse: "collapse", fontSize: "0.75rem" }}>
        <thead>
          <tr>
            <Box component="th" sx={{ textAlign: "left", pr: 2, pb: 0.5 }}>
              Username
            </Box>
            <Box component="th" sx={{ textAlign: "left", pr: 2, pb: 0.5 }}>
              Waiver
            </Box>
            <Box component="th" sx={{ textAlign: "left", pb: 0.5 }}>
              Membership
            </Box>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.username}>
              <Box
                component="td"
                sx={{ pr: 2, py: 0.25, fontFamily: "var(--font-geist-mono)", whiteSpace: "nowrap" }}
              >
                {a.username}
              </Box>
              {a.note ? (
                <Box component="td" colSpan={2} sx={{ py: 0.25 }}>
                  {a.note}
                </Box>
              ) : (
                <>
                  <Box component="td" sx={{ pr: 2, py: 0.25 }}>
                    {a.waiver}
                  </Box>
                  <Box component="td" sx={{ py: 0.25 }}>
                    {a.membership}
                  </Box>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </Box>
      <Typography variant="caption" component="p" sx={{ mt: 1 }}>
        Any climber in the mock data also works as <code>first.last</code>.
      </Typography>
    </Box>
  );
}

// Log in fields with "Join the gym" right under them. Static demo login: the
// password is the same as the username (see actions.ts). The "i" next to the
// title lists demo accounts for every waiver and membership state.
export default function LoginForm({ demoAccounts }: { demoAccounts: DemoLogin[] }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    mockLogin,
    {},
  );

  return (
    <Card variant="outlined" sx={{ width: "100%", maxWidth: 420, borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            Log in
          </Typography>
          <Tooltip
            title={<DemoAccountsHint accounts={demoAccounts} />}
            placement="bottom-start"
            enterTouchDelay={0}
            leaveTouchDelay={15000}
            slotProps={{ tooltip: { sx: { maxWidth: "min(440px, calc(100vw - 32px))" } } }}
          >
            <Box
              component="button"
              type="button"
              aria-label="Show demo accounts"
              sx={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: "1.5px solid",
                borderColor: "text.secondary",
                color: "text.secondary",
                background: "none",
                font: "italic 700 0.8rem Georgia, serif",
                lineHeight: 1,
                cursor: "help",
                p: 0,
                "&:hover, &:focus-visible": { borderColor: "primary.main", color: "primary.main" },
              }}
            >
              i
            </Box>
          </Tooltip>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
          Welcome back to Elevate.
        </Typography>

        <Box component="form" action={formAction} noValidate>
          <Stack spacing={2}>
            <TextField
              name="username"
              label="Username"
              required
              fullWidth
              autoComplete="username"
              slotProps={{ htmlInput: { autoCapitalize: "none", spellCheck: false } }}
            />
            <TextField
              name="password"
              label="Password"
              type="password"
              required
              fullWidth
              autoComplete="current-password"
            />
            {state.error ? <Alert severity="error">{state.error}</Alert> : null}
            <Button type="submit" variant="contained" size="large" disabled={pending}>
              {pending ? "Logging in…" : "Log in"}
            </Button>
            <Button component={Link} href="/join" variant="outlined" size="large">
              Join the gym
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
