import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import AppVersion from "@/components/ui/AppVersion";
import Logo from "@/components/ui/Logo";
import LogoutButton from "@/features/auth/components/LogoutButton";
import { requireStaff } from "@/features/auth/staff";

export default function DeskLayout({ children }: LayoutProps<"/desk">) {
  return (
    <Suspense>
      <StaffOnly>
        <div className="flex flex-1 flex-col">
          <nav className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b p-4">
            <Link href="/desk" aria-label="Elevate home" className="mr-2 flex">
              <Logo />
            </Link>
            <Link href="/desk">Check-in</Link>
            <Link href="/desk/climbers">Climbers</Link>
            {/* Events and Waivers are hidden until their pages have content
                (#65). The routes stay, so work on them can continue: add the
                links back in the same PR that fills the page. */}
            <LogoutButton />
          </nav>
          <main className="p-4 sm:p-6">{children}</main>
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
