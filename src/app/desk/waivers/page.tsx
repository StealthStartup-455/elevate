import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { connection } from "next/server";
import { Suspense } from "react";
import LinkArrow from "@/components/ui/LinkArrow";
import StatusPill from "@/components/ui/StatusPill";
import { requireStaff } from "@/features/auth/staff";
import { canEditWaiver } from "@/features/waivers/access";
import { getStaffWaiverWording } from "@/features/waivers/queries";

// The gym's waiver wording (#110): what climbers sign now, and every version
// published before, with how many climbers signed each. Managers and owners
// can publish new wording from here.
export default function WaiversPage({ searchParams }: PageProps<"/desk/waivers">) {
  return (
    <div className="flex flex-col gap-3">
      <Typography variant="pageTitle">Waivers</Typography>
      <Suspense fallback={<Typography variant="secondary">Loading waivers…</Typography>}>
        <Waivers searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Waivers({ searchParams }: Pick<PageProps<"/desk/waivers">, "searchParams">) {
  // connection() first: the Supabase check reads the clock.
  await connection();
  await requireStaff();
  const [{ published }, wording, canEdit] = await Promise.all([
    searchParams,
    getStaffWaiverWording(),
    canEditWaiver(),
  ]);
  if (!wording) return null;
  const { current, versions, timeZone } = wording;
  const day = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeZone }).format(date);
  const currentRow = versions.find((v) => v.current);

  return (
    <>
      {typeof published === "string" && published === current?.version ? (
        <Alert severity="success">
          Published {published}. Climbers sign the new wording the next time they check in.
        </Alert>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-2">
          <Typography variant="cardTitle">Current waiver</Typography>
          {current && currentRow ? (
            <>
              <Typography variant="body">{current.title}</Typography>
              <Typography variant="secondary">
                Version {current.version} · published {day(currentRow.publishedAt)} ·{" "}
                {currentRow.signatures} signed
              </Typography>
            </>
          ) : (
            <Typography variant="body">
              The gym hasn&apos;t published a waiver yet, so climbers can&apos;t sign online.
            </Typography>
          )}
          {canEdit ? (
            <LinkArrow href="/desk/waivers/edit">
              {current ? "Edit the wording" : "Write the waiver"}
            </LinkArrow>
          ) : (
            <Typography variant="secondary">Only a manager or owner can change the wording.</Typography>
          )}
        </CardContent>
      </Card>

      {versions.length ? (
        <Card>
          <CardContent className="flex flex-col gap-2">
            <Typography variant="cardTitle">All versions</Typography>
            <Typography variant="secondary">
              Published wording is never changed, so each signed waiver keeps the exact text it was
              signed on.
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Version</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Published</TableCell>
                  <TableCell align="right">Signed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {versions.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        {v.version}
                        {v.current ? <StatusPill status="ok" label="Current" /> : null}
                      </div>
                    </TableCell>
                    <TableCell>{v.title}</TableCell>
                    <TableCell>{day(v.publishedAt)}</TableCell>
                    <TableCell align="right">{v.signatures}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
