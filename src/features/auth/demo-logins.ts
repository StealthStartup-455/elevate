import { DEMO_ACCOUNTS } from "@/features/climbers/demo-accounts";
import { DESK_USERNAME } from "./mock-users";

// The logins listed behind the "i" on the login card, by kind of user, each
// with the username and password to type. Nothing here is a secret: the demo
// logins only work in demo mode (demo-mode.ts), where the password is the
// username. The real Supabase logins are listed by name only; their password
// is whatever SEED_LOGIN_PASSWORD was when the seed ran, so it is never
// written down here.

export type TestLogin = { username: string; password: string; note: string };
export type TestLoginGroup = { title: string; logins: TestLogin[] };

// Seeded climbers who have a story (prisma/seed.ts); their username is
// first.last, like every climber in the mock data.
const NAMED_CLIMBERS: TestLogin[] = [
  { username: "agam.kamran", password: "agam.kamran", note: "Active monthly member, renews in 3 days" },
  { username: "maya.patel", password: "maya.patel", note: "Waiver signed, no membership" },
  { username: "sofia.rossi", password: "sofia.rossi", note: "Waiver signed, membership expired" },
  { username: "ava.thompson", password: "ava.thompson", note: "No waiver, no membership" },
  { username: "ethan.brooks", password: "ethan.brooks", note: "Waiver and membership both expired" },
  { username: "chloe.nguyen", password: "chloe.nguyen", note: "Membership paused" },
];

export function getTestLogins(): TestLoginGroup[] {
  return [
    {
      title: "Front desk (staff)",
      logins: [
        {
          username: DESK_USERNAME,
          password: DESK_USERNAME,
          note: "Check-in, POS, climbers, waivers",
        },
      ],
    },
    {
      title: "Climbers by waiver and membership",
      logins: DEMO_ACCOUNTS.map((d) => ({
        username: d.username,
        password: d.username,
        note: `Waiver ${d.waiverStatus}, membership ${d.membershipStatus}`,
      })),
    },
    { title: "Climbers by name", logins: NAMED_CLIMBERS },
    {
      title: "Real logins (only where the seed made them)",
      logins: [
        { username: "desk@elevate.test", password: "SEED_LOGIN_PASSWORD", note: "Front desk (staff)" },
        { username: "climber@elevate.test", password: "SEED_LOGIN_PASSWORD", note: "A member" },
      ],
    },
  ];
}
