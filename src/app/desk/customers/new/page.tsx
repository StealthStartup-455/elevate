import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { createClimberAtDesk } from "@/features/climbers/actions";
import ClimberForm from "@/features/climbers/components/ClimberForm";
import CustomersBackLink from "@/features/climbers/components/CustomersBackLink";

export default function NewClimberPage({ searchParams }: PageProps<"/desk/customers/new">) {
  return (
    <div className="mx-auto flex w-full max-w-narrow flex-col gap-4 sm:gap-6">
      <div className="flex flex-col items-start gap-1">
        <CustomersBackLink searchParams={searchParams} />
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
