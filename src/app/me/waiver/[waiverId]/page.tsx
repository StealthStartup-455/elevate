import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import LinkArrow from "@/components/ui/LinkArrow";
import { getGym } from "@/lib/gym";
import SignedWaiverDetails from "@/features/waivers/components/SignedWaiverDetails";
import { getSignedWaiver } from "@/features/waivers/queries";

export default function SignedWaiverPage({ params }: PageProps<"/me/waiver/[waiverId]">) {
  return (
    <div className="mx-auto flex w-full max-w-narrow flex-col gap-3">
      <Typography variant="pageTitle">Your signed waiver</Typography>
      <Suspense fallback={<Typography variant="secondary">Loading waiver…</Typography>}>
        <SignedWaiver params={params} />
      </Suspense>
      <LinkArrow href="/me">Back to my dashboard</LinkArrow>
    </div>
  );
}

// The exact wording they agreed to and the signature record. Only the climber,
// a parent's login that manages them, or staff can open it (getSignedWaiver).
async function SignedWaiver({ params }: Pick<PageProps<"/me/waiver/[waiverId]">, "params">) {
  const { waiverId } = await params;
  // getSignedWaiver first: it calls connection(), and getGym() reads the clock.
  const waiver = await getSignedWaiver(waiverId);
  if (!waiver) notFound();
  const gym = await getGym();
  return (
    <>
      <div className="flex flex-col items-start">
        <Button variant="outlined" href={`/me/waiver/${waiver.id}/pdf`} download>
          Download PDF
        </Button>
      </div>
      <SignedWaiverDetails waiver={waiver} timeZone={gym.timeZone} />
    </>
  );
}
