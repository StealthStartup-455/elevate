import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSessionClimberId } from "@/features/auth/queries";
import { joinAsCustomer } from "@/features/climbers/actions";
import ClimberForm from "@/features/climbers/components/ClimberForm";
import { getClimber } from "@/features/climbers/queries";

// Public landing page for a brand new customer (the QR code will point here).
// flex-1 and justify-center keep the whole box in the middle of the screen (#219),
// as on the login page.
export default function JoinPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center p-4 sm:p-6">
      <Card variant="outlined" sx={{ width: "100%", borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            Join
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 5 }}>
            Tell us a bit about yourself to create your account.
          </Typography>
          <ClimberForm
            action={joinAsCustomer}
            submitLabel="Create account"
            hideOnSuccess
            notice={
              <Suspense fallback={null}>
                <AlreadySignedIn />
              </Suspense>
            }
          />
        </CardContent>
      </Card>
    </main>
  );
}

// Someone already signed in, for example after joining and reloading: say who,
// and link to their dashboard, so a blank form doesn't invite a second account
// (#133). The form stays, so a parent can still sign up someone else. Not shown
// once the form has submitted: its success view has the same link.
async function AlreadySignedIn() {
  await connection();
  const climberId = await getSessionClimberId();
  if (!climberId) return null;
  const climber = await getClimber(climberId);
  if (!climber) return null;
  return (
    <Alert severity="info" sx={{ mb: 5 }}>
      You&apos;re signed in as {climber.firstName} {climber.lastName}.{" "}
      <Link href="/me">Go to your dashboard</Link>. Creating another account below signs you in as
      that person instead.
    </Alert>
  );
}
