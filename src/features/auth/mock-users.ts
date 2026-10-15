// Static stand-in for real accounts until auth exists: every climber in the
// database can "log in" with their username as both username and password.
// Nothing here is a secret, and none of it works in a production build.
import { DEMO_USERNAME_PREFIX } from "@/features/climbers/demo-accounts";
import { db } from "@/lib/db";
import { getGym } from "@/lib/gym";

// Staff demo login for the front desk.
export const DESK_USERNAME = "desk";

type NamedClimber = { firstName: string; lastName: string };

// "jordan.roy": first and last name, lowercase, no spaces.
function nameUsername(climber: NamedClimber): string {
  return `${climber.firstName}.${climber.lastName}`.toLowerCase().replace(/\s+/g, "");
}

// The username a climber logs in with (their password is the same). Demo
// accounts keep theirs in externalId.
export function usernameFor(
  climber: NamedClimber & { externalId: string | null },
): string {
  return climber.externalId?.startsWith(DEMO_USERNAME_PREFIX)
    ? climber.externalId
    : nameUsername(climber);
}

// The climber's id for a username, or undefined if there is no such account.
// Demo accounts and every climber in the gym match, including new sign ups.
export async function findClimberIdByUsername(
  username: string,
): Promise<string | undefined> {
  const wanted = username.trim().toLowerCase();
  const gym = await getGym();
  const climbers = await db.climber.findMany({
    where: { gymId: gym.id },
    select: { id: true, firstName: true, lastName: true, externalId: true },
  });
  return climbers.find((c) => usernameFor(c) === wanted)?.id;
}
