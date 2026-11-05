import { connection } from "next/server";
import { getSessionClimberId } from "@/features/auth/queries";
import { listJoinedGyms } from "../queries";
import GymSwitcher from "./GymSwitcher";

export default async function CurrentGymSwitcher() {
  // The gym list depends on the signed-in customer and Prisma timestamps, so
  // this boundary must wait for the request instead of being prerendered.
  await connection();
  const [activeClimberId, gyms] = await Promise.all([getSessionClimberId(), listJoinedGyms()]);
  if (!activeClimberId || gyms.length < 2) return null;
  return <GymSwitcher gyms={gyms} activeClimberId={activeClimberId} />;
}
