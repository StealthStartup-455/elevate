import { Suspense } from "react";

export default function ClimberPage({
  params,
}: PageProps<"/desk/climbers/[climberId]">) {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <ClimberHeading params={params} />
    </Suspense>
  );
}

async function ClimberHeading({
  params,
}: Pick<PageProps<"/desk/climbers/[climberId]">, "params">) {
  const { climberId } = await params;
  return <h1 className="text-2xl font-semibold">Climber {climberId}</h1>;
}
