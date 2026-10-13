import Link from "next/link";
import { Suspense } from "react";
import WaiverBadge from "@/features/climbers/components/WaiverBadge";
import { listClimbers } from "@/features/climbers/queries";

export default function ClimbersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Climbers</h1>
        <Link
          href="/desk/climbers/new"
          className="inline-flex min-h-11 items-center rounded-md bg-foreground px-4 font-medium text-background"
        >
          Add climber
        </Link>
      </div>
      <Suspense fallback={<p>Loading climbers…</p>}>
        <ClimberList />
      </Suspense>
    </div>
  );
}

async function ClimberList() {
  const climbers = await listClimbers();
  if (climbers.length === 0) return <p>No climbers yet.</p>;

  return (
    <ul className="flex flex-col gap-2">
      {climbers.map((c) => (
        <li key={c.id}>
          <Link
            href={`/desk/climbers/${c.id}`}
            className="flex min-h-11 flex-col gap-1 rounded-md border border-foreground/30 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <span className="font-medium">
              {c.firstName} {c.lastName}
            </span>
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span>{c.phone}</span>
              <span>Born {c.dateOfBirth}</span>
              <WaiverBadge status={c.waiverStatus} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
