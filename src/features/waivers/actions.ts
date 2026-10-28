"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getCurrentUser } from "@/features/auth/queries";
import { db } from "@/lib/db";
import { getGym } from "@/lib/gym";
import { logEvent } from "@/lib/log";
import { canActForClimber } from "./access";
import { hashWaiver } from "./hash";
import { parseWaiverSignature, type WaiverFieldErrors } from "./validate";

// Server actions are public POST endpoints, so signWaiver checks the caller
// itself, and reads the climber and the wording from the database rather than
// trusting anything the browser sends except what the person typed or ticked.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_USER_AGENT_LENGTH = 500;

export type WaiverFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: WaiverFieldErrors;
  /** Echoed back after an error so the form keeps what was typed and ticked. */
  values?: WaiverFormValues;
  /** Set once signed, for the "View your waiver" link. */
  waiverId?: string;
};

export type WaiverFormValues = {
  clauses: string[];
  guardianName: string;
  signerRelation: string;
  signatureText: string;
  agree: boolean;
};

function valuesOf(formData: FormData): WaiverFormValues {
  const text = (name: string) => String(formData.get(name) ?? "");
  return {
    clauses: formData.getAll("clause").map(String),
    guardianName: text("guardianName"),
    signerRelation: text("signerRelation"),
    signatureText: text("signatureText"),
    agree: formData.get("agree") === "on",
  };
}

// The first address in x-forwarded-for is the browser's; the rest are proxies.
function clientIp(list: Headers): string | null {
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || list.get("x-real-ip") || null;
}

export async function signWaiver(
  _prev: WaiverFormState,
  formData: FormData,
): Promise<WaiverFormState> {
  const climberId = String(formData.get("climberId") ?? "");
  if (!UUID.test(climberId)) return { status: "error", message: "Climber not found." };
  if (!(await canActForClimber(climberId))) {
    return { status: "error", message: "Log in to sign the waiver." };
  }

  const gym = await getGym();
  const [climber, template] = await Promise.all([
    db.climber.findFirst({
      where: { id: climberId, gymId: gym.id },
      select: { firstName: true, lastName: true, dateOfBirth: true },
    }),
    gym.waiverVersion
      ? db.waiverTemplate.findUnique({
          where: { gymId_version: { gymId: gym.id, version: gym.waiverVersion } },
        })
      : null,
  ]);
  if (!climber) return { status: "error", message: "Climber not found." };
  if (!template) {
    return { status: "error", message: "The gym hasn't set up its waiver yet. Ask at the desk." };
  }
  // The gym published new wording while they were reading: they must read it.
  if (formData.get("templateVersion") !== template.version) {
    return {
      status: "error",
      message: "The gym has updated its waiver. Reload the page and read the new one.",
    };
  }
  // The stored text must still be the text that was published.
  const bodyHash = hashWaiver(template);
  if (bodyHash !== template.bodyHash) {
    logEvent("waiver_template_hash_mismatch", { gymId: gym.id, version: template.version });
    return { status: "error", message: "The waiver couldn't be loaded. Ask at the desk." };
  }

  const parsed = parseWaiverSignature(
    formData,
    {
      fullName: `${climber.firstName} ${climber.lastName}`,
      dateOfBirth: climber.dateOfBirth.toISOString().slice(0, 10),
    },
    template.clauses.length,
  );
  if (!parsed.ok) {
    logEvent("waiver_form_invalid", {
      gymId: gym.id,
      fields: Object.keys(parsed.errors).sort().join(","),
    });
    return {
      status: "error",
      message: "Check the highlighted fields.",
      errors: parsed.errors,
      values: valuesOf(formData),
    };
  }

  const list = await headers();
  const waiver = await db.waiver.create({
    data: {
      gymId: gym.id,
      climberId,
      version: template.version,
      templateId: template.id,
      bodyHash,
      ...parsed.value,
      signedByAuthUserId: (await getCurrentUser())?.authUserId ?? null,
      ipAddress: clientIp(list),
      userAgent: list.get("user-agent")?.slice(0, MAX_USER_AGENT_LENGTH) ?? null,
    },
    select: { id: true },
  });

  logEvent("waiver_signed", {
    gymId: gym.id,
    climberId,
    version: template.version,
    relation: parsed.value.signerRelation,
    drawn: parsed.value.signatureImage !== null,
  });
  revalidatePath("/me");
  revalidatePath("/desk");
  revalidatePath(`/desk/climbers/${climberId}`);
  return { status: "success", waiverId: waiver.id };
}
