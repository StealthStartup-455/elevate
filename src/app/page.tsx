import Typography from "@mui/material/Typography";
import LoginForm from "@/features/auth/components/LoginForm";
import { getDemoLogins } from "@/features/auth/demo-logins";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="p-4 sm:px-6">
        <Typography variant="pageTitle" component="span">
          Elevate
        </Typography>
      </header>
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <LoginForm demoAccounts={getDemoLogins()} />
      </main>
    </div>
  );
}
