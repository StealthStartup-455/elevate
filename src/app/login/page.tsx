import Logo from "@/components/ui/Logo";
import LoginForm from "@/features/auth/components/LoginForm";
import { getDemoLogins } from "@/features/auth/demo-logins";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full flex-1 flex-col items-center justify-center gap-6 p-4 sm:p-6">
      <Logo variant="full" size={240} />
      <LoginForm demoAccounts={getDemoLogins()} />
    </main>
  );
}
