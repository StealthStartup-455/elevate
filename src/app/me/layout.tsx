import Link from "next/link";

export default function MeLayout({ children }: LayoutProps<"/me">) {
  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex gap-4 border-b p-4">
        <Link href="/me">Home</Link>
        <Link href="/me/events">Events</Link>
        <Link href="/me/stats">Stats</Link>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
