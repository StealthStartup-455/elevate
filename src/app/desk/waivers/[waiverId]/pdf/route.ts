import type { NextRequest } from "next/server";
import { getStaffContext } from "@/features/auth/staff";
import { waiverPdfResponse } from "@/features/waivers/pdf";
import { getSignedWaiverForStaff } from "@/features/waivers/queries";
import { getGymById } from "@/lib/gym";
import { logEvent } from "@/lib/log";

// Download a signed waiver as a PDF from the desk (#111). Staff only, and only
// a waiver from the staff member's own gym (getSignedWaiverForStaff).
export async function GET(_request: NextRequest, ctx: RouteContext<"/desk/waivers/[waiverId]/pdf">) {
  const { waiverId } = await ctx.params;
  const waiver = await getSignedWaiverForStaff(waiverId);
  const staff = await getStaffContext();
  const gym = staff ? await getGymById(staff.gymId) : null;
  if (!waiver || !gym) return new Response("Not found", { status: 404 });

  logEvent("waiver_pdf_downloaded", { waiverId, climberId: waiver.climberId, source: "desk" });
  return waiverPdfResponse(waiver, gym);
}
