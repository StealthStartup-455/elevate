import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-8">
      <h1 className="text-3xl font-semibold">Elevate</h1>
      <Link href="/login" className="underline">Log in</Link>
      <Link href="/join" className="underline">Join the gym</Link>
    </main>
  );
}
