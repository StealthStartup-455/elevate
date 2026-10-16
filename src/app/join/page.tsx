import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { joinAsCustomer } from "@/features/climbers/actions";
import ClimberForm from "@/features/climbers/components/ClimberForm";

// Public landing page for a brand new customer (the QR code will point here).
export default function JoinPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col p-4 sm:p-6">
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
          />
        </CardContent>
      </Card>
    </main>
  );
}
