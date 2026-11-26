import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import { createClimberAtDesk } from "@/features/climbers/actions";
import ClimberForm from "@/features/climbers/components/ClimberForm";
import LinkButton from "@/features/climbers/components/LinkButton";

// "← Check-in" when staff came from the Check-in tab's New customer button
// (?from=check-in), else "← Customers".
async function BackLink({ searchParams }: Pick<PageProps<"/desk/customers/new">, "searchParams">) {
  const { from } = await searchParams;
  return from === "check-in" ? (
    <LinkButton href="/desk" variant="text">
      ← Check-in
    </LinkButton>
  ) : (
    <CustomersLink />
  );
}

function CustomersLink() {
  return (
    <LinkButton href="/desk/customers" variant="text">
      ← Customers
    </LinkButton>
  );
}

export default function NewClimberPage({ searchParams }: PageProps<"/desk/customers/new">) {
  return (
    <div className="mx-auto flex w-full max-w-narrow flex-col gap-4 sm:gap-6">
      <div className="flex flex-col items-start gap-1">
        <Suspense fallback={<CustomersLink />}>
          <BackLink searchParams={searchParams} />
        </Suspense>
        <Typography variant="pageTitle">New customer</Typography>
      </div>
      <Card variant="outlined" sx={{ width: "100%", maxWidth: 560, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 5 }}>
            Same form a new customer fills in on /join.
          </Typography>
          <ClimberForm action={createClimberAtDesk} submitLabel="Create account" />
        </CardContent>
      </Card>
    </div>
  );
}
