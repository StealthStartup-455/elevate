import Link from "next/link";

const button =
  "rounded-lg px-4 py-3 text-center font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-8">
      <h1 className="text-3xl font-semibold">Elevate</h1>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/me" className={`${button} flex-1 bg-[#24705c] text-white hover:bg-[#1b5948]`}>
          Member dashboard
        </Link>
        <Link href="/desk" className={`${button} flex-1 border border-current hover:bg-black/5 dark:hover:bg-white/10`}>
          Front desk
        </Link>
      </div>
      <Link href="/login" className="underline">Log in</Link>
      <Link href="/join" className="underline">Join the gym</Link>
    </main>
  );
}
