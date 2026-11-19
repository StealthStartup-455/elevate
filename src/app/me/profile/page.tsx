import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { completeCustomerProfile } from "@/features/auth/actions";
import ClimberForm from "@/features/climbers/components/ClimberForm";

export default function CustomerProfilePage() {
  return (
    <>
      <Typography variant="pageTitle">Complete your profile</Typography>
      <Card>
        <CardContent className="flex flex-col gap-3">
          <Typography variant="body">
            Add your details before joining a gym. You only need to do this once.
          </Typography>
          <ClimberForm action={completeCustomerProfile} submitLabel="Save profile" />
        </CardContent>
      </Card>
    </>
  );
}
