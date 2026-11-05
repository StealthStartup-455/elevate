import { redirect } from "next/navigation";

// Keep old QR codes and bookmarks working while customer registration moves
// from a single gym to an Elevate account plus a gym choice.
export default function JoinPage() {
  redirect("/signup");
}
