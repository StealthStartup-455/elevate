import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import AppVersion from "@/components/ui/AppVersion";
import Logo from "@/components/ui/Logo";
import NavLink from "@/components/ui/NavLink";
import LogoutButton from "@/features/auth/components/LogoutButton";
import ScanWatcher from "@/features/check-ins/components/ScanWatcher";
import { requireStaff } from "@/features/auth/staff";
import { isPosEnabled } from "@/features/pos/queries";

export default function DeskLayout({ children }: LayoutProps<"/desk">) {
  return (
    <Suspense>
      <StaffOnly>
        <div className="flex flex-1 flex-col">
          <nav className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b p-4">
            <Link href="/desk" aria-label="Elevate home" className="mr-4 flex">
              <Logo />
            </Link>
            <NavLink href="/desk" exact>
              Check-in
            </NavLink>
            <Suspense fallback={null}>
              <PosLink />
            </Suspense>
            <NavLink href="/desk/customers">Customers</NavLink>
            <NavLink href="/desk/waivers">Waivers</NavLink>
            {/* Events is hidden until its page has content (#65). The route
                stays, so work on it can continue: add the link back in the
                same PR that fills the page. */}
            <LogoutButton />
          </nav>
          <main className="p-4 sm:p-6">{children}</main>
          {/* On every desk page, so a scan shows wherever staff are (#127). */}
          <ScanWatcher />
          <AppVersion />
        </div>
      </StaffOnly>
    </Suspense>
  );
}

// Keeps anyone who isn't staff from seeing the desk at all. Not the only
// check: a layout doesn't re-run on navigation, so the desk queries and
// actions check too (features/auth/staff.ts).
async function StaffOnly({ children }: { children: ReactNode }) {
  // Request time only: the Supabase check reads the clock.
  await connection();
  await requireStaff();
  return children;
}

// Only gyms that sell passes in Elevate get the POS (see features/pos).
async function PosLink() {
  return (await isPosEnabled()) ? <NavLink href="/desk/pos">POS</NavLink> : null;
}
