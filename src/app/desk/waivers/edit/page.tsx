import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireStaff } from "@/features/auth/staff";
import { canEditWaiver } from "@/features/waivers/access";
import WaiverEditor from "@/features/waivers/components/WaiverEditor";
import { getStaffWaiverWording } from "@/features/waivers/queries";
import { nextVersion } from "@/features/waivers/wording";

// Write new waiver wording (#110). Managers and owners only; it starts from
// the current version, and publishing adds the next one.
export default function EditWaiverPage() {
  return (
    <div className="mx-auto flex w-full max-w-narrow flex-col gap-3">
      <Typography variant="pageTitle">Edit the waiver</Typography>
      <Suspense fallback={<Typography variant="secondary">Loading waiver…</Typography>}>
        <Editor />
      </Suspense>
    </div>
  );
}

async function Editor() {
  // connection() first: the Supabase check reads the clock.
  await connection();
  await requireStaff();
  if (!(await canEditWaiver())) redirect("/desk/waivers");
  const wording = await getStaffWaiverWording();
  if (!wording) redirect("/desk/waivers");

  return (
    <WaiverEditor
      initial={wording.current ?? { title: "", body: "", clauses: [] }}
      baseVersion={wording.current?.version ?? ""}
      nextVersion={nextVersion(wording.versions.map((v) => v.version))}
    />
  );
}
