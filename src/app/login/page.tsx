import { connection } from "next/server";
import { Suspense } from "react";
import Logo from "@/components/ui/Logo";
import LoginForm, { TestLoginsInfo } from "@/features/auth/components/LoginForm";
import { getLoginPageTestLogins } from "@/features/auth/demo-logins";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full flex-1 flex-col items-center justify-center gap-6 p-4 sm:p-6">
      <Logo variant="full" size={240} />
      <LoginForm
        info={
          <Suspense fallback={null}>
            <DemoLoginsInfo />
          </Suspense>
        }
      />
    </main>
  );
}

// At request time, not build time: whether this is a demo deployment (and so
// whether to list the test logins, #137) comes from the server's settings.
// Only the (i) waits for it; the form itself is built ahead of time.
async function DemoLoginsInfo() {
  await connection();
  return <TestLoginsInfo testLogins={getLoginPageTestLogins()} />;
}
