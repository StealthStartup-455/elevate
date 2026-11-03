import { redirect } from "next/navigation";

// Buying moved into the Membership tab (#101). Old links and bookmarks land there.
export default function PurchasePage() {
  redirect("/me/membership");
}
