import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import LinkButton from "@/features/climbers/components/LinkButton";
import { getStaffContext, requireStaff } from "@/features/auth/staff";
import SignedWaiverDetails from "@/features/waivers/components/SignedWaiverDetails";
import { getSignedWaiverForStaff } from "@/features/waivers/queries";
import { getGymById } from "@/lib/gym";

// A climber's signed waiver, for front desk staff (#147). /me/waiver/[id] is
// the climber's own page; this one only opens waivers from the staff member's gym.
export default function DeskWaiverPage({ params }: PageProps<"/desk/waivers/[waiverId]">) {
  return (
    <div className="mx-auto flex w-full max-w-narrow flex-col gap-3">
      <Typography variant="pageTitle">Signed waiver</Typography>
      <Suspense fallback={<Typography variant="secondary">Loading waiver…</Typography>}>
        <DeskWaiver params={params} />
      </Suspense>
    </div>
  );
}

async function DeskWaiver({ params }: Pick<PageProps<"/desk/waivers/[waiverId]">, "params">) {
  const { waiverId } = await params;
  // connection() first: the Supabase check reads the clock.
  await connection();
  await requireStaff();
  const staff = await getStaffContext();
  const [waiver, gym] = await Promise.all([
    getSignedWaiverForStaff(waiverId),
    staff ? getGymById(staff.gymId) : null,
  ]);
  if (!waiver || !gym) notFound();

  return (
    <>
      <div className="flex flex-col items-start">
        <LinkButton href={`/desk/climbers/${waiver.climberId}`} variant="text">
          ← {waiver.climberName}
        </LinkButton>
      </div>
      <SignedWaiverDetails waiver={waiver} timeZone={gym.timeZone} />
    </>
  );
}
