import ClimberForm from "@/features/climbers/components/ClimberForm";
import { joinAsCustomer } from "@/features/climbers/actions";

// Public landing page for a brand new customer (the QR code will point here).
export default function JoinPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Join</h1>
        <p className="text-sm opacity-70">
          Tell us a bit about yourself to create your account.
        </p>
      </div>
      <ClimberForm
        action={joinAsCustomer}
        submitLabel="Create account"
        hideOnSuccess
      />
    </main>
  );
}
