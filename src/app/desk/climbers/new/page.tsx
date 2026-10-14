import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { createClimberAtDesk } from "@/features/climbers/actions";
import ClimberForm from "@/features/climbers/components/ClimberForm";
import LinkButton from "@/features/climbers/components/LinkButton";

export default function NewClimberPage() {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4 sm:gap-6">
      <div className="flex flex-col items-start gap-1">
        <LinkButton href="/desk/climbers" variant="text">
          ← Climbers
        </LinkButton>
        <h1 className="text-2xl font-semibold">New climber</h1>
      </div>
      <Card variant="outlined" sx={{ width: "100%", maxWidth: 560, borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Same form a new customer fills in on /join.
          </Typography>
          <ClimberForm action={createClimberAtDesk} submitLabel="Create account" />
        </CardContent>
      </Card>
    </div>
  );
}
