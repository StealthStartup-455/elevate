import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { updateClimber } from "@/features/climbers/actions";
import ClimberForm from "@/features/climbers/components/ClimberForm";
import WaiverBadge from "@/features/climbers/components/WaiverBadge";
import { getClimber } from "@/features/climbers/queries";

export default function ClimberPage({
  params,
}: PageProps<"/desk/climbers/[climberId]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/desk/climbers" className="text-sm underline">
        Back to climbers
      </Link>
      <Suspense fallback={<p>Loading…</p>}>
        <ClimberDetails params={params} />
      </Suspense>
    </div>
  );
}

async function ClimberDetails({
  params,
}: Pick<PageProps<"/desk/climbers/[climberId]">, "params">) {
  const { climberId } = await params;
  const climber = await getClimber(climberId);
  if (!climber) notFound();

  return (
    <>
      <h1 className="text-2xl font-semibold">
        {climber.firstName} {climber.lastName}
      </h1>

      <section className="flex max-w-md flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <WaiverBadge status={climber.waiverStatus} />
          {/* Placeholder until the waivers feature exists. */}
          <button
            type="button"
            disabled
            title="Coming soon"
            className="min-h-11 rounded-md border border-foreground/30 px-4 disabled:opacity-60"
          >
            Look at waiver
          </button>
        </div>
      </section>

      <ClimberForm
        // Remount with fresh defaults if another climber's page reuses this slot.
        key={climber.id}
        action={updateClimber.bind(null, climber.id)}
        defaults={{
          firstName: climber.firstName,
          lastName: climber.lastName,
          phone: climber.phone,
          dateOfBirth: climber.dateOfBirth,
        }}
        submitLabel="Save changes"
      />
    </>
  );
}
