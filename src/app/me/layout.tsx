import Link from "next/link";
import { Suspense } from "react";
import Logo from "@/components/ui/Logo";
import LogoutButton from "@/features/auth/components/LogoutButton";
import { isOnlinePurchaseEnabled } from "@/features/membership/queries";

export default function MeLayout({ children }: LayoutProps<"/me">) {
  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b p-4">
        <Link href="/me" aria-label="Elevate home" className="mr-2 flex">
          <Logo />
        </Link>
        <Link href="/me">Home</Link>
        <Link href="/me/events">Events</Link>
        <Link href="/me/stats">Stats</Link>
        <Suspense fallback={null}>
          <MembershipLink />
        </Suspense>
        <LogoutButton />
      </nav>
      <main className="p-4 sm:p-6">{children}</main>
    </div>
  );
}

// Only gyms that sell passes in Elevate get the Membership tab (see features/membership).
async function MembershipLink() {
  return (await isOnlinePurchaseEnabled()) ? <Link href="/me/membership">Membership</Link> : null;
}
