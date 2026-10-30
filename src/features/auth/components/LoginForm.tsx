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
import { type LoginState, login } from "../actions";
import type { TestLoginGroup } from "../demo-logins";

// What to try as each kind of user, for whoever is testing. The steps follow
// the desk POS (/desk/pos) and the climber's Membership tab (/me/membership).
const TEST_GUIDE: { title: string; login: string; steps: string[] }[] = [
  {
    title: "Front desk",
    login: "desk",
    steps: [
      "Check-in: find a climber and check them in.",
      "POS tab: pick a climber, add a pass or membership, press Checkout, then Tender (card or cash).",
      "Under Today's sales, Void a sale to undo it.",
    ],
  },
  {
    title: "Climber who just joined (no waiver, no membership)",
    login: "demo-missing-none",
    steps: [
      "Open the Membership tab, pick a plan and press Pay. It's a demo: nothing is charged.",
      "Your plan turns Active. The waiver can still be signed from the dashboard.",
      "Log in as desk: the purchase is in the POS under Today's sales, as Online.",
    ],
  },
  {
    title: "Climber with an active membership",
    login: "demo-valid-active",
    steps: ["Open the Membership tab: buying is switched off, with a warning saying why."],
  },
];

function TestingGuide() {
  return (
    <Box sx={{ p: 1, pb: 3 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Testing guide
      </Typography>
      {TEST_GUIDE.map((g) => (
        <Box key={g.login} sx={{ mb: 2 }}>
          <Typography variant="caption" component="p" sx={{ fontWeight: 700 }}>
            {g.title}
          </Typography>
          <Typography variant="caption" component="p">
            Log in as <code>{g.login}</code>, password <code>{g.login}</code>
          </Typography>
          <Box component="ol" sx={{ m: 0, pl: 5, fontSize: "0.75rem", listStyle: "decimal" }}>
            {g.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function TestLoginsHint({ groups }: { groups: TestLoginGroup[] }) {
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Test logins
      </Typography>
      <Typography variant="caption" component="p" sx={{ mb: 2 }}>
        Type the username in the Email box. For the demo logins the password is the same as the username.
      </Typography>
      {groups.map((group) => (
        <Box key={group.title} sx={{ mb: 3 }}>
          <Typography variant="caption" component="p" sx={{ fontWeight: 700, mb: 1 }}>
            {group.title}
          </Typography>
          <Box component="table" sx={{ borderCollapse: "collapse", fontSize: "0.75rem" }}>
            <thead>
              <tr>
                <Box component="th" sx={{ textAlign: "left", pr: 3, pb: 0.5 }}>
                  Username
                </Box>
                <Box component="th" sx={{ textAlign: "left", pr: 3, pb: 0.5 }}>
                  Password
                </Box>
                <Box component="th" sx={{ textAlign: "left", pb: 0.5 }}>
                  What it is
                </Box>
              </tr>
            </thead>
            <tbody>
              {group.logins.map((l) => (
                <tr key={l.username}>
                  <Box
                    component="td"
                    sx={{ pr: 3, py: 0.5, fontFamily: "var(--font-geist-mono)", whiteSpace: "nowrap" }}
                  >
                    {l.username}
                  </Box>
                  <Box
                    component="td"
                    sx={{ pr: 3, py: 0.5, fontFamily: "var(--font-geist-mono)", whiteSpace: "nowrap" }}
                  >
                    {l.password}
                  </Box>
                  <Box component="td" sx={{ py: 0.5 }}>
                    {l.note}
                  </Box>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      ))}
      <Typography variant="caption" component="p">
        Any climber in the mock data also works as <code>first.last</code>. The real logins use the{" "}
        <code>SEED_LOGIN_PASSWORD</code> from the .env the seed ran with (see the README).
      </Typography>
    </Box>
  );
}

// Log in fields with "Join the gym" right under them. The label always says
// Email because this page is built ahead of time, but in demo mode a demo
// username works there too (see actions.ts). The "i" next to the title lists
// a testing guide (what to try as the desk and as a climber) and every test
// login by kind of user, with its username and password (demo-logins.ts).
export default function LoginForm({ testLogins }: { testLogins: TestLoginGroup[] }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );

  return (
    <Card variant="outlined" sx={{ width: "100%", maxWidth: 420, borderRadius: 3 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            Log in
          </Typography>
          <Tooltip
            title={
              <>
                <TestingGuide />
                <TestLoginsHint groups={testLogins} />
              </>
            }
            placement="bottom-start"
            enterTouchDelay={0}
            leaveTouchDelay={15000}
            // Long, so it scrolls; the tooltip stays open while the pointer is on it.
            slotProps={{
              tooltip: { sx: { maxWidth: "min(440px, calc(100vw - 32px))", maxHeight: "80vh", overflowY: "auto" } },
            }}
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
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 5 }}>
          Welcome back to Elevate.
        </Typography>

        <Box component="form" action={formAction} noValidate>
          <Stack spacing={4}>
            <TextField
              name="email"
              label="Email"
              type="email"
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
