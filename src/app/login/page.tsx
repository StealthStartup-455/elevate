import LoginForm from "@/features/auth/components/LoginForm";
import { getDemoLogins } from "@/features/auth/demo-logins";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full flex-1 items-center justify-center p-4 sm:p-6">
      <LoginForm demoAccounts={getDemoLogins()} />
    </main>
  );
}
