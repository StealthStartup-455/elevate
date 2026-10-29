import { cache } from "react";
import { db } from "./db";

// Until auth knows which gym a user belongs to, every page uses this one.
// It is created by prisma/seed.ts.
export const DEFAULT_GYM_SLUG = "demo-gym";

export const getGym = cache(async () => {
  const gym = await db.gym.findUnique({ where: { slug: DEFAULT_GYM_SLUG } });
  if (!gym) {
    throw new Error(
      `Gym "${DEFAULT_GYM_SLUG}" not found. Run \`npm run db:migrate\` and \`npm run db:seed\`.`,
    );
  }
  return gym;
});
