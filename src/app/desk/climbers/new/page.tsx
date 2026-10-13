import Link from "next/link";
import ClimberForm from "@/features/climbers/components/ClimberForm";
import { createClimberAtDesk } from "@/features/climbers/actions";

export default function NewClimberPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/desk/climbers" className="text-sm underline">
          Back to climbers
        </Link>
        <h1 className="text-2xl font-semibold">New climber</h1>
      </div>
      <ClimberForm action={createClimberAtDesk} submitLabel="Create account" />
    </div>
  );
}
