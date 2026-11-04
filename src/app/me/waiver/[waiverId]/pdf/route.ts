import type { NextRequest } from "next/server";
import { waiverPdfResponse } from "@/features/waivers/pdf";
import { getSignedWaiver } from "@/features/waivers/queries";
import { getGym } from "@/lib/gym";
import { logEvent } from "@/lib/log";

// Download your own signed waiver as a PDF (#111). Only the climber, a parent's
// login that manages them, or staff (getSignedWaiver); anyone else gets a 404.
export async function GET(_request: NextRequest, ctx: RouteContext<"/me/waiver/[waiverId]/pdf">) {
  const { waiverId } = await ctx.params;
  const waiver = await getSignedWaiver(waiverId);
  if (!waiver) return new Response("Not found", { status: 404 });
  const gym = await getGym();

  logEvent("waiver_pdf_downloaded", { waiverId, climberId: waiver.climberId, source: "self" });
  return waiverPdfResponse(waiver, gym);
}
