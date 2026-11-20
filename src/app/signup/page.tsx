import SignupForm from "@/features/auth/components/SignupForm";
import Logo from "@/components/ui/Logo";

export default function SignupPage() {
  return (
    <main className="mx-auto flex w-full flex-1 flex-col items-center justify-center gap-6 p-4 sm:p-6">
      <Logo variant="full" size={240} />
      <SignupForm />
    </main>
  );
}
