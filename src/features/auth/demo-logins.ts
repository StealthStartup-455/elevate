import { DEMO_ACCOUNTS } from "@/features/climbers/demo-accounts";
import { DESK_USERNAME } from "./mock-users";
import type { DemoLogin } from "./components/LoginForm";

// The list shown behind the "i" on the login card.
export function getDemoLogins(): DemoLogin[] {
  return [
    ...DEMO_ACCOUNTS.map((d) => ({
      username: d.username,
      waiver: d.waiverStatus,
      membership: d.membershipStatus,
    })),
    { username: DESK_USERNAME, note: "Front desk (staff)" },
  ];
}
