import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import LinkArrow from "@/components/ui/LinkArrow";
import { getGym } from "@/lib/gym";
import { getSignedWaiver } from "@/features/waivers/queries";

const RELATION = { SELF: "themselves", PARENT: "parent", GUARDIAN: "legal guardian" } as const;

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
  const [waiver, gym] = await Promise.all([getSignedWaiver(waiverId), getGym()]);
  if (!waiver) notFound();

  const signedAt = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: gym.timeZone,
  }).format(waiver.signedAt);

  return (
    <>
      {!waiver.wordingIntact ? (
        <Alert severity="error">
          The stored wording no longer matches what was signed. Contact the gym.
        </Alert>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-2">
          <Typography variant="cardTitle">Signature</Typography>
          <Typography variant="body">
            Signed for {waiver.climberName} by {waiver.signedByName}
            {waiver.signerRelation === "SELF" ? "" : ` (${RELATION[waiver.signerRelation]})`}
          </Typography>
          {waiver.signatureText ? (
            <Typography variant="body" sx={{ fontStyle: "italic" }}>
              Typed signature: {waiver.signatureText}
            </Typography>
          ) : null}
          {waiver.signatureImage ? (
            // A data URL saved when they signed; next/image adds nothing here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={waiver.signatureImage}
              alt={`Drawn signature of ${waiver.signedByName}`}
              className="h-20 w-auto self-start"
            />
          ) : null}
          <Typography variant="secondary">
            {signedAt} · version {waiver.version}
          </Typography>
          {waiver.emergencyContact ? (
            <Typography variant="body">
              Emergency contact: {waiver.emergencyContact.name}, {waiver.emergencyContact.phone}
            </Typography>
          ) : null}
        </CardContent>
      </Card>

      {waiver.template ? (
        <Card>
          <CardContent className="flex flex-col gap-2">
            <Typography variant="cardTitle">{waiver.template.title}</Typography>
            {waiver.template.paragraphs.map((paragraph, i) => (
              <Typography key={i} variant="body">
                {paragraph}
              </Typography>
            ))}
            <Typography variant="cardTitle" sx={{ mt: 2 }}>
              Rules agreed to
            </Typography>
            <ul className="flex list-none flex-col gap-1 pl-0">
              {waiver.template.clauses.map((clause, i) => (
                <li key={i}>
                  <Typography variant="body">
                    <span aria-hidden="true">✓ </span>
                    {clause}
                  </Typography>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Typography variant="body">
              This waiver was signed before online waivers, so its wording isn&apos;t stored in
              Elevate. Ask the gym for a copy.
            </Typography>
          </CardContent>
        </Card>
      )}
    </>
  );
}
