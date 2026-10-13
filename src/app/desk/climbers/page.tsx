import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import ClimberTable from "@/features/climbers/components/ClimberTable";
import LinkButton from "@/features/climbers/components/LinkButton";
import { listClimbers } from "@/features/climbers/queries";

export default function ClimbersPage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <h1 className="text-2xl font-semibold">Climbers</h1>
        <LinkButton href="/desk/climbers/new">Add climber</LinkButton>
      </Box>
      <Suspense fallback={<p>Loading climbers...</p>}>
        <ClimberList />
      </Suspense>
    </div>
  );
}

async function ClimberList() {
  const climbers = await listClimbers();

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
          All climbers
        </Typography>
        <ClimberTable
          rows={climbers.map((c) => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            phone: c.phone,
            dateOfBirth: c.dateOfBirth,
            waiverStatus: c.waiverStatus,
          }))}
        />
      </CardContent>
    </Card>
  );
}
