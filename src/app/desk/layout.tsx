import Link from "next/link";

export default function DeskLayout({ children }: LayoutProps<"/desk">) {
  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex gap-4 border-b p-4">
        <Link href="/desk">Check-in</Link>
        <Link href="/desk/climbers">Climbers</Link>
        <Link href="/desk/events">Events</Link>
        <Link href="/desk/waivers">Waivers</Link>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
