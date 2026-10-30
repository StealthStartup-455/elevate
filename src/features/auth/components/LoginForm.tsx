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

export type DemoLogin = {
  username: string;
  waiver?: string;
  membership?: string;
  // Shown instead of the waiver and membership columns, for example for staff.
  note?: string;
};

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

function DemoAccountsHint({ accounts }: { accounts: DemoLogin[] }) {
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Demo accounts
      </Typography>
      <Typography variant="caption" component="p" sx={{ mb: 2 }}>
        Type the username in the Email box and use it as the password too.
      </Typography>
      <Box component="table" sx={{ borderCollapse: "collapse", fontSize: "0.75rem" }}>
        <thead>
          <tr>
            <Box component="th" sx={{ textAlign: "left", pr: 4, pb: 1 }}>
              Username
            </Box>
            <Box component="th" sx={{ textAlign: "left", pr: 4, pb: 1 }}>
              Waiver
            </Box>
            <Box component="th" sx={{ textAlign: "left", pb: 1 }}>
              Membership
            </Box>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.username}>
              <Box
                component="td"
                sx={{ pr: 4, py: 0.5, fontFamily: "var(--font-geist-mono)", whiteSpace: "nowrap" }}
              >
                {a.username}
              </Box>
              {a.note ? (
                <Box component="td" colSpan={2} sx={{ py: 0.5 }}>
                  {a.note}
                </Box>
              ) : (
                <>
                  <Box component="td" sx={{ pr: 4, py: 0.5 }}>
                    {a.waiver}
                  </Box>
                  <Box component="td" sx={{ py: 0.5 }}>
                    {a.membership}
                  </Box>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </Box>
      <Typography variant="caption" component="p" sx={{ mt: 2 }}>
        Any climber in the mock data also works as <code>first.last</code>.
      </Typography>
    </Box>
  );
}

// Log in fields with "Join the gym" right under them. The label always says
// Email because this page is built ahead of time, but in demo mode a demo
// username works there too (see actions.ts). The "i" next to the title lists
// a testing guide (what to try as the desk and as a climber) and the demo
// accounts for every waiver and membership state.
export default function LoginForm({ demoAccounts }: { demoAccounts: DemoLogin[] }) {
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
                <DemoAccountsHint accounts={demoAccounts} />
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
