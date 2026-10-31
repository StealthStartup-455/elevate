import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import type { SignedWaiverView } from "../queries";

const RELATION = { SELF: "themselves", PARENT: "parent", GUARDIAN: "legal guardian" } as const;

// The exact wording a climber agreed to and the signature record. Shared by the
// climber's own page (/me/waiver/[id]) and the desk's (/desk/waivers/[id], #147),
// which each check who may open it before they get here.
export default function SignedWaiverDetails({
  waiver,
  timeZone,
}: {
  waiver: SignedWaiverView;
  timeZone: string;
}) {
  const signedAt = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone,
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
