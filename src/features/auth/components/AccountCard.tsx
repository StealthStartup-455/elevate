import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ClimberCard from "@/components/climber/ClimberCard";
import { getMyMembership } from "@/features/climbers/queries";
import { logout } from "../actions";

// Bottom of the climber's Membership tab: who is signed in, and logging out.
export default async function AccountCard() {
  const { firstName, lastName } = await getMyMembership();
  return (
    <ClimberCard label="Account">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <Typography variant="secondary">Signed in as</Typography>
          <Typography variant="body" sx={{ fontWeight: 700 }}>
            {firstName} {lastName}
          </Typography>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outlined">
            Log out
          </Button>
        </form>
      </div>
    </ClimberCard>
  );
}
