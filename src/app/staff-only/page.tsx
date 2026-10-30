import Typography from "@mui/material/Typography";
import LinkArrow from "@/components/ui/LinkArrow";
import LogoutButton from "@/features/auth/components/LogoutButton";

// Where a signed-in climber lands if they open the front desk (#87). The desk
// is staff only (features/auth/staff.ts); sending them to log in instead looked
// like they had been logged out.
export default function StaffOnlyPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 p-4 sm:p-6">
      <Typography variant="pageTitle" component="h1">
        This page is for gym staff
      </Typography>
      <Typography variant="body">
        You&apos;re signed in as a climber, so the front desk isn&apos;t available. Your
        membership, waiver and check-in code are on your dashboard.
      </Typography>
      <div className="flex flex-wrap items-center gap-4">
        <LinkArrow href="/me">Go to your dashboard</LinkArrow>
        <LogoutButton />
      </div>
      <Typography variant="secondary">
        Work at the gym? Log out, then log in with your staff account.
      </Typography>
    </main>
  );
}
