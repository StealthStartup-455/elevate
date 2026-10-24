// Two real Supabase logins for local testing, made at the end of seed.ts:
// desk@elevate.test (staff) and climber@elevate.test (a member with a valid
// waiver and an active membership). Both use SEED_LOGIN_PASSWORD. The other
// demo states are still there through the demo login.
//
// Skipped when SUPABASE_SECRET_KEY or SEED_LOGIN_PASSWORD isn't set, so the
// seed still works without them (CI, staging).

import { createClient } from "@supabase/supabase-js";
import { db } from "../src/lib/db";

// .test is reserved for testing, so these can never reach a real inbox.
const DESK_EMAIL = "desk@elevate.test";
const CLIMBER_EMAIL = "climber@elevate.test";
// The seeded demo climber it signs in as (their externalId).
const CLIMBER_USERNAME = "demo-valid-active";

export async function seedLogins(gymId: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const password = process.env.SEED_LOGIN_PASSWORD;
  if (!url || !secretKey || !password) {
    console.log("Skipped demo logins: set SUPABASE_SECRET_KEY and SEED_LOGIN_PASSWORD in .env.");
    return;
  }

  // The secret key can create users. Only this script uses it, never the app.
  const supabase = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // The seed only resets our tables, so logins from the last run are still there.
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const existing = new Map(data.users.map((u) => [u.email, u.id]));

  async function loginFor(email: string): Promise<string> {
    const id = existing.get(email);
    if (id) {
      // So changing SEED_LOGIN_PASSWORD and reseeding works.
      const { error } = await supabase.auth.admin.updateUserById(id, { password });
      if (error) throw error;
      return id;
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    return data.user.id;
  }

  const deskId = await loginFor(DESK_EMAIL);
  await db.staff.upsert({
    where: { gymId_authUserId: { gymId, authUserId: deskId } },
    update: {},
    create: { gymId, authUserId: deskId, name: "Front Desk" },
  });

  // Climbers are recreated on every seed, so the link is made again each time.
  const climberId = await loginFor(CLIMBER_EMAIL);
  await db.climber.updateMany({
    where: { gymId, externalId: CLIMBER_USERNAME },
    data: { authUserId: climberId },
  });

  console.log(`Demo logins ready: ${DESK_EMAIL} and ${CLIMBER_EMAIL}.`);
}
