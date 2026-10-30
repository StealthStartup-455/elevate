import Link from "next/link";
import Logo from "@/components/ui/Logo";
import LogoutButton from "@/features/auth/components/LogoutButton";

export default function MeLayout({ children }: LayoutProps<"/me">) {
  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b p-4">
        <Link href="/me" aria-label="Elevate home" className="mr-2 flex">
          <Logo />
        </Link>
        <Link href="/me">Home</Link>
        {/* Events and Stats are hidden until their pages have content (#65).
            The routes stay, so work on them can continue: add the links back
            in the same PR that fills the page. */}
        <LogoutButton />
      </nav>
      <main className="p-4 sm:p-6">{children}</main>
    </div>
  );
}
